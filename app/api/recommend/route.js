import { query } from '@/lib/db';
import { mongo } from '@/lib/mongo';
import { getUser } from '@/lib/auth';
import { embed, toVec } from '@/lib/embed';
import { json, fail } from '@/lib/http';

// Personalised recommendations:
// preferences (MongoDB) + past orders (SQL)  ->  one text  ->  embedding  ->  pgvector search
export async function GET() {
  const u = await getUser();
  if (!u) return fail('Please log in', 401);

  const db = await mongo();
  const prefs = (await db.collection('preferences').findOne({ userId: u.id })) || {};
  const past = await query(
    `SELECT DISTINCT f.name FROM orders o
       JOIN order_items oi USING (order_id) JOIN food_items f USING (item_id)
      WHERE o.user_id = $1 AND o.status <> 'cancelled' LIMIT 5`,
    [u.id]
  );

  const profile = [
    prefs.notes,
    (prefs.favourites || []).join(', '),
    prefs.spice ? `${prefs.spice} spicy` : '',
    prefs.diet === 'veg' ? 'vegetarian' : '',
    past.rows.map((r) => r.name).join(', '),
  ].filter(Boolean).join('. ');

  if (!profile) return json({ items: [], reason: 'Set your preferences or place an order to get recommendations' });

  const { rows } = await query(
    `SELECT f.item_id, f.name, f.description, f.price, f.is_veg, f.is_available, f.stock_qty,
            c.name AS category,
            ROUND((1 - (f.embedding <=> $1::vector))::numeric, 3) AS similarity
       FROM food_items f JOIN categories c USING (category_id)
      WHERE f.is_available AND f.embedding IS NOT NULL
        AND ($2::boolean IS FALSE OR f.is_veg)
      ORDER BY f.embedding <=> $1::vector
      LIMIT 4`,
    [toVec(await embed(profile)), prefs.diet === 'veg']
  );
  return json({ items: rows, reason: profile });
}
