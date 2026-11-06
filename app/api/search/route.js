import { query } from '@/lib/db';
import { getUser } from '@/lib/auth';
import { embed, toVec } from '@/lib/embed';
import { json, fail } from '@/lib/http';

let trgmReady = false;

// GET /api/search?q=something cold and sweet
// HYBRID search:
//  1) meaning  -> pgvector cosine similarity (1 - (embedding <=> query))
//  2) spelling -> pg_trgm word_similarity, so typos like "choclate" still find "Chocolate Brownie"
// final score = meaning + typo score (typo score only counts when it is a strong match)
// Only dishes close to the best score are returned, so weak guesses are hidden.
export async function GET(req) {
  if (!(await getUser())) return fail('Please log in', 401);
  const q = new URL(req.url).searchParams.get('q')?.trim();
  if (!q) return fail('Type what you feel like eating');

  if (!trgmReady) {
    await query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
    trgmReady = true;
  }

  const vec = toVec(await embed(q));
  const { rows } = await query(
    `WITH scored AS (
       SELECT f.item_id, f.name, f.description, f.price, f.is_veg, f.is_available, f.stock_qty,
              c.name AS category,
              1 - (f.embedding <=> $1::vector) AS meaning,
              word_similarity(lower($2), lower(f.name || ' ' || coalesce(f.description, ''))) AS spelling
         FROM food_items f JOIN categories c USING (category_id)
        WHERE f.embedding IS NOT NULL
     ),
     ranked AS (
       SELECT *, meaning + CASE WHEN spelling >= 0.45 THEN spelling ELSE 0 END AS score
         FROM scored
     )
     SELECT item_id, name, description, price, is_veg, is_available, stock_qty, category,
            ROUND(LEAST(1, GREATEST(meaning, spelling))::numeric, 3) AS similarity
       FROM (SELECT *, MAX(score) OVER () AS best FROM ranked) r
      -- keep only real matches: close to the best result AND not too weak overall
      WHERE score >= best - 0.12
        AND (score = best OR meaning >= 0.30 OR spelling >= 0.45)
      ORDER BY score DESC
      LIMIT 6`,
    [vec, q]
  );
  return json({ items: rows });
}