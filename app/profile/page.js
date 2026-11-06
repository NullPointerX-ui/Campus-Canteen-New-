'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';

export default function Profile() {
  const [p, setP] = useState({ diet: 'any', spice: 'medium', favourites: '', notes: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api('/api/preferences').then(({ prefs }) =>
      setP({
        diet: prefs.diet || 'any',
        spice: prefs.spice || 'medium',
        favourites: (prefs.favourites || []).join(', '),
        notes: prefs.notes || '',
      })
    );
  }, []);

  const save = async (e) => {
    e.preventDefault();
    await api('/api/preferences', { method: 'PUT', body: p });
    setMsg('Saved! Your recommendations on the Menu page now use these preferences.');
  };
  const set = (k) => (e) => setP({ ...p, [k]: e.target.value });

  return (
    <form className="card stack" style={{ maxWidth: 520 }} onSubmit={save}>
      <h1>My food preferences</h1>
      <p className="muted">Stored in MongoDB and used for AI recommendations.</p>
      {msg && <div className="msg">{msg}</div>}
      <label>Diet<br />
        <select value={p.diet} onChange={set('diet')}>
          <option value="any">No restriction</option>
          <option value="veg">Vegetarian only</option>
        </select>
      </label>
      <label>Spice level<br />
        <select value={p.spice} onChange={set('spice')}>
          <option value="mild">Mild</option>
          <option value="medium">Medium</option>
          <option value="hot">Hot</option>
        </select>
      </label>
      <label>Favourite foods (comma separated)<br />
        <input style={{ width: '100%' }} value={p.favourites} onChange={set('favourites')} placeholder="dosa, noodles, cold coffee" />
      </label>
      <label>Anything else?<br />
        <textarea value={p.notes} onChange={set('notes')} placeholder="I like light food in the morning and something sweet after lunch" />
      </label>
      <button>Save preferences</button>
    </form>
  );
}
