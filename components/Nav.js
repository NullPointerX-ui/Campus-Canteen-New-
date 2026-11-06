'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Nav() {
  const path = usePathname();
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setUser(d.user)).catch(() => {});
  }, [path]);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <nav className="top">
      <div className="in">
        <Link href="/" className="logo">🍛 Campus Canteen</Link>
        {user && <Link href="/menu">Menu</Link>}
        {user && <Link href="/orders">My Orders</Link>}
        {user && <Link href="/profile">Preferences</Link>}
        {user && ['staff', 'admin'].includes(user.role) && <Link href="/staff">Staff Panel</Link>}
        {user?.role === 'admin' && <Link href="/admin">Admin</Link>}
        {user ? (
          <>
            <span className="who">{user.name} · {user.role}</span>
            <button className="ghost small" onClick={logout}>Log out</button>
          </>
        ) : (
          <>
            <Link href="/login">Log in</Link>
            <Link href="/register">Sign up</Link>
          </>
        )}
      </div>
    </nav>
  );
}
