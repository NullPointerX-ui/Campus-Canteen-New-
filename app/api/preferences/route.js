import { mongo } from '@/lib/mongo';
import { getUser } from '@/lib/auth';
import { json, fail } from '@/lib/http';

// Student food preferences are flexible (different students store different things),
// so they live in MongoDB instead of a fixed SQL table.
export async function GET() {
  const u = await getUser();
  if (!u) return fail('Please log in', 401);
  const db = await mongo();
  const prefs = await db.collection('preferences').findOne({ userId: u.id }, { projection: { _id: 0 } });
  return json({ prefs: prefs || {} });
}

export async function PUT(req) {
  const u = await getUser();
  if (!u) return fail('Please log in', 401);
  const b = await req.json();
  const favourites = String(b.favourites || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  const db = await mongo();
  await db.collection('preferences').updateOne(
    { userId: u.id },
    {
      $set: {
        diet: b.diet || 'any',
        spice: b.spice || 'medium',
        favourites,
        notes: String(b.notes || '').slice(0, 300),
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
  return json({ ok: true });
}
