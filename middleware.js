// Role-based access control for pages. Runs before every protected page loads.
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const rules = [
  ['/admin', ['admin']],
  ['/staff', ['staff', 'admin']],
  ['/menu', ['student', 'staff', 'admin']],
  ['/orders', ['student', 'staff', 'admin']],
  ['/profile', ['student', 'staff', 'admin']],
];

export async function middleware(req) {
  const path = req.nextUrl.pathname;
  const rule = rules.find(([p]) => path.startsWith(p));
  if (!rule) return NextResponse.next();

  let user = null;
  const token = req.cookies.get('token')?.value;
  if (token) {
    try {
      user = (await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET))).payload;
    } catch {}
  }
  if (!user) return NextResponse.redirect(new URL('/login', req.url));
  if (!rule[1].includes(user.role)) return NextResponse.redirect(new URL('/', req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/staff/:path*', '/menu/:path*', '/orders/:path*', '/profile/:path*'],
};
