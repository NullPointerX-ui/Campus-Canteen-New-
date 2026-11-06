import { query } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { embedItem } from '@/lib/embed';
import { json, fail, dbError } from '@/lib/http';

const EDITABLE = ['name', 'description', 'price', 'stock_qty', 'is_available', 'is_veg', 'category_id'];

// PATCH /api/items/5  { price: 60 }   or   { restock: 20 }  (calls stored procedure)
export async function PATCH(req, { params }) {
  if (!(await requireRole('staff', 'admin'))) return fail('Only staff can edit items', 403);
  const { id } = await params;
  const b = await req.json();
  try {
    if (b.restock !== undefined) {
      await query('CALL sp_restock($1, $2)', [Number(id), Number(b.restock)]);
      return json({ ok: true });
    }
    const keys = EDITABLE.filter((k) => b[k] !== undefined);
    if (!keys.length) return fail('Nothing to update');
    const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const { rowCount } = await query(
      `UPDATE food_items SET ${sets} WHERE item_id = $1`,
      [Number(id), ...keys.map((k) => b[k])]
    );
    if (!rowCount) return fail('Item not found', 404);
    if (b.name !== undefined || b.description !== undefined || b.is_veg !== undefined) {
      await embedItem(Number(id)); // meaning changed -> recompute vector
    }
    return json({ ok: true });
  } catch (e) {
    return dbError(e);
  }
}

// DELETE /api/items/5  -> if the dish was ever ordered, the FK blocks deletion,
// so we hide it instead (keeps order history consistent)
export async function DELETE(_req, { params }) {
  if (!(await requireRole('staff', 'admin'))) return fail('Only staff can delete items', 403);
  const { id } = await params;
  try {
    await query('DELETE FROM food_items WHERE item_id = $1', [Number(id)]);
    return json({ ok: true, message: 'Item deleted' });
  } catch (e) {
    if (e.code === '23503') {
      await query('UPDATE food_items SET is_available = FALSE WHERE item_id = $1', [Number(id)]);
      return json({ ok: true, message: 'Item has past orders, so it was marked unavailable instead of deleted' });
    }
    return dbError(e);
  }
}
