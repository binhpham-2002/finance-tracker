# 💰 Finance Tracker with AI Budget Advisor

A full-stack personal finance management application with ML-powered transaction categorization and AI-generated budget advice using Claude API.

## 🎯 Features

- **JWT Authentication** — secure register/login with bcrypt password hashing
- **Transaction Management** — full CRUD with filtering, pagination, and search
- **Budget Tracking** — set monthly budgets per category with automatic alerts when exceeding 80%
- **Auto-Categorization** — ML model (Naive Bayes + TF-IDF) automatically classifies transactions based on description and merchant
- **Spending Analytics** — K-means clustering to identify spending patterns
- **AI Budget Advisor** — personalized financial advice powered by Claude API based on real spending data
- **Real-time Dashboard** — React frontend with interactive charts (pie, bar) for spending visualization
- **Background Workers** — BullMQ-powered jobs for budget alerts and weekly reports
- **Redis Caching** — sub-second response times for frequently accessed data

## 🏗️ Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│  React Frontend │────────▶│  Node.js API    │────────▶│   PostgreSQL    │
│  (Vite + TS)    │  HTTP   │  (Express + TS) │ Prisma  │   (5 tables)    │
└─────────────────┘         └────────┬────────┘         └─────────────────┘
                                     │
                            ┌────────┴────────┐
                            │                 │
                            ▼                 ▼
                    ┌──────────────┐  ┌──────────────┐
                    │    Redis     │  │  ML Service  │
                    │ Cache + Queue│  │   (Python)   │
                    └──────────────┘  └──────┬───────┘
                                             │
                                      ┌──────▼───────┐
                                      │  Claude API  │
                                      │  (Anthropic) │
                                      └──────────────┘
```

## 🛠️ Tech Stack

**Backend (Node.js/TypeScript)**
- Express.js — REST API framework
- Prisma ORM — type-safe database queries
- PostgreSQL — relational database with 5 tables, indexes, and relations
- JWT (jsonwebtoken) — stateless authentication
- bcryptjs — password hashing
- Zod — runtime input validation
- Helmet — security headers
- ioredis — Redis client
- BullMQ — background job processing

**ML Service (Python)**
- FastAPI — modern async web framework
- Pandas — data manipulation
- Scikit-learn — K-means clustering, Naive Bayes classification, TF-IDF vectorization
- SQLAlchemy — database access
- Anthropic SDK — Claude API integration

**Frontend (React/TypeScript)**
- Vite — build tool
- Recharts — interactive charts
- Axios — HTTP client

**Infrastructure**
- Docker + Docker Compose — containerization
- GitHub Actions — CI/CD pipeline
- PostgreSQL 16 + Redis 7 (Alpine images)

## 📊 Database Schema

5 tables with proper relations and indexes:
- **users** — authentication and profile
- **accounts** — bank accounts (CHECKING, SAVINGS, CREDIT_CARD, etc.)
- **categories** — spending categories with icons and colors
- **transactions** — financial transactions with type (INCOME/EXPENSE/TRANSFER)
- **budgets** — monthly budget per category with unique constraint

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- Python 3.12+
- Docker and Docker Compose
- Anthropic API key (optional, fallback included)

### Setup

```bash
# Clone the repository
git clone https://github.com/binhpham-2002/finance-tracker.git
cd finance-tracker

# Start PostgreSQL and Redis
docker compose up db redis -d

# Setup API service
cd api
npm install
cp .env.example .env  # Edit with your values
npx prisma db push
npx tsx prisma/seed.ts
npm run dev

# Setup ML service (new terminal)
cd ml-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python src/main.py

# Setup frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` — Create new user account
- `POST /api/auth/login` — Login and receive JWT token

### Accounts
- `POST /api/accounts` — Create bank account
- `GET /api/accounts` — List user's accounts

### Transactions
- `POST /api/transactions` — Create transaction (auto-categorize if no category provided)
- `GET /api/transactions` — List with filters (page, limit, categoryId, type, startDate, endDate)
- `DELETE /api/transactions/:id` — Delete transaction
- `GET /api/transactions/summary` — Monthly spending summary
- `POST /api/transactions/report` — Trigger weekly report generation

### Budgets
- `POST /api/budgets` — Set monthly budget for category
- `GET /api/budgets` — List budgets

### ML Service
- `GET /api/ml/spending-patterns/:userId` — Spending breakdown by category
- `GET /api/ml/clusters/:userId` — K-means transaction clusters
- `POST /api/ml/categorize` — Auto-categorize a transaction
- `GET /api/ml/advice/:userId` — AI-generated budget advice

## 🧪 Example Usage

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123","firstName":"John","lastName":"Doe"}'

# Create transaction (auto-categorized)
curl -X POST http://localhost:3000/api/transactions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"accountId":"...","amount":15.50,"type":"EXPENSE","description":"Lunch","merchant":"Chipotle","date":"2026-04-11"}'

# Get AI advice
curl http://localhost:8000/api/ml/advice/USER_ID
```

## 🔧 Engineering Highlights

- **Clean Architecture** — clear separation of routes, controllers, services, and models
- **Type Safety** — TypeScript strict mode + Zod runtime validation + Prisma generated types
- **Security** — JWT auth, bcrypt hashing, rate limiting, Helmet security headers, input validation
- **Performance** — Redis caching with smart invalidation, database indexes on hot query paths
- **Resilience** — graceful fallbacks when ML/AI services unavailable, healthchecks in Docker Compose
- **Background Processing** — non-blocking budget alerts and report generation via BullMQ
- **CI/CD** — automated TypeScript checks on every push via GitHub Actions

## 📁 Project Structure

```
finance-tracker/
├── api/                    # Node.js backend
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Auth, rate limit, error handler
│   │   ├── services/       # Cache, workers
│   │   ├── models/         # Prisma client
│   │   ├── config/         # Env, Redis, queue config
│   │   └── utils/          # Validators
│   └── prisma/
│       ├── schema.prisma   # Database schema
│       └── seed.ts         # Default categories
├── ml-service/             # Python ML service
│   └── src/
│       ├── main.py         # FastAPI app
│       └── seed_training.py
├── frontend/               # React dashboard
│   └── src/
│       ├── App.tsx
│       └── App.css
├── .github/workflows/      # CI/CD pipeline
├── docker-compose.yml
└── README.md
```

## 👤 Author

**Binh Duc Pham**
- GitHub: [@binhpham-2002](https://github.com/binhpham-2002)
- Email: phamducbinh141@gmail.com

## 📄 License

MIT
