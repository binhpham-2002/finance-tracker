from fastapi import FastAPI
from sqlalchemy import create_engine, text
import pandas as pd
from sklearn.cluster import KMeans
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI(title="Finance Tracker ML Service")

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/finance")
engine = create_engine(DATABASE_URL)

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)