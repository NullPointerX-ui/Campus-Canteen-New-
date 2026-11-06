'use client';
import { useEffect, useState } from 'react';
import { api, rupees } from '@/lib/client';

function ItemCard({ item, onAdd, showScore }) {
  const out = !item.is_available || item.stock_qty <= 0;
  return (
    <div className="card stack">
      <div className="spread">
        <h3>{item.name}</h3>
        <span className={'badge ' + (item.is_veg ? 'veg' : 'nonveg')}>{item.is_veg ? 'Veg' : 'Non-veg'}</span>
      </div>
      <p className="muted" style={{ margin: 0 }}>{item.description}</p>
      <div className="spread">
        <span className="price">{rupees(item.price)}</span>
        <span className="muted">{item.category}{showScore && ` · match ${Math.round(item.similarity * 100)}%`}</span>
      </div>
      <button disabled={out} onClick={() => onAdd(item)}>{out ? 'Sold out' : 'Add to cart'}</button>
    </div>
  );
}

export default function Menu() {
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [veg, setVeg] = useState('');
  const [ai, setAi] = useState('');
  const [aiItems, setAiItems] = useState(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [recs, setRecs] = useState({ items: [] });
  const [cart, setCart] = useState({});
  const [method, setMethod] = useState('upi');
  const [msg, setMsg] = useState(null);

  const load = async () => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (cat) p.set('category', cat);
    if (veg) p.set('veg', veg);
    const d = await api('/api/items?' + p);
    setItems(d.items);
    setCats(d.categories);
  };

  useEffect(() => { load().catch((e) => setMsg({ err: e.message })); }, [cat, veg]); // eslint-disable-line
  useEffect(() => { api('/api/recommend').then(setRecs).catch(() => {}); }, []);

  const aiSearch = async (e) => {
    e.preventDefault();
    if (!ai.trim()) return;
    setAiBusy(true);
    try { setAiItems((await api('/api/search?q=' + encodeURIComponent(ai))).items); }
    catch (err) { setMsg({ err: err.message }); }
    setAiBusy(false);
  };

  const add = (item) => setCart((c) => ({ ...c, [item.item_id]: { item, qty: (c[item.item_id]?.qty || 0) + 1 } }));
  const change = (id, d) => setCart((c) => {
    const qty = (c[id]?.qty || 0) + d;
    const n = { ...c };
    if (qty <= 0) delete n[id]; else n[id] = { ...n[id], qty };
    return n;
  });
  const lines = Object.values(cart);
  const total = lines.reduce((s, l) => s + l.qty * Number(l.item.price), 0);

  const placeOrder = async () => {
    setMsg(null);
    try {
      const r = await api('/api/orders', {
        method: 'POST',
        body: { method, items: lines.map((l) => ({ item_id: l.item.item_id, quantity: l.qty })) },
      });
      setCart({});
      setMsg({ ok: `Order #${r.order_id} placed! Total ${rupees(r.total)}. Track it in My Orders.` });
      load();
    } catch (err) {
      setMsg({ err: err.message }); // e.g. stock trigger message -> whole transaction rolled back
    }
  };

  return (
    <div className="layout-cart">
      <div>
        <h1>Menu</h1>
        {msg && <div className={'msg ' + (msg.err ? 'err' : '')}>{msg.err || msg.ok}</div>}

        <form className="card ai stack" onSubmit={aiSearch}>
          <h3>✨ Ask the menu (AI semantic search)</h3>
          <p className="muted" style={{ margin: 0 }}>Describe a craving, e.g. “something cold and sweet” or “light breakfast under 40”.</p>
          <div className="row">
            <input style={{ flex: 1 }} value={ai} onChange={(e) => setAi(e.target.value)} placeholder="What do you feel like eating?" />
            <button disabled={aiBusy}>{aiBusy ? 'Thinking…' : 'Search'}</button>
            {aiItems && <button type="button" className="ghost" onClick={() => setAiItems(null)}>Clear</button>}
          </div>
        </form>

        {aiItems && (
          <>
            <h2>Best matches for “{ai}”</h2>
            <div className="grid">{aiItems.map((i) => <ItemCard key={i.item_id} item={i} onAdd={add} showScore />)}</div>
          </>
        )}

        {recs.items?.length > 0 && !aiItems && (
          <>
            <h2>Recommended for you</h2>
            <div className="grid">{recs.items.map((i) => <ItemCard key={i.item_id} item={i} onAdd={add} showScore />)}</div>
          </>
        )}

        <h2>All dishes</h2>
        <form className="row" onSubmit={(e) => { e.preventDefault(); load(); }} style={{ marginBottom: 14 }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Keyword search (e.g. paneer)" />
          <button className="ghost">Search</button>
          <select value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">All categories</option>
            {cats.map((c) => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
          </select>
          <select value={veg} onChange={(e) => setVeg(e.target.value)}>
            <option value="">Veg + Non-veg</option>
            <option value="true">Veg only</option>
            <option value="false">Non-veg only</option>
          </select>
        </form>
        <div className="grid">{items.map((i) => <ItemCard key={i.item_id} item={i} onAdd={add} />)}</div>
        {items.length === 0 && <p className="muted">No dishes match.</p>}
      </div>

      <div className="card cart stack">
        <h3>🛒 Your cart</h3>
        {lines.length === 0 && <p className="muted">Cart is empty.</p>}
        {lines.map(({ item, qty }) => (
          <div key={item.item_id} className="spread">
            <span style={{ fontSize: 14 }}>{item.name}</span>
            <span className="row" style={{ gap: 4 }}>
              <button className="ghost small" onClick={() => change(item.item_id, -1)}>−</button>
              {qty}
              <button className="ghost small" onClick={() => change(item.item_id, 1)}>+</button>
            </span>
          </div>
        ))}
        <div className="spread"><b>Total</b><b>{rupees(total)}</b></div>
        <select value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="upi">UPI</option>
          <option value="card">Card</option>
          <option value="cash">Cash at counter</option>
        </select>
        <button disabled={!lines.length} onClick={placeOrder}>Place order</button>
      </div>
    </div>
  );
}
