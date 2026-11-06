-- =====================================================================
-- File 2: ADVANCED FEATURES
-- Function, Stored Procedure, Triggers, Views
-- (Transactions are used from the app: see app/api/orders/route.js)
-- =====================================================================

-- ---------- FUNCTION: total of an order ----------
CREATE OR REPLACE FUNCTION fn_order_total(p_order INT) RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(quantity * unit_price), 0)
  FROM order_items WHERE order_id = p_order;
$$ LANGUAGE sql STABLE;

-- ---------- STORED PROCEDURE: restock an item ----------
CREATE OR REPLACE PROCEDURE sp_restock(p_item INT, p_qty INT)
LANGUAGE plpgsql AS $$
BEGIN
  IF p_qty <= 0 THEN
    RAISE EXCEPTION 'Restock quantity must be positive';
  END IF;
  UPDATE food_items SET stock_qty = stock_qty + p_qty, is_available = TRUE
   WHERE item_id = p_item;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item % does not exist', p_item;
  END IF;
END $$;

-- ---------- TRIGGER 1: reduce stock when an item is ordered ----------
CREATE OR REPLACE FUNCTION trg_reduce_stock() RETURNS TRIGGER AS $$
DECLARE v_stock INT; v_name TEXT;
BEGIN
  SELECT stock_qty, name INTO v_stock, v_name
    FROM food_items WHERE item_id = NEW.item_id FOR UPDATE;   -- row lock
  IF v_stock < NEW.quantity THEN
    RAISE EXCEPTION 'Only % plate(s) of % left in stock', v_stock, v_name;
  END IF;
  UPDATE food_items
     SET stock_qty    = stock_qty - NEW.quantity,
         is_available = (stock_qty - NEW.quantity) > 0       -- auto mark sold-out
   WHERE item_id = NEW.item_id;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER t_reduce_stock
BEFORE INSERT ON order_items
FOR EACH ROW EXECUTE FUNCTION trg_reduce_stock();

-- ---------- TRIGGER 2: order status change ----------
-- logs every change, returns stock on cancel, marks payment paid on completion
CREATE OR REPLACE FUNCTION trg_order_status() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status IN ('completed','cancelled') THEN
      RAISE EXCEPTION 'Order % is already %', OLD.order_id, OLD.status;
    END IF;

    INSERT INTO order_status_log(order_id, old_status, new_status)
    VALUES (NEW.order_id, OLD.status, NEW.status);

    IF NEW.status = 'cancelled' THEN
      UPDATE food_items f
         SET stock_qty = f.stock_qty + oi.quantity, is_available = TRUE
        FROM order_items oi
       WHERE oi.order_id = NEW.order_id AND f.item_id = oi.item_id;
      UPDATE payments SET status = 'refunded'
       WHERE order_id = NEW.order_id AND status = 'paid';
    ELSIF NEW.status = 'completed' THEN
      UPDATE payments SET status = 'paid', paid_at = now()
       WHERE order_id = NEW.order_id AND status = 'pending';
    END IF;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER t_order_status
BEFORE UPDATE OF status ON orders
FOR EACH ROW EXECUTE FUNCTION trg_order_status();

-- ---------- VIEW 1: popular items ----------
CREATE OR REPLACE VIEW v_popular_items AS
SELECT f.item_id, f.name, c.name AS category,
       SUM(oi.quantity)                 AS total_qty,
       SUM(oi.quantity * oi.unit_price) AS revenue
FROM order_items oi
JOIN orders o     ON o.order_id = oi.order_id AND o.status <> 'cancelled'
JOIN food_items f ON f.item_id = oi.item_id
JOIN categories c ON c.category_id = f.category_id
GROUP BY f.item_id, f.name, c.name;

-- ---------- VIEW 2: daily sales ----------
CREATE OR REPLACE VIEW v_daily_sales AS
SELECT created_at::date   AS sale_day,
       COUNT(*)           AS orders,
       SUM(total_amount)  AS revenue
FROM orders
WHERE status <> 'cancelled'
GROUP BY created_at::date;
