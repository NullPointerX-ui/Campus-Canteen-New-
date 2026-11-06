import { query } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { json, fail, dbError } from '@/lib/http';

export async function PATCH(req, { params }) {
  const me = await requireRole('admin');
  if (!me) return fail('Admins only', 403);
  const { id } = await params;
  const { role } = await req.json();
  if (Number(id) === me.id) return fail('You cannot change your own role');
  try {
    await query('UPDATE users SET role = $1 WHERE user_id = $2', [role, Number(id)]);
    return json({ ok: true });
  } catch (e) {
    return dbError(e);
  }
}

export async function DELETE(_req, { params }) {
  const me = await requireRole('admin');
  if (!me) return fail('Admins only', 403);
  const { id } = await params;
  if (Number(id) === me.id) return fail('You cannot delete yourself');
  try {
    await query('DELETE FROM users WHERE user_id = $1', [Number(id)]);
    return json({ ok: true });
  } catch (e) {
    if (e.code === '23503') return fail('This user has orders, so they cannot be deleted (keeps sales history correct)', 409);
    return dbError(e);
  }
}
