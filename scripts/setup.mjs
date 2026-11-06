// One-time setup: creates all tables, triggers, views, sample data,
// AI embeddings (pgvector) and MongoDB collections.
// Run with:  npm run setup
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { MongoClient } from 'mongodb';
import { pipeline } from '@huggingface/transformers';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const step = (m) => console.log('\n➡️  ' + m);

for (const k of ['DATABASE_URL', 'MONGODB_URI', 'JWT_SECRET']) {
  if (!process.env[k]) {
    console.error(`❌ ${k} is missing. Create the .env.local file first (see GUIDE.md).`);
    process.exit(1);
  }
}

const sql = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
});
const mongoClient = new MongoClient(process.env.MONGODB_URI);

let extractor;
async function embed(text) {
  const out = await extractor(text, { pooling: 'mean', normalize: true });
  return `[${Array.from(out.data).join(',')}]`;
}

try {
  step('Connecting to PostgreSQL…');
  await sql.connect();
  console.log('   ✅ connected');

  for (const f of ['01_schema.sql', '02_advanced.sql', '03_seed.sql']) {
    step(`Running database/${f}`);
    await sql.query(fs.readFileSync(path.join(root, 'database', f), 'utf8'));
    console.log('   ✅ done');
  }

  step('Creating demo users (passwords are bcrypt-hashed)…');
  const users = [
    ['Canteen Admin', 'admin@canteen.com', 'Admin@123', 'admin'],
    ['Ramesh (Kitchen Staff)', 'staff@canteen.com', 'Staff@123', 'staff'],
    ['Khush Bhardwaj', 'student@canteen.com', 'Student@123', 'student'],
    ['Joshwin Paul', 'joshwin@canteen.com', 'Student@123', 'student'],
    ['Riya Sharma', 'riya@canteen.com', 'Student@123', 'student'],
  ];
  const uid = {};
  for (const [name, email, pass, role] of users) {
    const r = await sql.query(
      'INSERT INTO users(name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING user_id',
      [name, email, await bcrypt.hash(pass, 10), role]
    );
    uid[email] = r.rows[0].user_id;
  }
  console.log('   ✅ 5 users created');

  step('Loading the AI embedding model (first time downloads ~23 MB, please wait)…');
  extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  console.log('   ✅ model ready');

  step('Creating embeddings for every dish (pgvector)…');
  const items = await sql.query(
    `SELECT f.item_id, f.name, f.description, f.is_veg, c.name AS category
       FROM food_items f JOIN categories c USING (category_id)`
  );
  const iid = {};
  for (const i of items.rows) {
    iid[i.name] = i.item_id;
    const text = `${i.name}. ${i.description}. Category: ${i.category}. ${i.is_veg ? 'Vegetarian' : 'Non-vegetarian'}.`;
    await sql.query('UPDATE food_items SET embedding = $1 WHERE item_id = $2', [await embed(text), i.item_id]);
  }
  console.log(`   ✅ ${items.rows.length} dishes embedded`);

  step('Placing sample orders (uses the same transaction + triggers as the app)…');
  async function placeOrder(email, lines, method, finalStatus, daysAgo) {
    await sql.query('BEGIN');
    try {
      const o = await sql.query(
        `INSERT INTO orders(user_id, created_at) VALUES ($1, now() - ($2 || ' days')::interval) RETURNING order_id`,
        [uid[email], String(daysAgo)]
      );
      const id = o.rows[0].order_id;
      for (const [name, qty] of lines) {
        await sql.query(
          `INSERT INTO order_items(order_id, item_id, quantity, unit_price)
           SELECT $1, item_id, $2, price FROM food_items WHERE item_id = $3`,
          [id, qty, iid[name]]
        );
      }
      const t = await sql.query('UPDATE orders SET total_amount = fn_order_total($1) WHERE order_id = $1 RETURNING total_amount', [id]);
      await sql.query('INSERT INTO payments(order_id, method, amount, status) VALUES ($1, $2, $3, $4)', [
        id, method, t.rows[0].total_amount, method === 'cash' ? 'pending' : 'paid',
      ]);
      const flow = { placed: [], preparing: ['preparing'], ready: ['preparing', 'ready'],
        completed: ['preparing', 'ready', 'completed'], cancelled: ['cancelled'] }[finalStatus];
      for (const s of flow) await sql.query('UPDATE orders SET status = $1 WHERE order_id = $2', [s, id]);
      await sql.query('COMMIT');
      return id;
    } catch (e) {
      await sql.query('ROLLBACK');
      throw e;
    }
  }

  const S = 'student@canteen.com', J = 'joshwin@canteen.com', R = 'riya@canteen.com';
  const orders = [
    [S, [['Masala Dosa', 2], ['Filter Coffee', 2]], 'upi', 'completed', 6],
    [J, [['Chicken Biryani', 1], ['Fresh Lime Soda', 1]], 'cash', 'completed', 6],
    [R, [['South Indian Thali', 1]], 'card', 'completed', 5],
    [S, [['Pav Bhaji', 1], ['Masala Chai', 1]], 'upi', 'completed', 5],
    [J, [['Samosa', 4], ['Masala Chai', 2]], 'cash', 'completed', 4],
    [R, [['Veg Hakka Noodles', 1], ['Gobi Manchurian', 1]], 'upi', 'completed', 4],
    [S, [['Chicken Biryani', 1], ['Gulab Jamun', 1]], 'upi', 'completed', 3],
    [R, [['Idli Vada', 2], ['Filter Coffee', 1]], 'cash', 'completed', 3],
    [J, [['Paneer Butter Masala with Roti', 1], ['Cold Coffee', 1]], 'card', 'completed', 2],
    [S, [['Aloo Paratha', 2]], 'upi', 'completed', 2],
    [R, [['Chocolate Brownie', 2], ['Cold Coffee', 1]], 'upi', 'completed', 1],
    [J, [['Chicken Fried Rice', 1]], 'upi', 'cancelled', 1],
    [S, [['Masala Dosa', 1], ['Masala Chai', 1]], 'upi', 'preparing', 0],
    [R, [['Veg Puff', 2], ['Masala Chai', 2]], 'cash', 'placed', 0],
    [J, [['Egg Curry Rice', 1]], 'upi', 'ready', 0],
  ];
  const orderIds = [];
  for (const o of orders) orderIds.push(await placeOrder(...o));
  console.log(`   ✅ ${orders.length} orders placed`);

  step('Setting up MongoDB (feedback + preferences)…');
  await mongoClient.connect();
  const db = mongoClient.db(process.env.MONGODB_DB || 'canteen');
  for (const c of ['feedback', 'preferences']) {
    if (await db.listCollections({ name: c }).hasNext()) await db.collection(c).drop();
  }
  await db.createCollection('feedback', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['orderId', 'itemId', 'userId', 'rating', 'createdAt'],
        properties: {
          orderId: { bsonType: 'int' },
          itemId: { bsonType: 'int' },
          userId: { bsonType: 'int' },
          rating: { bsonType: 'int', minimum: 1, maximum: 5 },
          comment: { bsonType: 'string', maxLength: 500 },
          tags: { bsonType: 'array', items: { bsonType: 'string' } },
          sentiment: { enum: ['positive', 'neutral', 'negative'] },
          createdAt: { bsonType: 'date' },
        },
      },
    },
  });
  await db.createCollection('preferences', {
    validator: { $jsonSchema: { bsonType: 'object', required: ['userId'], properties: { userId: { bsonType: 'int' } } } },
  });
  await db.collection('feedback').createIndex({ orderId: 1, itemId: 1 }, { unique: true });
  await db.collection('feedback').createIndex({ itemId: 1, createdAt: -1 });
  await db.collection('feedback').createIndex({ comment: 'text' });
  await db.collection('preferences').createIndex({ userId: 1 }, { unique: true });

  await db.collection('preferences').insertMany([
    { userId: uid[S], diet: 'any', spice: 'hot', favourites: ['dosa', 'biryani'], notes: 'I love spicy South Indian food and strong coffee', updatedAt: new Date() },
    { userId: uid[R], diet: 'veg', spice: 'mild', favourites: ['noodles', 'brownie'], notes: 'Vegetarian, I like something sweet after lunch', updatedAt: new Date() },
  ]);

  const names = Object.fromEntries(users.map(([n, e]) => [e, n]));
  const reviews = [
    [0, 'Masala Dosa', 5, 'Crispy dosa and the chutney was amazing', ['tasty', 'fresh']],
    [0, 'Filter Coffee', 4, 'Strong coffee, just how I like it', ['tasty']],
    [1, 'Chicken Biryani', 2, 'Biryani was cold and too oily today', ['cold', 'oily']],
    [2, 'South Indian Thali', 5, 'Full meal, great value for the price', ['value-for-money', 'tasty']],
    [3, 'Pav Bhaji', 4, 'Spicy and buttery, buns were soft', ['spicy', 'tasty']],
    [4, 'Samosa', 3, 'Okay but the samosas were not hot anymore', ['cold']],
    [5, 'Veg Hakka Noodles', 4, 'Good noodles, portion could be bigger', ['tasty', 'small-portion']],
    [5, 'Gobi Manchurian', 2, 'Took too long to arrive, almost 25 minutes', ['late']],
    [6, 'Chicken Biryani', 5, 'Much better this time, hot and flavourful', ['tasty', 'fresh']],
    [7, 'Idli Vada', 3, 'Vada was a bit stale', []],
    [8, 'Paneer Butter Masala with Roti', 4, 'Creamy gravy but rotis were slightly hard', ['tasty']],
    [9, 'Aloo Paratha', 1, 'Paratha was served lukewarm and very oily', ['cold', 'oily']],
    [10, 'Chocolate Brownie', 5, 'Gooey and rich, best dessert here', ['tasty']],
  ];
  for (const [idx, item, rating, comment, tags] of reviews) {
    const [email] = orders[idx];
    const doc = {
      orderId: orderIds[idx], itemId: iid[item], itemName: item, userId: uid[email], userName: names[email],
      rating, comment, tags, sentiment: rating >= 4 ? 'positive' : rating === 3 ? 'neutral' : 'negative',
      createdAt: new Date(Date.now() - (orders[idx][4] * 86400000)),
    };
    const r = await db.collection('feedback').insertOne(doc);
    await sql.query('INSERT INTO feedback_vectors(mongo_id, item_id, embedding) VALUES ($1, $2, $3)', [
      r.insertedId.toString(), iid[item], await embed(`${item}: ${comment}`),
    ]);
  }
  console.log(`   ✅ ${reviews.length} reviews stored in MongoDB + their vectors in pgvector`);

  console.log(`
🎉 ALL DONE! Now run:   npm run dev
   then open            http://localhost:3000

   Logins:
   admin@canteen.com   / Admin@123
   staff@canteen.com   / Staff@123
   student@canteen.com / Student@123
`);
} catch (e) {
  console.error('\n❌ Setup failed:', e.message);
  console.error('   Check the values in .env.local and see the Troubleshooting part of GUIDE.md');
  process.exitCode = 1;
} finally {
  await sql.end().catch(() => {});
  await mongoClient.close().catch(() => {});
}
