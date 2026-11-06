// Login tokens (JWT) stored in a secure httpOnly cookie.
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET);

export async function setAuthCookie(user) {
  const token = await new SignJWT({ id: user.user_id, name: user.name, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret());
  (await cookies()).set('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getUser() {
  const token = (await cookies()).get('token')?.value;
  if (!token) return null;
  try {
    return (await jwtVerify(token, secret())).payload;
  } catch {
    return null;
  }
}

// Returns the user if they have one of the allowed roles, otherwise null
export async function requireRole(...roles) {
  const u = await getUser();
  if (!u) return null;
  if (roles.length && !roles.includes(u.role)) return null;
  return u;
}
