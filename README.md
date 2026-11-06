# Campus-Canteen-New-

# 🍛 Campus Canteen Management & Feedback System

A web app that replaces manual canteen ordering in a college campus.
**DBMS Level 3 Mini Project** · PES University

| SRN | Name |
|---|---|
| PES2UG24CS226 | Khush Bhardwaj |
| PES2UG24CS208 | Joshwin Paul |

## What it solves
- **No long queues:** students order online and track status (placed → preparing → ready → completed)
- **No overselling:** stock reduces automatically; a dish is marked sold out at 0
- **Real feedback:** students rate dishes; the admin sees ratings, common complaints and sentiment
- **Sales insight:** dashboard with popular items, daily sales and revenue by category

## Roles
| Role | Can do |
|---|---|
| Student | Browse, search (keyword + AI), order, cancel, rate, set food preferences |
| Staff | Manage dishes, price and stock; update order status; search feedback by meaning |
| Admin | Analytics dashboard, manage users and roles |

## Tech stack
**Next.js 15** (frontend + API routes) · **PostgreSQL** (relational data) · **pgvector** (vector database) · **MongoDB** (feedback & preferences) · bcrypt + JWT (auth)

| Data | Database | Why |
|---|---|---|
| Users, dishes, orders, payments | PostgreSQL | Relationships and money → keys, constraints, transactions |
| Reviews, preferences | MongoDB | Flexible documents, aggregation analytics |
| Meaning vectors of dishes & reviews | pgvector | Search by meaning ("something cold and sweet") |

## Database features
- **Tables:** 8 tables with PK, FK, UNIQUE, CHECK and NOT NULL constraints
- **Transaction:** placing an order (BEGIN / COMMIT / ROLLBACK)
- **Triggers:** `t_reduce_stock` (reduces stock, blocks overselling) and `t_order_status` (logs status changes, restores stock on cancel, updates payment)
- **Function:** `fn_order_total()` calculates the bill
- **Procedure:** `sp_restock()` restocks a dish
- **Views:** `v_popular_items`, `v_daily_sales`
- **Indexes:** B-tree, GIN (full-text search), HNSW (vector search)
- **MongoDB:** schema validation, unique and text indexes, aggregation pipelines
- **Vector search:** all-MiniLM-L6-v2 embeddings (384-d), cosine similarity, hybrid with `pg_trgm` for typos

## Folder guide
| Folder | Contents |
|---|---|
| `database/` | `01_schema.sql` (tables, constraints, indexes) · `02_advanced.sql` (triggers, function, procedure, views) · `03_seed.sql` (sample data) · `04_queries.sql` (important queries) |
| `scripts/` | `setup.mjs`: one command to create everything + sample data + embeddings |
| `components/` | Shared UI components (navigation bar) |

## How to run
1. Install **Node.js 20+**, **PostgreSQL with pgvector**, and **MongoDB**
2. Copy `.env.example` to `.env.local` and fill in the database links
3. Run:
   ```bash
   npm install       # installs dependencies (node_modules is not committed, by design)
   npm run setup     # creates tables, triggers, views, sample data, embeddings
   npm run dev       # open http://localhost:3000
   ```

**Demo logins:** `student@canteen.com / Student@123` · `staff@canteen.com / Staff@123` · `admin@canteen.com / Admin@123`
