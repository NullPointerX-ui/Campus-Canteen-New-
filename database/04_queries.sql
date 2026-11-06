-- =====================================================================
-- File 4: IMPORTANT QUERIES (DML) used by the application
-- You can run these in the Neon SQL Editor for screenshots in the report.
-- =====================================================================

-- ---------- INSERT ----------
INSERT INTO categories(name) VALUES ('Juices');

-- ---------- UPDATE ----------
UPDATE food_items SET price = 55 WHERE name = 'Masala Dosa';

-- ---------- DELETE ----------
DELETE FROM categories WHERE name = 'Juices';

-- ---------- SELECT with JOIN ----------
SELECT f.name, c.name AS category, f.price, f.stock_qty
FROM food_items f JOIN categories c ON c.category_id = f.category_id
ORDER BY c.name, f.price;

-- ---------- Multi-table JOIN + json aggregation (order history) ----------
SELECT o.order_id, u.name AS customer, o.status, o.total_amount, p.method,
       json_agg(json_build_object('item', f.name, 'qty', oi.quantity)) AS items
FROM orders o
JOIN users u        ON u.user_id = o.user_id
JOIN order_items oi ON oi.order_id = o.order_id
JOIN food_items f   ON f.item_id = oi.item_id
LEFT JOIN payments p ON p.order_id = o.order_id
GROUP BY o.order_id, u.name, p.method
ORDER BY o.created_at DESC;

-- ---------- GROUP BY + HAVING + aggregate (category revenue) ----------
SELECT c.name AS category, SUM(oi.quantity * oi.unit_price) AS revenue, COUNT(*) AS lines
FROM order_items oi
JOIN food_items f USING (item_id)
JOIN categories c USING (category_id)
JOIN orders o     USING (order_id)
WHERE o.status <> 'cancelled'
GROUP BY c.name
HAVING SUM(oi.quantity * oi.unit_price) > 0
ORDER BY revenue DESC;

-- ---------- Subquery (customers who spent more than the average order) ----------
SELECT u.name, COUNT(o.order_id) AS orders, SUM(o.total_amount) AS spent
FROM users u JOIN orders o USING (user_id)
WHERE o.status <> 'cancelled'
GROUP BY u.user_id, u.name
HAVING SUM(o.total_amount) > (SELECT AVG(total_amount) FROM orders WHERE status <> 'cancelled')
ORDER BY spent DESC;

-- ---------- Subquery with NOT EXISTS (items never ordered) ----------
SELECT name FROM food_items f
WHERE NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.item_id = f.item_id);

-- ---------- Using the VIEWS ----------
SELECT * FROM v_popular_items ORDER BY total_qty DESC LIMIT 5;
SELECT * FROM v_daily_sales ORDER BY sale_day DESC;

-- ---------- Using the FUNCTION and PROCEDURE ----------
SELECT order_id, fn_order_total(order_id) AS computed_total FROM orders;
CALL sp_restock(1, 20);

-- ---------- FULL-TEXT SEARCH ----------
SELECT name, ts_rank(search_tsv, plainto_tsquery('english','spicy potato')) AS rank
FROM food_items
WHERE search_tsv @@ plainto_tsquery('english','spicy potato')
ORDER BY rank DESC;

-- ---------- VECTOR SIMILARITY SEARCH (pgvector, cosine distance <=>) ----------
-- Find the 5 dishes most similar in meaning to "Masala Dosa"
SELECT b.name, ROUND((1 - (a.embedding <=> b.embedding))::numeric, 3) AS similarity
FROM food_items a, food_items b
WHERE a.name = 'Masala Dosa' AND b.item_id <> a.item_id
ORDER BY a.embedding <=> b.embedding
LIMIT 5;

-- ---------- TRANSACTION (what the app does when an order is placed) ----------
BEGIN;
  INSERT INTO orders(user_id) VALUES ((SELECT user_id FROM users WHERE email='student@canteen.com'));
  INSERT INTO order_items(order_id, item_id, quantity, unit_price)
  VALUES (currval('orders_order_id_seq')::int, 10, 2, 15);              -- trigger reduces stock
  UPDATE orders SET total_amount = fn_order_total(currval('orders_order_id_seq')::int)
   WHERE order_id = currval('orders_order_id_seq')::int;
  INSERT INTO payments(order_id, method, amount)
  VALUES (currval('orders_order_id_seq')::int, 'cash', fn_order_total(currval('orders_order_id_seq')::int));
COMMIT;   -- if anything fails, ROLLBACK undoes everything

-- ---------- TRIGGER demo ----------
UPDATE orders SET status = 'cancelled' WHERE order_id = currval('orders_order_id_seq')::int;
SELECT * FROM order_status_log ORDER BY changed_at DESC LIMIT 5;

-- ---------- CONSTRAINT demo (these SHOULD fail) ----------
-- INSERT INTO food_items(category_id, name, price) VALUES (1, 'Bad Item', -10);        -- CHECK price > 0
-- INSERT INTO users(name, email, password_hash) VALUES ('X', 'not-an-email', 'h');     -- CHECK email format
-- INSERT INTO order_items(order_id, item_id, quantity, unit_price) VALUES (1, 999, 1, 10); -- FOREIGN KEY
