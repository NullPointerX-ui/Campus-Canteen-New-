import { query } from '@/lib/db';
import { getUser, requireRole } from '@/lib/auth';
import { embedItem } from '@/lib/embed';
import { json, fail, dbError } from '@/lib/http';

// GET /api/items?q=spicy&category=2&veg=true   -> menu with full-text search + filters
export async function GET(req) {
  if (!(await getUser())) return fail('Please log in', 401);
  const sp = new URL(req.url).searchParams;
  const q = sp.get('q')?.trim() || null;
  const category = sp.get('category') ? Number(sp.get('category')) : null;
  const veg = sp.get('veg') === 'true' ? true : sp.get('veg') === 'false' ? false : null;

  const items = await query(
    `SELECT f.item_id, f.name, f.description, f.price, f.stock_qty, f.is_available, f.is_veg,
            f.category_id, c.name AS category,
            CASE WHEN $1::text IS NULL THEN NULL
                 ELSE ts_rank(f.search_tsv, plainto_tsquery('english', $1)) END AS rank
       FROM food_items f
       JOIN categories c ON c.category_id = f.category_id
      WHERE ($1::text IS NULL OR f.search_tsv @@ plainto_tsquery('english', $1))
        AND ($2::int IS NULL OR f.category_id = $2)
        AND ($3::boolean IS NULL OR f.is_veg = $3)
      ORDER BY rank DESC NULLS LAST, c.name, f.name`,
    [q, category, veg]
  );
  const cats = await query('SELECT category_id, name FROM categories ORDER BY name');
  return json({ items: items.rows, categories: cats.rows });
}

// POST /api/items  (staff/admin) -> add a new dish and compute its embedding
export async function POST(req) {
  if (!(await requireRole('staff', 'admin'))) return fail('Only staff can add items', 403);
  const b = await req.json();
  try {
    const { rows } = await query(
      `INSERT INTO food_items(category_id, name, description, price, stock_qty, is_veg)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING item_id`,
      [b.category_id, b.name, b.description, b.price, b.stock_qty ?? 50, b.is_veg ?? true]
    );
    await embedItem(rows[0].item_id);
    return json({ item_id: rows[0].item_id }, 201);
  } catch (e) {
    return dbError(e);
  }
}
