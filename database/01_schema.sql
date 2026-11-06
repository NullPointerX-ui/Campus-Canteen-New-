-- =====================================================================
-- Campus Canteen Management & Feedback System
-- File 1: SCHEMA (DDL)  -  PostgreSQL 15+ with pgvector extension
-- Demonstrates: DROP, CREATE, ALTER, PRIMARY KEY, FOREIGN KEY,
--               UNIQUE / CHECK / NOT NULL / DEFAULT constraints, INDEXES
-- =====================================================================

-- ---------- DROP (so the script can be re-run safely) ----------
DROP VIEW  IF EXISTS v_popular_items, v_daily_sales CASCADE;
DROP TABLE IF EXISTS feedback_vectors, order_status_log, payments,
                     order_items, orders, food_items, categories, users CASCADE;

-- ---------- Vector database extension (pgvector) ----------
CREATE EXTENSION IF NOT EXISTS vector;

-- ---------- USERS (students, staff, admins) ----------
CREATE TABLE users (
  user_id       SERIAL PRIMARY KEY,
  name          VARCHAR(80)  NOT NULL CHECK (length(trim(name)) >= 2),
  email         VARCHAR(120) NOT NULL UNIQUE
                CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  password_hash TEXT         NOT NULL,              -- bcrypt hash, never plain text
  role          VARCHAR(10)  NOT NULL DEFAULT 'student'
                CHECK (role IN ('student','staff','admin')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ---------- CATEGORIES ----------
CREATE TABLE categories (
  category_id SERIAL PRIMARY KEY,
  name        VARCHAR(40) NOT NULL UNIQUE
);

-- ---------- FOOD ITEMS ----------
CREATE TABLE food_items (
  item_id      SERIAL PRIMARY KEY,
  category_id  INT NOT NULL REFERENCES categories(category_id) ON DELETE RESTRICT,
  name         VARCHAR(80)  NOT NULL UNIQUE,
  description  TEXT,
  price        NUMERIC(8,2) NOT NULL CHECK (price > 0),
  stock_qty    INT          NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  is_available BOOLEAN      NOT NULL DEFAULT TRUE,
  is_veg       BOOLEAN      NOT NULL DEFAULT TRUE,
  -- Full-text search column, kept up to date automatically by PostgreSQL
  search_tsv   tsvector GENERATED ALWAYS AS
               (to_tsvector('english', name || ' ' || coalesce(description, ''))) STORED,
  -- 384-number "meaning" vector produced by the all-MiniLM-L6-v2 model
  embedding    vector(384),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- ORDERS ----------
CREATE TABLE orders (
  order_id     SERIAL PRIMARY KEY,
  user_id      INT NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  status       VARCHAR(12) NOT NULL DEFAULT 'placed'
               CHECK (status IN ('placed','preparing','ready','completed','cancelled')),
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- ORDER ITEMS (M:N between orders and food_items) ----------
CREATE TABLE order_items (
  order_id   INT REFERENCES orders(order_id)      ON DELETE CASCADE,
  item_id    INT REFERENCES food_items(item_id)   ON DELETE RESTRICT,
  quantity   INT          NOT NULL CHECK (quantity BETWEEN 1 AND 20),
  unit_price NUMERIC(8,2) NOT NULL CHECK (unit_price > 0),  -- price at time of order
  PRIMARY KEY (order_id, item_id)                            -- composite key
);

-- ---------- PAYMENTS (1:1 with orders) ----------
CREATE TABLE payments (
  payment_id SERIAL PRIMARY KEY,
  order_id   INT NOT NULL UNIQUE REFERENCES orders(order_id) ON DELETE CASCADE,
  method     VARCHAR(10)   NOT NULL CHECK (method IN ('cash','upi','card')),
  amount     NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  status     VARCHAR(10)   NOT NULL DEFAULT 'pending'
             CHECK (status IN ('pending','paid','refunded')),
  paid_at    TIMESTAMPTZ
);

-- ---------- ORDER STATUS LOG (filled automatically by a trigger) ----------
CREATE TABLE order_status_log (
  log_id     SERIAL PRIMARY KEY,
  order_id   INT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  old_status VARCHAR(12),
  new_status VARCHAR(12) NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- FEEDBACK VECTORS (vector index for MongoDB feedback comments) ----------
CREATE TABLE feedback_vectors (
  mongo_id  CHAR(24) PRIMARY KEY,       -- _id of the document in MongoDB "feedback"
  item_id   INT NOT NULL REFERENCES food_items(item_id) ON DELETE CASCADE,
  embedding vector(384) NOT NULL
);

-- ---------- ALTER examples ----------
ALTER TABLE users ADD COLUMN phone VARCHAR(15);
ALTER TABLE users ADD CONSTRAINT chk_phone CHECK (phone IS NULL OR phone ~ '^[0-9]{10}$');
ALTER TABLE food_items ALTER COLUMN stock_qty SET DEFAULT 50;

-- ---------- INDEXES ----------
CREATE INDEX idx_orders_user           ON orders(user_id);
CREATE INDEX idx_orders_status_created ON orders(status, created_at DESC);
CREATE INDEX idx_food_category         ON food_items(category_id);
CREATE INDEX idx_food_fts              ON food_items USING GIN (search_tsv);               -- full-text
CREATE INDEX idx_food_embedding        ON food_items USING hnsw (embedding vector_cosine_ops);   -- vector
CREATE INDEX idx_feedback_embedding    ON feedback_vectors USING hnsw (embedding vector_cosine_ops);
