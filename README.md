# 💰 AI-Powered Finance Tracker & Budget Advisor

A production-ready full-stack financial management system that leverages machine learning, LLMs (Claude API), and an autonomous AI agent to automate expense categorization, deliver personalized financial insights, and take action on your behalf.

---

## 🚀 Key Highlights

- 🤖 **Autonomous AI Agent** — Analyzes spending, sets budgets, and creates savings plans using Claude tool-use
- 🧠 **Intelligent Expense Categorization** — ML-based classification (Naive Bayes + TF-IDF) with automatic tagging
- 💬 **AI-Powered Financial Advisor** — Generates personalized spending insights and recommendations using Claude API
- 🔐 **Secure Authentication System** — JWT-based auth with bcrypt password hashing and rate limiting
- 📊 **Advanced Analytics Dashboard** — Real-time visualizations with clustering-based insights (K-means)
- ⚡ **High Performance Architecture** — Redis caching + background job processing (BullMQ)
- 🧩 **Microservice Design** — Separate ML service (FastAPI) integrated with Node.js backend
- 🐳 **Production-Ready Setup** — Dockerized services with CI/CD pipeline

---

## 🤖 AI Agent (Tool-Use)

The standout feature of this project. Unlike simple chatbots that only answer questions, the AI Agent **autonomously takes actions** to achieve financial goals.

**How it works:**

```
User: "Help me save $500 this month"

Agent autonomously executes:
  Step 1 → Calls get_spending_summary() to analyze current finances
  Step 2 → Calls get_spending_patterns() to identify top spending categories  
  Step 3 → Calls get_categories() to get category IDs
  Step 4 → Calls get_transactions() to review recent spending details
  Step 5 → Decides on budget allocation based on analysis
  Step 6 → Calls set_budget() x5 to create budgets for each category
  Step 7 → Returns a complete savings plan with action items
```

The agent has access to 5 tools (API endpoints) and decides which to call, in what order, based on the user's goal. No hardcoded logic — Claude reasons through each step.

---

## 🧠 AI & Machine Learning Features

### 💬 AI Budget Advisor (Claude API)
- Analyzes user transaction history and income
- Detects overspending patterns
- Provides actionable financial recommendations
- Designed with prompt engineering for consistent and relevant outputs
- Graceful fallback when API is unavailable

### 🧠 ML-Based Categorization
- Naive Bayes + TF-IDF for transaction classification
- Handles unseen inputs with probabilistic inference
- Reduces manual categorization effort
- Confidence threshold system: auto-assigns above 0.1, prompts user below

### 📊 Spending Pattern Analysis
- K-means clustering to identify user spending behavior groups
- Feature standardization for balanced clustering
- Enables deeper financial insights beyond basic tracking

---

## 🏗️ System Architecture

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
                    │ Cache + Queue│  │  (FastAPI)   │
                    └──────────────┘  └──────┬───────┘
                                             │
                                    ┌────────┴────────┐
                                    │                 │
                                    ▼                 ▼
                            ┌──────────────┐  ┌──────────────┐
                            │  Claude API  │  │  Scikit-learn │
                            │  (Anthropic) │  │  ML Models   │
                            └──────────────┘  └──────────────┘
```

**Request Flow:**
1. React frontend sends request
2. Express middleware chain: Helmet → CORS → Rate Limit → JWT Auth
3. Controller validates input with Zod
4. Check Redis cache (if hit, skip database)
5. Query PostgreSQL via Prisma ORM
6. For new transactions: call ML service for auto-categorization
7. Cache result in Redis, queue background jobs (budget alerts)
8. Return JSON response

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| Node.js + TypeScript | API server with type safety |
| Express.js | REST API framework |
| Prisma ORM | Type-safe database queries |
| PostgreSQL | Relational database (5 tables, indexes, relations) |
| Redis + ioredis | Caching with smart invalidation |
| BullMQ | Background job processing (budget alerts, weekly reports) |
| JWT + bcrypt | Stateless authentication with password hashing |
| Zod | Runtime input validation |
| Helmet | Security headers |

### ML Service
| Technology | Purpose |
|---|---|
| FastAPI | Async Python web framework |
| Scikit-learn | K-means clustering, Naive Bayes classification |
| Pandas | Data manipulation and analysis |
| TF-IDF Vectorizer | Text-to-feature conversion for ML |
| Claude API (Anthropic) | LLM for budget advice and AI agent |

### Frontend
| Technology | Purpose |
|---|---|
| React 19 + TypeScript | UI with type safety |
| Vite | Fast build tool |
| Recharts | Interactive pie charts and bar charts |

### DevOps
| Technology | Purpose |
|---|---|
| Docker + Docker Compose | Containerization (3 services) |
| GitHub Actions | CI/CD pipeline with TypeScript checks |
| Neon | Cloud PostgreSQL |

---

## 📊 Database Schema

5 tables with proper relations, indexes, and constraints:

| Table | Purpose | Key Features |
|---|---|---|
| `users` | Authentication & profile | UUID primary key, unique email |
| `accounts` | Bank accounts | Types: CHECKING, SAVINGS, CREDIT_CARD, INVESTMENT |
| `categories` | Spending categories | 11 default categories with icons and colors |
| `transactions` | Financial transactions | Compound indexes on (userId, date) and (userId, categoryId) |
| `budgets` | Monthly budgets | Unique constraint on (userId, categoryId, month, year) |

---

## ⚙️ Engineering Highlights

- **Scalable microservices architecture** separating API and ML workloads for independent scaling
- **AI Agent with tool-use** — Claude autonomously calls API endpoints to achieve user goals
- **Smart cache invalidation** — write-invalidate strategy with TTL fallback
- **Credit card logic** — correct balance handling (expense increases debt, income decreases debt)
- **Robust error handling and fallback** — ML and AI services degrade gracefully
- **Type safety end-to-end** — TypeScript strict mode + Zod runtime validation + Prisma generated types
- **Background processing** — non-blocking budget alerts and weekly report generation
- **Separated training data** — ML training user isolated from real users to prevent data loss

---

## 📈 Why This Project Stands Out

Unlike typical CRUD finance apps, this system integrates:

- **Autonomous AI Agent** that takes real actions (sets budgets, creates plans) — not just a chatbot
- **Real machine learning models** for classification and clustering
- **LLM integration** with prompt engineering and graceful fallbacks
- **Production-level backend** with caching, job queues, and security middleware
- **Microservice architecture** with Python ML service communicating with Node.js API

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- Python 3.12+
- Docker
- Anthropic API key (optional — fallback included)

### Setup

```bash
# Clone the repository
git clone https://github.com/binhpham-2002/finance-tracker.git
cd finance-tracker

# Start databases
docker start finance-db finance-redis
# Or create new:
# docker run --name finance-db -e POSTGRES_DB=finance -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16-alpine
# docker run --name finance-redis -p 6379:6379 -d redis:7-alpine

# Setup API service
cd api
npm install
cp .env.example .env    # Edit with your DATABASE_URL and JWT_SECRET
npx prisma db push
npx prisma generate
npx tsx prisma/seed.ts
npm run dev

# Setup ML service (new terminal)
cd ml-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env    # Edit with your DATABASE_URL and ANTHROPIC_API_KEY
python src/seed_training.py
python src/main.py

# Setup frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 📡 API Overview

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create new user account |
| POST | `/api/auth/login` | Login and receive JWT token |

### Accounts
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/accounts` | Create account (auto-merges duplicates) |
| GET | `/api/accounts` | List user's accounts |
| DELETE | `/api/accounts/:id` | Delete account |
| GET | `/api/accounts/categories` | List all categories |

### Transactions
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/transactions` | Create transaction (auto-categorize if no category) |
| GET | `/api/transactions` | List with filters and pagination |
| DELETE | `/api/transactions/:id` | Delete (restores account balance) |
| DELETE | `/api/transactions/all/clear` | Clear all user transactions |
| GET | `/api/transactions/summary` | Monthly spending summary |
| POST | `/api/transactions/report` | Trigger weekly report |

### Budgets
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/budgets` | Set monthly budget (upsert) |
| GET | `/api/budgets` | List budgets for month |

### ML Service
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/ml/spending-patterns/:userId` | Category-wise spending analysis |
| GET | `/api/ml/clusters/:userId` | K-means transaction clusters |
| POST | `/api/ml/categorize` | Auto-categorize a transaction |
| GET | `/api/ml/advice/:userId` | AI-generated budget advice |
| POST | `/api/ml/agent` | **AI Agent** — autonomous financial planning |

---

## 📁 Project Structure

```
finance-tracker/
├── api/                        # Node.js backend
│   ├── src/
│   │   ├── controllers/        # Request handlers (auth, account, transaction, budget)
│   │   ├── routes/             # API route definitions
│   │   ├── middleware/         # JWT auth, rate limiting, error handling
│   │   ├── services/           # Redis cache, BullMQ workers
│   │   ├── models/             # Prisma client singleton
│   │   ├── config/             # Environment, Redis, queue configuration
│   │   └── utils/              # Zod validation schemas
│   └── prisma/
│       ├── schema.prisma       # Database schema (5 tables)
│       └── seed.ts             # Default categories
├── ml-service/                 # Python ML service
│   └── src/
│       ├── main.py             # FastAPI app (patterns, clusters, categorize, advice)
│       ├── agent.py            # AI Agent with Claude tool-use
│       └── seed_training.py    # Balanced training data (15 per category)
├── frontend/                   # React dashboard
│   └── src/
│       ├── App.tsx             # Dashboard with agent panel
│       └── App.css             # Dark mode styling
├── .github/workflows/          # CI/CD pipeline
├── docker-compose.yml          # Multi-service orchestration
├── start.sh                    # One-command startup script
└── README.md
```
---

## 👤 Author

**Binh Duc Pham**
- GitHub: [@binhpham-2002](https://github.com/binhpham-2002)
- Email: phamducbinh141@gmail.com
- LinkedIn: [Binh Duc Pham](https://linkedin.com/in/your-profile)

---

## 📄 License

MIT
