import { query } from '@/lib/db';
import { getUser } from '@/lib/auth';
import { json, fail, dbError } from '@/lib/http';

const STATUSES = ['placed', 'preparing', 'ready', 'completed', 'cancelled'];

// PATCH /api/orders/12 { status: 'preparing' }
// Staff/admin can move any order forward. Students can only cancel their own 'placed' order.
// The trigger t_order_status logs the change, returns stock on cancel, marks payment paid on completion.
export async function PATCH(req, { params }) {
  const u = await getUser();
  if (!u) return fail('Please log in', 401);
  const { id } = await params;
  const { status } = await req.json();
  if (!STATUSES.includes(status)) return fail('Invalid status');

  try {
    if (u.role === 'student') {
      if (status !== 'cancelled') return fail('Students can only cancel orders', 403);
      const r = await query(
        `UPDATE orders SET status = 'cancelled'
          WHERE order_id = $1 AND user_id = $2 AND status = 'placed'`,
        [Number(id), u.id]
      );
      if (!r.rowCount) return fail('You can only cancel your own order before the kitchen starts preparing it');
      return json({ ok: true });
    }
    const r = await query('UPDATE orders SET status = $1 WHERE order_id = $2', [status, Number(id)]);
    if (!r.rowCount) return fail('Order not found', 404);
    return json({ ok: true });
  } catch (e) {
    return dbError(e);
  }
}
