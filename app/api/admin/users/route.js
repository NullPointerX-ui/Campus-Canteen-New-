import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { json, fail, dbError } from '@/lib/http';

// GET /api/admin/users  -> all users with how many orders they placed (LEFT JOIN + GROUP BY)
export async function GET() {
  if (!(await requireRole('admin'))) return fail('Admins only', 403);
  const { rows } = await query(
    `SELECT u.user_id, u.name, u.email, u.role, u.created_at, COUNT(o.order_id)::int AS orders
       FROM users u LEFT JOIN orders o USING (user_id)
      GROUP BY u.user_id
      ORDER BY u.user_id`
  );
  return json({ users: rows });
}

// POST /api/admin/users  { name, email, password, role }  -> admin creates staff/admin/student
export async function POST(req) {
  if (!(await requireRole('admin'))) return fail('Admins only', 403);
  const { name, email, password, role } = await req.json();
  if (!password || password.length < 6) return fail('Password must be at least 6 characters');
  try {
    await query(
      'INSERT INTO users(name, email, password_hash, role) VALUES ($1, lower($2), $3, $4)',
      [name, email, await bcrypt.hash(password, 10), role]
    );
    return json({ ok: true }, 201);
  } catch (e) {
    return dbError(e);
  }
}
