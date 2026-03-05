import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random

# --- CONFIGURATION ---
INPUT_FILE = "raw_data.xlsx"   
OUTPUT_FILE = "richa_poc_data.xlsx"
OPEN_ORDER_COUNT = 500

STAGES = [
    "Material Inward", "Cutting", "Sewing", 
    "Washing", "Finishing", "Packing", "Quality Check"
]

def generate_poc_dataset():
    print(f"📂 Loading {INPUT_FILE}...")
    try:
        # FIX: 'header=1' tells Python that row 2 contains the column names
        df = pd.read_excel(INPUT_FILE, header=1)
    except FileNotFoundError:
        print(f"❌ Error: Could not find '{INPUT_FILE}'.")
        return

    # --- DEBUGGING: PRINT COLUMNS TO VERIFY ---
    print(f"🔎 Found Columns on Row 2: {list(df.columns)}")
    
    # 1. FIND THE DELIVERY DATE COLUMN
    # We look for the exact column name 'Delivery Date' or 'Promised Date'
    date_col = None
    for col in df.columns:
        if "delivery" in str(col).lower() and "date" in str(col).lower():
            date_col = col
            break
        if "promised" in str(col).lower():
            date_col = col
            break
            
    if date_col:
        print(f"✅ Found Date Column: '{date_col}'")
        # Rename it to standard 'Delivery Date' so the rest of script works
        df.rename(columns={date_col: 'Delivery Date'}, inplace=True)
    else:
        print("❌ CRITICAL ERROR: Still cannot find a 'Delivery Date' column.")
        print("   Please open Excel and ensure 'Delivery Date' is written in Row 2.")
        return

    # 2. PREPARE DATES
    df['Delivery Date'] = pd.to_datetime(df['Delivery Date'], errors='coerce')
    
    # 3. GENERATE 'ORDER CREATION DATE'
    print("⚙️ Generating Order Creation Dates...")
    def get_start_date(delivery_date):
        if pd.isnull(delivery_date):
            return datetime.now() - timedelta(days=90)
        return delivery_date - timedelta(days=random.randint(60, 90))

    df['Order Creation Date'] = df['Delivery Date'].apply(get_start_date)

    # 4. CREATE 'OPEN ORDERS'
    print(f"⚙️ Simulating {OPEN_ORDER_COUNT} Open Orders...")
    
    total_rows = len(df)
    count = min(OPEN_ORDER_COUNT, total_rows)
    open_indices = df.index[-count:]
    
    # Initialize default status
    df['Current Status'] = 'Shipped'
    
    for idx in open_indices:
        # A. Remove Ship Date (Try all common names)
        for ship_col in ['Ship Date', 'Shipment Date', 'Actual Ship Date']:
            if ship_col in df.columns:
                df.at[idx, ship_col] = pd.NaT
                
        if 'Invoice No' in df.columns:
            df.at[idx, 'Invoice No'] = None

        # B. Assign Random Status
        df.at[idx, 'Current Status'] = random.choice(STAGES)

    # 5. FINAL FORMATTING
    # Convert dates to string (YYYY-MM-DD) for JSON compatibility
    df['Delivery Date'] = df['Delivery Date'].dt.strftime('%Y-%m-%d')
    df['Order Creation Date'] = df['Order Creation Date'].dt.strftime('%Y-%m-%d')
    
    print(f"💾 Saving to {OUTPUT_FILE}...")
    df.to_excel(OUTPUT_FILE, index=False)
    print("✅ Success! Dataset ready.")

if __name__ == "__main__":
    generate_poc_dataset()