import { query } from '@/lib/db';
import { mongo } from '@/lib/mongo';
import { getUser } from '@/lib/auth';
import { embed, toVec } from '@/lib/embed';
import { json, fail } from '@/lib/http';

const sentimentOf = (r) => (r >= 4 ? 'positive' : r === 3 ? 'neutral' : 'negative');

// GET /api/feedback  -> students: their own reviews; staff/admin: latest 50 reviews
export async function GET() {
  const u = await getUser();
  if (!u) return fail('Please log in', 401);
  const db = await mongo();
  const filter = u.role === 'student' ? { userId: u.id } : {};
  const docs = await db.collection('feedback').find(filter).sort({ createdAt: -1 }).limit(50).toArray();
  return json({ feedback: docs });
}

// POST /api/feedback { order_id, item_id, rating, comment, tags }
export async function POST(req) {
  const u = await getUser();
  if (!u) return fail('Please log in', 401);
  const { order_id, item_id, rating, comment = '', tags = [] } = await req.json();
  const r = Number(rating);
  if (!Number.isInteger(r) || r < 1 || r > 5) return fail('Rating must be 1 to 5 stars');

  // SQL check: did this student really get this item in a completed order?
  const chk = await query(
    `SELECT f.name FROM orders o
       JOIN order_items oi USING (order_id) JOIN food_items f USING (item_id)
      WHERE o.order_id = $1 AND oi.item_id = $2 AND o.user_id = $3 AND o.status = 'completed'`,
    [Number(order_id), Number(item_id), u.id]
  );
  if (!chk.rows[0]) return fail('You can only review items from your own completed orders', 403);

  const db = await mongo();
  const doc = {
    orderId: Number(order_id),
    itemId: Number(item_id),
    itemName: chk.rows[0].name,
    userId: u.id,
    userName: u.name,
    rating: r,
    comment: String(comment).slice(0, 500),
    tags: Array.isArray(tags) ? tags.map(String) : [],
    sentiment: sentimentOf(r),
    createdAt: new Date(),
  };
  try {
    const res = await db.collection('feedback').insertOne(doc);
    // store the comment's meaning vector in pgvector, linked by the Mongo _id
    if (doc.comment.trim()) {
      const v = await embed(`${doc.itemName}: ${doc.comment}`);
      await query('INSERT INTO feedback_vectors(mongo_id, item_id, embedding) VALUES ($1, $2, $3)', [
        res.insertedId.toString(), doc.itemId, toVec(v),
      ]);
    }
    return json({ ok: true }, 201);
  } catch (e) {
    if (e.code === 11000) return fail('You already reviewed this item for this order', 409);
    return fail('Could not save feedback: ' + e.message, 500);
  }
}
