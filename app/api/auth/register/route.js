import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { setAuthCookie } from '@/lib/auth';
import { json, fail, dbError } from '@/lib/http';

// New sign-ups are always students. Staff/admins are created by an admin.
export async function POST(req) {
  const { name, email, password } = await req.json();
  if (!name || !email || !password) return fail('All fields are required');
  if (password.length < 6) return fail('Password must be at least 6 characters');
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await query(
      `INSERT INTO users(name, email, password_hash, role)
       VALUES ($1, lower($2), $3, 'student') RETURNING user_id, name, role`,
      [name.trim(), email.trim(), hash]
    );
    await setAuthCookie(rows[0]);
    return json({ user: rows[0] });
  } catch (e) {
    if (e.code === '23505') return fail('An account with this email already exists', 409);
    return dbError(e);
  }
}
