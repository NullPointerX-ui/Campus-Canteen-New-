import Link from 'next/link';

export default function Home() {
  return (
    <div className="hero">
      <h1>Campus Canteen Management &amp; Feedback System</h1>
      <p className="muted" style={{ maxWidth: 640, fontSize: 16 }}>
        Order food without standing in the queue, track your order live, and tell the canteen what you
        think. Staff manage the menu and kitchen queue; admins see sales and feedback analytics.
        Search the menu by meaning with AI-powered vector search.
      </p>
      <div className="row" style={{ marginTop: 20 }}>
        <Link href="/login"><button>Log in</button></Link>
        <Link href="/register"><button className="ghost">Create student account</button></Link>
      </div>
      <div className="grid" style={{ marginTop: 40 }}>
        <div className="card"><h3>🎓 Students</h3><p className="muted">Browse, search, order, track and rate food. Get recommendations based on your taste.</p></div>
        <div className="card"><h3>👩‍🍳 Staff</h3><p className="muted">Manage dishes, prices and stock. Move orders through the kitchen. Search complaints by meaning.</p></div>
        <div className="card"><h3>🛠️ Admin</h3><p className="muted">Sales dashboard, popular items, ratings analysis and user/role management.</p></div>
      </div>
    </div>
  );
}
