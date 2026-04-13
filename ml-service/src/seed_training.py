from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))

TRAINING_USER_EMAIL = "ml-training@system.internal"

with engine.connect() as conn:
    existing = conn.execute(text("SELECT id FROM users WHERE email = :email"), {"email": TRAINING_USER_EMAIL}).fetchone()

    if existing:
        train_user_id = existing[0]
    else:
        conn.execute(text("""
            INSERT INTO users (id, email, password_hash, first_name, last_name, created_at, updated_at)
            VALUES (gen_random_uuid(), :email, 'not-a-real-user', 'ML', 'Training', NOW(), NOW())
        """), {"email": TRAINING_USER_EMAIL})
        conn.commit()
        train_user_id = conn.execute(text("SELECT id FROM users WHERE email = :email"), {"email": TRAINING_USER_EMAIL}).fetchone()[0]

    existing_account = conn.execute(text("SELECT id FROM accounts WHERE user_id = :uid LIMIT 1"), {"uid": train_user_id}).fetchone()
    if existing_account:
        account_id = existing_account[0]
    else:
        conn.execute(text("""
            INSERT INTO accounts (id, user_id, account_name, account_type, balance, currency, created_at, updated_at)
            VALUES (gen_random_uuid(), :uid, 'Training Account', 'CHECKING', 0, 'USD', NOW(), NOW())
        """), {"uid": train_user_id})
        conn.commit()
        account_id = conn.execute(text("SELECT id FROM accounts WHERE user_id = :uid LIMIT 1"), {"uid": train_user_id}).fetchone()[0]

    categories = conn.execute(text("SELECT id, name FROM categories")).fetchall()
    cat_map = {name: id for id, name in categories}

    conn.execute(text("DELETE FROM transactions WHERE user_id = :uid"), {"uid": train_user_id})
    conn.commit()

    training_data = [
        # Food & Dining (15)
        ("Breakfast burrito", "Chipotle", "Food & Dining", 12.50),
        ("Sushi dinner", "Sushi House", "Food & Dining", 45.00),
        ("Coffee latte", "Starbucks", "Food & Dining", 6.50),
        ("Grocery shopping", "Walmart", "Food & Dining", 85.00),
        ("Pizza delivery", "Dominos", "Food & Dining", 22.00),
        ("Lunch sandwich", "Subway", "Food & Dining", 9.00),
        ("Thai food takeout", "Thai Kitchen", "Food & Dining", 18.00),
        ("Brunch with family", "IHOP", "Food & Dining", 55.00),
        ("Vegetable salad", "Salad Bar", "Food & Dining", 11.00),
        ("Chicken wings", "Wingstop", "Food & Dining", 16.00),
        ("Ramen noodles", "Ramen Shop", "Food & Dining", 14.00),
        ("Tacos and burrito", "Taco Bell", "Food & Dining", 12.00),
        ("Breakfast pancakes", "IHOP", "Food & Dining", 13.00),
        ("Food delivery order", "DoorDash", "Food & Dining", 25.00),
        ("Dinner at restaurant", "Olive Garden", "Food & Dining", 40.00),
        # Transportation (15)
        ("Gas station fill up", "Shell", "Transportation", 55.00),
        ("Uber ride to airport", "Uber", "Transportation", 35.00),
        ("Monthly bus pass", "City Transit", "Transportation", 75.00),
        ("Parking garage fee", "City Parking", "Transportation", 15.00),
        ("Gas fill up", "Chevron", "Transportation", 48.00),
        ("Lyft ride downtown", "Lyft", "Transportation", 22.00),
        ("Car wash service", "Quick Wash", "Transportation", 12.00),
        ("Toll road fee", "FasTrak", "Transportation", 6.00),
        ("Uber ride to work", "Uber", "Transportation", 18.00),
        ("Train ticket purchase", "Amtrak", "Transportation", 45.00),
        ("Car maintenance repair", "AutoZone", "Transportation", 80.00),
        ("Parking fee downtown", "ParkMobile", "Transportation", 10.00),
        ("Bus fare payment", "Metro", "Transportation", 3.00),
        ("Car insurance payment", "Geico", "Transportation", 120.00),
        ("Oil change service", "Jiffy Lube", "Transportation", 45.00),
        # Entertainment (15)
        ("Movie tickets", "AMC Theaters", "Entertainment", 30.00),
        ("Netflix subscription", "Netflix", "Entertainment", 15.00),
        ("Concert tickets", "Ticketmaster", "Entertainment", 120.00),
        ("Spotify premium", "Spotify", "Entertainment", 10.00),
        ("Video game purchase", "Steam", "Entertainment", 60.00),
        ("Museum admission", "City Museum", "Entertainment", 25.00),
        ("Bowling night out", "Lucky Strike", "Entertainment", 35.00),
        ("Disney Plus subscription", "Disney", "Entertainment", 12.00),
        ("Streaming subscription", "Hulu", "Entertainment", 13.00),
        ("Gaming purchase", "PlayStation", "Entertainment", 70.00),
        ("Theater show tickets", "Broadway", "Entertainment", 90.00),
        ("Amusement park visit", "Six Flags", "Entertainment", 65.00),
        ("Karaoke night", "Karaoke Bar", "Entertainment", 25.00),
        ("Escape room game", "Escape Room", "Entertainment", 30.00),
        ("Arcade games", "Dave Busters", "Entertainment", 20.00),
        # Shopping (15)
        ("New running shoes", "Nike", "Shopping", 130.00),
        ("T-shirts and jeans", "Uniqlo", "Shopping", 65.00),
        ("Phone case purchase", "Amazon", "Shopping", 25.00),
        ("Kitchen supplies", "Target", "Shopping", 40.00),
        ("Winter jacket", "North Face", "Shopping", 180.00),
        ("Pen and notebook", "Office Depot", "Shopping", 12.00),
        ("School supplies", "Staples", "Shopping", 30.00),
        ("Backpack purchase", "Amazon", "Shopping", 45.00),
        ("Headphones purchase", "Best Buy", "Shopping", 80.00),
        ("Clothing purchase", "Zara", "Shopping", 65.00),
        ("Shoes purchase", "Foot Locker", "Shopping", 110.00),
        ("Watch purchase", "Amazon", "Shopping", 50.00),
        ("Gift for friend", "Target", "Shopping", 30.00),
        ("Sunglasses purchase", "Ray Ban", "Shopping", 150.00),
        ("Furniture purchase", "IKEA", "Shopping", 200.00),
        # Housing (15)
        ("Monthly rent payment", "Apartment Complex", "Housing", 1500.00),
        ("Renter insurance", "State Farm", "Housing", 25.00),
        ("Home cleaning supplies", "Home Depot", "Housing", 30.00),
        ("Furniture repair", "Handyman", "Housing", 100.00),
        ("Plumbing repair service", "Plumber", "Housing", 150.00),
        ("House cleaning service", "Maid Service", "Housing", 80.00),
        ("Lawn care service", "Lawn Pro", "Housing", 50.00),
        ("Pest control service", "Terminix", "Housing", 90.00),
        ("Home security system", "ADT", "Housing", 45.00),
        ("Mortgage payment", "Bank of America", "Housing", 2000.00),
        ("Property tax payment", "County Tax", "Housing", 300.00),
        ("HOA monthly fee", "HOA Office", "Housing", 150.00),
        ("Home repair supplies", "Lowes", "Housing", 60.00),
        ("Smoke detector purchase", "Home Depot", "Housing", 25.00),
        ("Air filter replacement", "Amazon", "Housing", 20.00),
        # Utilities (15)
        ("Electric bill payment", "PG&E", "Utilities", 95.00),
        ("Internet bill payment", "Comcast", "Utilities", 60.00),
        ("Phone bill payment", "T-Mobile", "Utilities", 50.00),
        ("Water bill payment", "City Water", "Utilities", 35.00),
        ("Electricity payment", "Edison", "Utilities", 85.00),
        ("Cell phone bill", "Verizon", "Utilities", 65.00),
        ("Gas bill payment", "SoCal Gas", "Utilities", 40.00),
        ("Trash pickup service", "Waste Management", "Utilities", 30.00),
        ("Cable TV bill", "Spectrum", "Utilities", 70.00),
        ("Sewer bill payment", "City Utility", "Utilities", 25.00),
        ("Heating bill payment", "Gas Company", "Utilities", 55.00),
        ("Wifi service payment", "AT&T", "Utilities", 50.00),
        ("Cloud storage plan", "Google One", "Utilities", 10.00),
        ("VPN subscription", "NordVPN", "Utilities", 12.00),
        ("Domain hosting fee", "GoDaddy", "Utilities", 15.00),
        # Healthcare (15)
        ("Doctor visit copay", "Kaiser", "Healthcare", 30.00),
        ("Prescription medicine", "CVS Pharmacy", "Healthcare", 15.00),
        ("Gym membership", "24 Hour Fitness", "Healthcare", 40.00),
        ("Dental checkup", "Dental Office", "Healthcare", 50.00),
        ("Eye exam visit", "LensCrafters", "Healthcare", 75.00),
        ("Therapy session", "Therapist Office", "Healthcare", 100.00),
        ("Vitamins purchase", "GNC", "Healthcare", 25.00),
        ("Urgent care visit", "Urgent Care", "Healthcare", 150.00),
        ("Health insurance", "Blue Cross", "Healthcare", 300.00),
        ("Pharmacy purchase", "Walgreens", "Healthcare", 20.00),
        ("Blood test lab work", "Quest Lab", "Healthcare", 45.00),
        ("Physical therapy", "PT Clinic", "Healthcare", 80.00),
        ("Contact lenses", "1800 Contacts", "Healthcare", 60.00),
        ("Flu shot vaccine", "CVS Pharmacy", "Healthcare", 25.00),
        ("Mental health app", "BetterHelp", "Healthcare", 35.00),
        # Education (15)
        ("Online course", "Udemy", "Education", 15.00),
        ("Textbook purchase", "Chegg", "Education", 45.00),
        ("AWS certification exam", "AWS", "Education", 150.00),
        ("Coding bootcamp", "Codecademy", "Education", 40.00),
        ("Language learning app", "Duolingo", "Education", 13.00),
        ("Online tutorial", "Coursera", "Education", 50.00),
        ("School tuition payment", "University", "Education", 5000.00),
        ("Study materials", "Amazon", "Education", 30.00),
        ("Exam preparation", "Kaplan", "Education", 100.00),
        ("Workshop registration", "Eventbrite", "Education", 25.00),
        ("Professional development", "LinkedIn Learning", "Education", 30.00),
        ("Library late fee", "Public Library", "Education", 5.00),
        ("Printing and copying", "FedEx Office", "Education", 10.00),
        ("Calculator purchase", "Best Buy", "Education", 35.00),
        ("Research paper access", "JSTOR", "Education", 15.00),
    ]

    count = 0
    for desc, merchant, cat_name, amount in training_data:
        cat_id = cat_map.get(cat_name)
        if not cat_id:
            continue
        conn.execute(text("""
            INSERT INTO transactions (id, user_id, account_id, category_id, amount, type, description, merchant, date, is_recurring, created_at, updated_at)
            VALUES (gen_random_uuid(), :user_id, :account_id, :cat_id, :amount, 'EXPENSE', :desc, :merchant, CURRENT_DATE - (random() * 30)::int, false, NOW(), NOW())
        """), {
            "user_id": train_user_id,
            "account_id": account_id,
            "cat_id": cat_id,
            "amount": amount,
            "desc": desc,
            "merchant": merchant,
        })
        count += 1
    conn.commit()

print(f"Done! Inserted {count} training transactions (balanced: 15 per category)")