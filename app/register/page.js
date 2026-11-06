'use client';
import { useState } from 'react';
import { api } from '@/lib/client';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api('/api/auth/register', { method: 'POST', body: form });
      window.location.href = '/menu';
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form className="card auth stack" onSubmit={submit}>
      <h1>Create student account</h1>
      {error && <div className="msg err">{error}</div>}
      <input placeholder="Full name" value={form.name} onChange={set('name')} />
      <input placeholder="College email" value={form.email} onChange={set('email')} />
      <input placeholder="Password (min 6 characters)" type="password" value={form.password} onChange={set('password')} />
      <button type="submit">Sign up</button>
    </form>
  );
}
