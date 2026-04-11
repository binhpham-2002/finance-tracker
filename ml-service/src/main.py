from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text
import pandas as pd
from sklearn.cluster import KMeans
from dotenv import load_dotenv
import os
import anthropic
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
import pickle
import json

load_dotenv()

app = FastAPI(title="Finance Tracker ML Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/finance")
engine = create_engine(DATABASE_URL)
claude = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

@app.get("/health")
def health():
    return {"status": "ok", "service": "ml"}

@app.get("/api/ml/spending-patterns/{user_id}")
def get_spending_patterns(user_id: str):
    query = text("""
        SELECT 
            c.name as category,
            COUNT(*) as transaction_count,
            SUM(t.amount) as total_amount,
            AVG(t.amount) as avg_amount,
            EXTRACT(DOW FROM t.date) as day_of_week
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = :user_id AND t.type = 'EXPENSE'
        GROUP BY c.name, EXTRACT(DOW FROM t.date)
        ORDER BY total_amount DESC
    """)

    with engine.connect() as conn:
        df = pd.read_sql(query, conn, params={"user_id": user_id})

    if df.empty:
        return {"message": "No spending data found", "patterns": []}

    summary = df.groupby("category").agg(
        total_spent=("total_amount", "sum"),
        avg_per_transaction=("avg_amount", "mean"),
        transaction_count=("transaction_count", "sum"),
    ).reset_index()

    total = summary["total_spent"].sum()
    summary["percentage"] = round(summary["total_spent"] / total * 100, 1)
    summary = summary.sort_values("total_spent", ascending=False)

    patterns = summary.to_dict("records")

    return {
        "user_id": user_id,
        "total_spending": float(total),
        "patterns": patterns,
    }

@app.get("/api/ml/clusters/{user_id}")
def get_spending_clusters(user_id: str):
    query = text("""
        SELECT 
            t.amount,
            EXTRACT(DOW FROM t.date) as day_of_week,
            EXTRACT(HOUR FROM t.created_at) as hour_of_day
        FROM transactions t
        WHERE t.user_id = :user_id AND t.type = 'EXPENSE'
    """)

    with engine.connect() as conn:
        df = pd.read_sql(query, conn, params={"user_id": user_id})

    if len(df) < 3:
        return {"message": "Need at least 3 transactions for clustering", "clusters": []}

    features = df[["amount", "day_of_week", "hour_of_day"]].copy()
    features["amount"] = (features["amount"] - features["amount"].mean()) / features["amount"].std()

    n_clusters = min(3, len(df))
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    df["cluster"] = kmeans.fit_predict(features)

    cluster_summary = []
    for cluster_id in range(n_clusters):
        cluster_data = df[df["cluster"] == cluster_id]
        cluster_summary.append({
            "cluster_id": cluster_id,
            "size": len(cluster_data),
            "avg_amount": round(float(cluster_data["amount"].mean()), 2),
            "min_amount": round(float(cluster_data["amount"].min()), 2),
            "max_amount": round(float(cluster_data["amount"].max()), 2),
        })

    return {
        "user_id": user_id,
        "total_transactions": len(df),
        "clusters": cluster_summary,
    }

@app.get("/api/ml/advice/{user_id}")
def get_budget_advice(user_id: str):
    try:
        query = text("""
            SELECT 
                c.name as category,
                SUM(t.amount) as total_amount,
                COUNT(*) as transaction_count
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.user_id = :user_id 
                AND t.type = 'EXPENSE'
                AND t.date >= date_trunc('month', CURRENT_DATE)
            GROUP BY c.name
            ORDER BY total_amount DESC
        """)

        income_query = text("""
            SELECT COALESCE(SUM(amount), 0) as total_income
            FROM transactions
            WHERE user_id = :user_id 
                AND type = 'INCOME'
                AND date >= date_trunc('month', CURRENT_DATE)
        """)

        with engine.connect() as conn:
            spending_df = pd.read_sql(query, conn, params={"user_id": user_id})
            income_df = pd.read_sql(income_query, conn, params={"user_id": user_id})

        if spending_df.empty:
            return {"advice": "No spending data found this month."}

        total_income = float(income_df["total_income"].iloc[0])
        total_expense = float(spending_df["total_amount"].sum())

        spending_summary = ""
        for _, row in spending_df.iterrows():
            spending_summary += f"- {row['category']}: ${float(row['total_amount']):.2f} ({int(row['transaction_count'])} transactions)\n"

        top_category = spending_df.iloc[0]["category"]
        top_amount = float(spending_df.iloc[0]["total_amount"])
        savings_rate = ((total_income - total_expense) / total_income * 100) if total_income > 0 else 0

        try:
            prompt = f"""You are a personal finance advisor. Based on this spending data, provide brief advice.

Monthly Income: ${total_income:.2f}
Monthly Expenses: ${total_expense:.2f}
Net Savings: ${total_income - total_expense:.2f}

Spending breakdown:
{spending_summary}

Provide: 1) One sentence summary 2) Top 2 savings tips 3) Recommended budget split. Under 200 words."""

            message = claude.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}]
            )
            advice_text = message.content[0].text
        except Exception as e:
            advice_text = (
                f"Based on your data: Income ${total_income:.2f}, Expenses ${total_expense:.2f}, "
                f"Savings rate {savings_rate:.0f}%. "
                f"Top spending: {top_category} (${top_amount:.2f}). "
                f"Tip: Aim for 20% savings rate. "
                f"(AI advisor unavailable: {str(e)[:80]})"
            )

        return {
            "user_id": user_id,
            "monthly_income": total_income,
            "monthly_expenses": total_expense,
            "net_savings": total_income - total_expense,
            "savings_rate_percent": round(savings_rate, 1),
            "spending_breakdown": spending_df.to_dict("records"),
            "ai_advice": advice_text,
        }
    except Exception as e:
        return {"error": str(e)}
    

@app.post("/api/ml/categorize")
def categorize_transaction(data: dict):
    description = data.get("description", "")
    merchant = data.get("merchant", "")
    text_input = f"{description} {merchant}".strip()

    if not text_input:
        return {"category": None, "confidence": 0}

    # Get training data from existing transactions
    query = text("""
        SELECT 
            CONCAT(t.description, ' ', COALESCE(t.merchant, '')) as text_input,
            c.name as category
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.category_id IS NOT NULL
    """)

    with engine.connect() as conn:
        df = pd.read_sql(query, conn)

    if len(df) < 5:
        return {
            "category": None,
            "confidence": 0,
            "message": "Need at least 5 categorized transactions to train model"
        }

    # Train simple model
    vectorizer = TfidfVectorizer(max_features=100, stop_words="english")
    X = vectorizer.fit_transform(df["text_input"])
    y = df["category"]

    model = MultinomialNB()
    model.fit(X, y)

    # Predict
    input_vector = vectorizer.transform([text_input])
    predicted_category = model.predict(input_vector)[0]
    confidence = float(max(model.predict_proba(input_vector)[0]))

    # Get category ID
    cat_query = text("SELECT id FROM categories WHERE name = :name")
    with engine.connect() as conn:
        result = conn.execute(cat_query, {"name": predicted_category}).fetchone()

    category_id = result[0] if result else None

    return {
        "category": predicted_category,
        "category_id": category_id,
        "confidence": round(confidence, 3),
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)