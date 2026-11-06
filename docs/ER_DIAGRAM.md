# ER Diagram



1. Open https://dbdiagram.io/d in your browser and execute this code.


```
Table users {
  user_id serial [pk]
  name varchar(80) [not null]
  email varchar(120) [not null, unique]
  password_hash text [not null]
  role varchar(10) [not null, note: 'student | staff | admin']
  phone varchar(15)
  created_at timestamptz
}

Table categories {
  category_id serial [pk]
  name varchar(40) [not null, unique]
}

Table food_items {
  item_id serial [pk]
  category_id int [not null, ref: > categories.category_id]
  name varchar(80) [not null, unique]
  description text
  price numeric(8,2) [not null, note: 'CHECK > 0']
  stock_qty int [not null, note: 'CHECK >= 0']
  is_available boolean
  is_veg boolean
  search_tsv tsvector [note: 'full-text search']
  embedding vector(384) [note: 'pgvector']
  created_at timestamptz
}

Table orders {
  order_id serial [pk]
  user_id int [not null, ref: > users.user_id]
  status varchar(12) [note: 'placed|preparing|ready|completed|cancelled']
  total_amount numeric(10,2)
  created_at timestamptz
}

Table order_items {
  order_id int [pk, ref: > orders.order_id]
  item_id int [pk, ref: > food_items.item_id]
  quantity int [note: 'CHECK 1..20']
  unit_price numeric(8,2)
}

Table payments {
  payment_id serial [pk]
  order_id int [not null, unique, ref: - orders.order_id]
  method varchar(10) [note: 'cash|upi|card']
  amount numeric(10,2)
  status varchar(10) [note: 'pending|paid|refunded']
  paid_at timestamptz
}

Table order_status_log {
  log_id serial [pk]
  order_id int [ref: > orders.order_id]
  old_status varchar(12)
  new_status varchar(12)
  changed_at timestamptz
}

Table feedback_vectors {
  mongo_id char(24) [pk, note: '_id of MongoDB feedback document']
  item_id int [ref: > food_items.item_id]
  embedding vector(384)
}
```

## Relationships in plain words

| Relationship | Type | Meaning |
|---|---|---|
| users → orders | 1 : N | One student can place many orders |
| categories → food_items | 1 : N | One category has many dishes |
| orders ↔ food_items (via order_items) | M : N | An order has many dishes; a dish appears in many orders |
| orders → payments | 1 : 1 | Every order has exactly one payment |
| orders → order_status_log | 1 : N | Every status change of an order is recorded |
| food_items → feedback_vectors | 1 : N | A dish has many review vectors |
| feedback_vectors ↔ MongoDB feedback | 1 : 1 | Linked by mongo_id |
