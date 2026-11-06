'use client';
import { useEffect, useState } from 'react';
import { api, rupees } from '@/lib/client';

function Bars({ rows, label, value, fmt = (v) => v }) {
  const max = Math.max(1, ...rows.map((r) => Number(r[value])));
  return (
    <div className="stack">
      {rows.map((r, i) => (
        <div key={i} className="row" style={{ flexWrap: 'nowrap' }}>
          <span style={{ width: 140, fontSize: 14 }}>{r[label]}</span>
          <div className="bar-wrap"><div className="bar" style={{ width: `${(Number(r[value]) / max) * 100}%` }} /></div>
          <span style={{ width: 70, textAlign: 'right', fontSize: 14 }}>{fmt(r[value])}</span>
        </div>
      ))}
      {rows.length === 0 && <p className="muted">No data yet.</p>}
    </div>
  );
}

function Users() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff' });
  const [msg, setMsg] = useState(null);
  const load = () => api('/api/admin/users').then((d) => setUsers(d.users));
  useEffect(() => { load(); }, []);
  const run = async (fn, ok) => { try { await fn(); setMsg({ ok }); load(); } catch (e) { setMsg({ err: e.message }); } };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <h2>Users &amp; roles</h2>
      {msg && <div className={'msg ' + (msg.err ? 'err' : '')}>{msg.err || msg.ok}</div>}
      <form className="card row" style={{ marginBottom: 12 }}
        onSubmit={(e) => { e.preventDefault(); run(() => api('/api/admin/users', { method: 'POST', body: form }), 'User created'); }}>
        <input placeholder="Name" value={form.name} onChange={set('name')} />
        <input placeholder="Email" value={form.email} onChange={set('email')} />
        <input placeholder="Password" type="password" value={form.password} onChange={set('password')} />
        <select value={form.role} onChange={set('role')}>
          <option value="staff">staff</option><option value="admin">admin</option><option value="student">student</option>
        </select>
        <button>Add user</button>
      </form>
      <table>
        <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Orders</th><th>Role</th><th></th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.user_id}>
              <td>{u.user_id}</td><td>{u.name}</td><td>{u.email}</td><td>{u.orders}</td>
              <td>
                <select value={u.role} onChange={(e) => run(() => api(`/api/admin/users/${u.user_id}`, { method: 'PATCH', body: { role: e.target.value } }), 'Role changed')}>
                  <option>student</option><option>staff</option><option>admin</option>
                </select>
              </td>
              <td><button className="danger small" onClick={() => confirm('Delete user?') && run(() => api(`/api/admin/users/${u.user_id}`, { method: 'DELETE' }), 'User deleted')}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export default function Admin() {
  const [s, setS] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api('/api/admin/stats').then(setS).catch((e) => setErr(e.message)); }, []);
  if (err) return <div className="msg err">{err}</div>;
  if (!s) return <p className="muted">Loading dashboard…</p>;

  const sentiment = Object.fromEntries(s.sentiment.map((x) => [x._id, x.count]));
  return (
    <div>
      <h1>Admin dashboard</h1>
      <div className="grid">
        <div className="card"><div className="muted">Total orders</div><div className="stat">{s.summary.total_orders}</div></div>
        <div className="card"><div className="muted">Active right now</div><div className="stat">{s.summary.active_orders}</div></div>
        <div className="card"><div className="muted">Revenue today</div><div className="stat">{rupees(s.summary.revenue_today)}</div></div>
        <div className="card"><div className="muted">Total revenue</div><div className="stat">{rupees(s.summary.revenue_total)}</div></div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', marginTop: 14 }}>
        <div className="card"><h3>Most popular items (view)</h3><Bars rows={s.popular} label="name" value="total_qty" /></div>
        <div className="card"><h3>Sales last 7 days (view)</h3>
          <Bars rows={s.daily.map((d) => ({ ...d, day: new Date(d.sale_day).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }) }))} label="day" value="revenue" fmt={rupees} />
        </div>
        <div className="card"><h3>Revenue by category (GROUP BY / HAVING)</h3><Bars rows={s.catRevenue} label="category" value="revenue" fmt={rupees} /></div>
        <div className="card"><h3>Average rating per item (MongoDB)</h3>
          <Bars rows={s.ratings.map((r) => ({ ...r, avg: r.avgRating.toFixed(1) }))} label="itemName" value="avg" fmt={(v) => `${v} ★`} />
        </div>
        <div className="card"><h3>Top feedback tags (MongoDB $unwind)</h3><Bars rows={s.tags} label="_id" value="count" /></div>
        <div className="card stack"><h3>Sentiment</h3>
          <div>😊 Positive: <b>{sentiment.positive || 0}</b></div>
          <div>😐 Neutral: <b>{sentiment.neutral || 0}</b></div>
          <div>☹️ Negative: <b>{sentiment.negative || 0}</b></div>
          <h3 style={{ marginTop: 14 }}>Top customers (subquery)</h3>
          {s.topCustomers.map((c) => <div key={c.name} className="spread"><span>{c.name}</span><span>{c.orders} orders · {rupees(c.spent)}</span></div>)}
          <h3 style={{ marginTop: 14 }}>Low stock (&lt; 10)</h3>
          {s.lowStock.length === 0 ? <p className="muted">All good.</p> : s.lowStock.map((i) => <div key={i.item_id}>{i.name}: {i.stock_qty}</div>)}
        </div>
      </div>

      <Users />
    </div>
  );
}
