import { query } from '@/lib/db';
import { mongo } from '@/lib/mongo';
import { requireRole } from '@/lib/auth';
import { json, fail } from '@/lib/http';

// Dashboard numbers: SQL (views, GROUP BY/HAVING, subquery) + MongoDB aggregation pipelines
export async function GET() {
  if (!(await requireRole('staff', 'admin'))) return fail('Not allowed', 403);

  const [summary, popular, daily, catRevenue, topCustomers, lowStock] = await Promise.all([
    query(`SELECT COUNT(*)::int AS total_orders,
                  COALESCE(SUM(total_amount) FILTER (WHERE created_at::date = CURRENT_DATE), 0) AS revenue_today,
                  COALESCE(SUM(total_amount), 0) AS revenue_total,
                  COUNT(*) FILTER (WHERE status IN ('placed','preparing','ready'))::int AS active_orders
             FROM orders WHERE status <> 'cancelled'`),
    query('SELECT * FROM v_popular_items ORDER BY total_qty DESC LIMIT 5'),
    query('SELECT * FROM v_daily_sales WHERE sale_day >= CURRENT_DATE - 6 ORDER BY sale_day'),
    query(`SELECT c.name AS category, SUM(oi.quantity * oi.unit_price) AS revenue
             FROM order_items oi
             JOIN food_items f USING (item_id)
             JOIN categories c USING (category_id)
             JOIN orders o     USING (order_id)
            WHERE o.status <> 'cancelled'
            GROUP BY c.name
           HAVING SUM(oi.quantity * oi.unit_price) > 0
            ORDER BY revenue DESC`),
    query(`SELECT u.name, COUNT(o.order_id)::int AS orders, SUM(o.total_amount) AS spent
             FROM users u JOIN orders o USING (user_id)
            WHERE o.status <> 'cancelled'
            GROUP BY u.user_id, u.name
           HAVING SUM(o.total_amount) > (SELECT AVG(total_amount) FROM orders WHERE status <> 'cancelled')
            ORDER BY spent DESC LIMIT 5`),
    query('SELECT item_id, name, stock_qty FROM food_items WHERE stock_qty < 10 ORDER BY stock_qty'),
  ]);

  const fb = (await mongo()).collection('feedback');
  const [ratings, tags, sentiment] = await Promise.all([
    fb.aggregate([
      { $group: { _id: '$itemId', itemName: { $first: '$itemName' }, avgRating: { $avg: '$rating' }, reviews: { $sum: 1 } } },
      { $sort: { avgRating: -1, reviews: -1 } },
    ]).toArray(),
    fb.aggregate([
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]).toArray(),
    fb.aggregate([{ $group: { _id: '$sentiment', count: { $sum: 1 } } }]).toArray(),
  ]);

  return json({
    summary: summary.rows[0],
    popular: popular.rows,
    daily: daily.rows,
    catRevenue: catRevenue.rows,
    topCustomers: topCustomers.rows,
    lowStock: lowStock.rows,
    ratings,
    tags,
    sentiment,
  });
}
