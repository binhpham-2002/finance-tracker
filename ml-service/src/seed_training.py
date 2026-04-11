from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

# First get user_id, account_id, and category IDs
with engine.connect() as conn:
    user = conn.execute(text("SELECT id FROM users LIMIT 1")).fetchone()
    account = conn.execute(text("SELECT id FROM accounts LIMIT 1")).fetchone()
    categories = conn.execute(text("SELECT id, name FROM categories")).fetchall()

user_id = user[0]
account_id = account[0]
cat_map = {name: id for id, name in categories}

training_data = [
    # Food & Dining
    ("Breakfast burrito", "Chipotle", "Food & Dining", 12.50),
    ("Sushi dinner", "Sushi House", "Food & Dining", 45.00),
    ("Coffee latte", "Starbucks", "Food & Dining", 6.50),
    ("Grocery shopping", "Walmart", "Food & Dining", 85.00),
    ("Pizza delivery", "Dominos", "Food & Dining", 22.00),
    ("Lunch sandwich", "Subway", "Food & Dining", 9.00),
    ("Thai food takeout", "Thai Kitchen", "Food & Dining", 18.00),
    ("Brunch with family", "IHOP", "Food & Dining", 55.00),
    # Transportation
    ("Gas station fill up", "Shell", "Transportation", 55.00),
    ("Uber ride to airport", "Uber", "Transportation", 35.00),
    ("Monthly bus pass", "City Transit", "Transportation", 75.00),
    ("Parking garage", "City Parking", "Transportation", 15.00),
    ("Gas fill up", "Chevron", "Transportation", 48.00),
    ("Lyft ride downtown", "Lyft", "Transportation", 22.00),
    ("Car wash", "Quick Wash", "Transportation", 12.00),
    ("Toll road fee", "FasTrak", "Transportation", 6.00),
    # Entertainment
    ("Movie tickets", "AMC Theaters", "Entertainment", 30.00),
    ("Netflix subscription", "Netflix", "Entertainment", 15.00),
    ("Concert tickets", "Ticketmaster", "Entertainment", 120.00),
    ("Spotify premium", "Spotify", "Entertainment", 10.00),
    ("Video game purchase", "Steam", "Entertainment", 60.00),
    ("Museum admission", "City Museum", "Entertainment", 25.00),
    ("Bowling night", "Lucky Strike", "Entertainment", 35.00),
    ("Disney Plus subscription", "Disney", "Entertainment", 12.00),
    # Shopping
    ("New running shoes", "Nike", "Shopping", 130.00),
    ("T-shirts and jeans", "Uniqlo", "Shopping", 65.00),
    ("Phone case", "Amazon", "Shopping", 25.00),
    ("Kitchen supplies", "Target", "Shopping", 40.00),
    ("Books purchase", "Barnes Noble", "Shopping", 35.00),
    ("Winter jacket", "North Face", "Shopping", 180.00),
    # Housing
    ("Monthly rent", "Apartment Complex", "Housing", 1500.00),
    ("Renter insurance", "State Farm", "Housing", 25.00),
    ("Home cleaning supplies", "Home Depot", "Housing", 30.00),
    # Utilities
    ("Electric bill", "PG&E", "Utilities", 95.00),
    ("Internet bill", "Comcast", "Utilities", 60.00),
    ("Phone bill", "T-Mobile", "Utilities", 50.00),
    ("Water bill", "City Water", "Utilities", 35.00),
    # Healthcare
    ("Doctor visit copay", "Kaiser", "Healthcare", 30.00),
    ("Prescription medicine", "CVS Pharmacy", "Healthcare", 15.00),
    ("Gym membership", "24 Hour Fitness", "Healthcare", 40.00),
    # Education
    ("Online course", "Udemy", "Education", 15.00),
    ("Textbook purchase", "Chegg", "Education", 45.00),
    ("AWS certification exam", "AWS", "Education", 150.00),
]

with engine.connect() as conn:
    count = 0
    for desc, merchant, cat_name, amount in training_data:
        cat_id = cat_map.get(cat_name)
        if not cat_id:
            continue
        conn.execute(text("""
            INSERT INTO transactions (id, user_id, account_id, category_id, amount, type, description, merchant, date, is_recurring, created_at, updated_at)
            VALUES (gen_random_uuid(), :user_id, :account_id, :cat_id, :amount, 'EXPENSE', :desc, :merchant, CURRENT_DATE - (random() * 30)::int, false, NOW(), NOW())
        """), {
            "user_id": user_id,
            "account_id": account_id,
            "cat_id": cat_id,
            "amount": amount,
            "desc": desc,
            "merchant": merchant,
        })
        count += 1
    conn.commit()

print(f"Done! Inserted {count} training transactions")