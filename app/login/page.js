'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client';

const HOME = { student: '/menu', staff: '/staff', admin: '/admin' };

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { user } = await api('/api/auth/login', { method: 'POST', body: { email, password } });
      window.location.href = HOME[user.role] || '/menu';
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form className="card auth stack" onSubmit={submit}>
      <h1>Log in</h1>
      {error && <div className="msg err">{error}</div>}
      <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button type="submit">Log in</button>
      <p className="muted">No account? <Link href="/register">Sign up</Link></p>
      <p className="muted" style={{ fontSize: 12 }}>
        Demo: student@canteen.com / Student@123 · staff@canteen.com / Staff@123 · admin@canteen.com / Admin@123
      </p>
    </form>
  );
}
