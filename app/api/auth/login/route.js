import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { setAuthCookie } from '@/lib/auth';
import { json, fail } from '@/lib/http';

export async function POST(req) {
  const { email, password } = await req.json();
  if (!email || !password) return fail('Email and password are required');
  const { rows } = await query(
    'SELECT user_id, name, role, password_hash FROM users WHERE email = lower($1)',
    [email.trim()]
  );
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return fail('Wrong email or password', 401);
  }
  await setAuthCookie(user);
  return json({ user: { user_id: user.user_id, name: user.name, role: user.role } });
}
