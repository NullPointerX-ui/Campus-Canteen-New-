import { ObjectId } from 'mongodb';
import { query } from '@/lib/db';
import { mongo } from '@/lib/mongo';
import { requireRole } from '@/lib/auth';
import { embed, toVec } from '@/lib/embed';
import { json, fail } from '@/lib/http';

// GET /api/feedback/search?q=food was cold
// 1) pgvector finds the closest feedback vectors  2) MongoDB returns the full documents
export async function GET(req) {
  if (!(await requireRole('staff', 'admin'))) return fail('Only staff can search feedback', 403);
  const q = new URL(req.url).searchParams.get('q')?.trim();
  if (!q) return fail('Type a complaint or topic to search');

  const { rows } = await query(
    `SELECT mongo_id, ROUND((1 - (embedding <=> $1::vector))::numeric, 3) AS similarity
       FROM feedback_vectors
      ORDER BY embedding <=> $1::vector
      LIMIT 6`,
    [toVec(await embed(q))]
  );
  const db = await mongo();
  const docs = await db
    .collection('feedback')
    .find({ _id: { $in: rows.map((r) => new ObjectId(r.mongo_id.trim())) } })
    .toArray();
  const byId = Object.fromEntries(docs.map((d) => [d._id.toString(), d]));
  const results = rows
    .map((r) => ({ ...byId[r.mongo_id.trim()], similarity: r.similarity }))
    .filter((r) => r._id);
  return json({ results });
}
