import { pool, query } from '@/lib/db';
import { getUser } from '@/lib/auth';
import { json, fail, dbError } from '@/lib/http';

// GET /api/orders  -> students see their own orders, staff/admin see all (optional ?status=)
export async function GET(req) {
  const u = await getUser();
  if (!u) return fail('Please log in', 401);
  const status = new URL(req.url).searchParams.get('status') || null;
  const onlyUser = u.role === 'student' ? u.id : null;

  const { rows } = await query(
    `SELECT o.order_id, o.status, o.total_amount, o.created_at,
            u.name AS customer, p.method, p.status AS payment_status,
            json_agg(json_build_object('item_id', f.item_id, 'name', f.name,
                     'qty', oi.quantity, 'price', oi.unit_price) ORDER BY f.name) AS items
       FROM orders o
       JOIN users u        ON u.user_id = o.user_id
       JOIN order_items oi ON oi.order_id = o.order_id
       JOIN food_items f   ON f.item_id = oi.item_id
       LEFT JOIN payments p ON p.order_id = o.order_id
      WHERE ($1::int IS NULL OR o.user_id = $1)
        AND ($2::text IS NULL OR o.status = $2)
      GROUP BY o.order_id, u.name, p.method, p.status
      ORDER BY o.created_at DESC
      LIMIT 100`,
    [onlyUser, status]
  );
  return json({ orders: rows });
}

// POST /api/orders  { items: [{item_id, quantity}], method: 'upi' }
// Everything happens inside ONE TRANSACTION: if any step fails, nothing is saved.
export async function POST(req) {
  const u = await getUser();
  if (!u) return fail('Please log in', 401);
  const { items, method = 'cash' } = await req.json();
  if (!Array.isArray(items) || items.length === 0) return fail('Your cart is empty');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const o = await client.query('INSERT INTO orders(user_id) VALUES ($1) RETURNING order_id', [u.id]);
    const orderId = o.rows[0].order_id;

    for (const it of items) {
      const f = await client.query(
        'SELECT name, price, is_available FROM food_items WHERE item_id = $1',
        [it.item_id]
      );
      if (!f.rows[0]) throw Object.assign(new Error('Item not found'), { code: 'P0001' });
      if (!f.rows[0].is_available)
        throw Object.assign(new Error(`${f.rows[0].name} is sold out right now`), { code: 'P0001' });
      // trigger t_reduce_stock checks & reduces stock here
      await client.query(
        'INSERT INTO order_items(order_id, item_id, quantity, unit_price) VALUES ($1, $2, $3, $4)',
        [orderId, it.item_id, Number(it.quantity), f.rows[0].price]
      );
    }

    const t = await client.query(
      'UPDATE orders SET total_amount = fn_order_total($1) WHERE order_id = $1 RETURNING total_amount',
      [orderId]
    );
    const paidNow = method !== 'cash'; // UPI/card are treated as paid immediately (simulated)
    await client.query(
      `INSERT INTO payments(order_id, method, amount, status, paid_at) VALUES ($1, $2, $3, $4, $5)`,
      [orderId, method, t.rows[0].total_amount, paidNow ? 'paid' : 'pending', paidNow ? new Date() : null]
    );

    await client.query('COMMIT');
    return json({ order_id: orderId, total: t.rows[0].total_amount }, 201);
  } catch (e) {
    await client.query('ROLLBACK');
    return dbError(e);
  } finally {
    client.release();
  }
}
