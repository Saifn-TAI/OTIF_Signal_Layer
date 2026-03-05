import os
import json
import pandas as pd
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate

# 1. Load Environment Variables
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY not found. Please check your .env file.")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE_PATH = os.path.join(BASE_DIR, "..", "data", "order_sample_data.xlsx")

# --- DATA ENGINE (Loaded ONCE at startup) ---
class DataEngine:
    def __init__(self):
        self.df = self._load_data()
        self.data_summary = self._build_summary()

    def _load_data(self):
        if not os.path.exists(DATA_FILE_PATH):
            return pd.DataFrame()

        df = pd.read_excel(DATA_FILE_PATH, header=0)
        df.columns = df.columns.str.strip()

        # Normalize column names from the new dataset format to the expected format
        rename_map = {
            'Customer': 'Buyer',
            'Order Quantity': 'Quantity',
            'Ship Qty': 'Ship Quantity'
        }
        df.rename(columns=rename_map, inplace=True)

        # Parse dates
        df['Delivery_Date_Dt'] = pd.to_datetime(df['Delivery Date'], errors='coerce')
        df['Ship_Date_Dt'] = pd.to_datetime(df['Ship Date'], errors='coerce')

        # Derive shipped vs active: Ship Date NaN or Ship Qty == 0 => Not Shipped
        df['Current_Status'] = 'Shipped'
        df.loc[df['Ship_Date_Dt'].isna() | (df['Ship Quantity'] == 0), 'Current_Status'] = 'Not Shipped'

        # Filter to active orders only for chatbot context
        active = df[df['Current_Status'] == 'Not Shipped'].copy()

        today = pd.to_datetime('today').normalize()
        active['Days_Remaining'] = (active['Delivery_Date_Dt'] - today).dt.days

        # Smart PO ID
        def get_smart_id(row):
            if 'Buyer PO' in row and pd.notna(row['Buyer PO']):
                return str(row['Buyer PO']).strip()
            for col in ['PO Number', 'PO', 'Order No', 'Invoice No']:
                if col in row and pd.notna(row[col]):
                    return str(row[col]).strip()
            return "N/A"

        active['Smart_ID'] = active.apply(get_smart_id, axis=1)

        # Estimate stage from days remaining (raw data has no stage column)
        def estimate_stage(days_rem):
            if days_rem < 0:
                return 'Overdue'
            elif days_rem <= 5:
                return 'Packing'
            elif days_rem <= 10:
                return 'Quality Check'
            elif days_rem <= 15:
                return 'Finishing'
            elif days_rem <= 20:
                return 'Washing'
            elif days_rem <= 30:
                return 'Sewing'
            elif days_rem <= 40:
                return 'Cutting'
            else:
                return 'Material Inward'

        active['Estimated_Stage'] = active['Days_Remaining'].apply(estimate_stage)

        # Risk classification
        def classify_risk(row):
            days = row['Days_Remaining']
            if days < 0:
                return "DELAYED"
            elif days < 15:
                return "WATCHLIST"
            else:
                return "On Track"

        active['Risk_Status'] = active.apply(classify_risk, axis=1)
        return active

    def _build_summary(self):
        """Pre-compute a comprehensive data summary for the LLM."""
        if self.df.empty:
            return "No data available."

        df = self.df
        total = len(df)
        delayed = df[df['Risk_Status'] == 'DELAYED']
        watchlist = df[df['Risk_Status'] == 'WATCHLIST']
        on_track = df[df['Risk_Status'] == 'On Track']

        # --- KPI Summary ---
        summary_parts = []
        summary_parts.append(f"=== RICHA GLOBAL PRODUCTION DATA (Live) ===")
        summary_parts.append(f"Total Active Orders: {total}")
        summary_parts.append(f"DELAYED (Critical): {len(delayed)} orders")
        summary_parts.append(f"WATCHLIST (At Risk): {len(watchlist)} orders")
        summary_parts.append(f"On Track: {len(on_track)} orders")

        # --- OTIF Intelligence (from otif_engine) ---
        try:
            from otif_engine import otif_engine
            otif_context = otif_engine.get_otif_context_for_chatbot()
            summary_parts.append(f"\n{otif_context}")
        except Exception as e:
            summary_parts.append(f"\n(OTIF data temporarily unavailable: {e})")

        # --- Stage Breakdown ---
        if 'Estimated_Stage' in df.columns:
            stage_counts = df['Estimated_Stage'].value_counts().to_dict()
            summary_parts.append(f"\n--- ORDERS BY ESTIMATED STAGE ---")
            for stage, count in stage_counts.items():
                delayed_in_stage = len(delayed[delayed.get('Estimated_Stage', pd.Series()) == stage]) if 'Estimated_Stage' in delayed.columns else 0
                summary_parts.append(f"  {stage}: {count} orders ({delayed_in_stage} delayed)")

        # --- Top Buyers with Delays ---
        if not delayed.empty:
            buyer_delays = delayed.groupby('Buyer').agg(
                count=('Smart_ID', 'size'),
                total_qty=('Quantity', 'sum'),
                worst_delay=('Days_Remaining', 'min')
            ).sort_values('count', ascending=False).head(10)

            summary_parts.append(f"\n--- TOP BUYERS WITH DELAYS ---")
            for buyer, row in buyer_delays.iterrows():
                summary_parts.append(
                    f"  {buyer}: {row['count']} delayed orders, "
                    f"Qty={int(row['total_qty'])}, "
                    f"Worst={abs(int(row['worst_delay']))} days overdue"
                )

        # --- Plant Breakdown ---
        if 'Plant' in df.columns:
            plant_delays = df.groupby('Plant').agg(
                total=('Smart_ID', 'size'),
                delayed=('Risk_Status', lambda x: (x == 'DELAYED').sum())
            ).sort_values('delayed', ascending=False).head(8)

            summary_parts.append(f"\n--- PLANT PERFORMANCE ---")
            for plant, row in plant_delays.iterrows():
                summary_parts.append(f"  {plant}: {int(row['total'])} orders, {int(row['delayed'])} delayed")

        # --- Delivery Date Breakdown by Month ---
        if 'Delivery_Date_Dt' in df.columns:
            df_with_month = df.dropna(subset=['Delivery_Date_Dt']).copy()
            df_with_month['Del_Month'] = df_with_month['Delivery_Date_Dt'].dt.strftime('%B %Y')
            month_summary = df_with_month.groupby('Del_Month').agg(
                total=('Smart_ID', 'size'),
                delayed_count=('Risk_Status', lambda x: (x == 'DELAYED').sum()),
                total_qty=('Quantity', 'sum')
            ).sort_index()

            summary_parts.append(f"\n--- ORDERS BY DELIVERY MONTH ---")
            for month, row in month_summary.iterrows():
                summary_parts.append(
                    f"  {month}: {int(row['total'])} orders ({int(row['delayed_count'])} delayed), "
                    f"Qty={int(row['total_qty']):,}"
                )

        # --- Most Delayed Orders ---
        if not delayed.empty:
            worst = delayed.nsmallest(10, 'Days_Remaining')
            summary_parts.append(f"\n--- TOP 10 MOST DELAYED ORDERS ---")
            for _, row in worst.iterrows():
                del_date = row['Delivery_Date_Dt'].strftime('%Y-%m-%d') if pd.notna(row.get('Delivery_Date_Dt')) else 'N/A'
                summary_parts.append(
                    f"  PO: {row['Smart_ID']} | Buyer: {row.get('Buyer', 'N/A')} | "
                    f"Stage: {row.get('Estimated_Stage', 'N/A')} | "
                    f"Overdue: {abs(int(row['Days_Remaining']))} days | "
                    f"Delivery Date: {del_date} | "
                    f"Qty: {int(row.get('Quantity', 0))} | "
                    f"Plant: {row.get('Plant', 'N/A')}"
                )

        # --- Quantity at Risk ---
        if 'Quantity' in df.columns:
            total_qty = int(df['Quantity'].sum())
            delayed_qty = int(delayed['Quantity'].sum()) if not delayed.empty else 0
            watchlist_qty = int(watchlist['Quantity'].sum()) if not watchlist.empty else 0
            summary_parts.append(f"\n--- QUANTITY ANALYSIS ---")
            summary_parts.append(f"  Total Active Quantity: {total_qty:,}")
            summary_parts.append(f"  Quantity Delayed: {delayed_qty:,}")
            summary_parts.append(f"  Quantity At Risk (Watchlist): {watchlist_qty:,}")

        # --- Available Columns ---
        summary_parts.append(f"\n--- DATA COLUMNS AVAILABLE ---")
        summary_parts.append(f"  {', '.join(df.columns.tolist())}")

        return "\n".join(summary_parts)

    def search_orders(self, query):
        """Search for specific orders by PO, buyer, style, month, date, etc."""
        if self.df.empty:
            return None

        df = self.df
        query_lower = query.lower()

        matched = pd.DataFrame()
        search_type = "keyword"

        # --- CHECK FOR MONTH-BASED QUERIES ---
        month_names = {
            'january': 1, 'february': 2, 'march': 3, 'april': 4,
            'may': 5, 'june': 6, 'july': 7, 'august': 8,
            'september': 9, 'october': 10, 'november': 11, 'december': 12,
            'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4,
            'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
        }

        detected_month = None
        for month_name, month_num in month_names.items():
            if month_name in query_lower:
                detected_month = month_num
                search_type = f"month:{month_name}"
                break

        if detected_month and 'Delivery_Date_Dt' in df.columns:
            month_mask = df['Delivery_Date_Dt'].dt.month == detected_month

            if 'delay' in query_lower or 'overdue' in query_lower or 'late' in query_lower:
                month_mask = month_mask & (df['Risk_Status'] == 'DELAYED')
                search_type += " + delayed"
            elif 'watchlist' in query_lower or 'risk' in query_lower:
                month_mask = month_mask & (df['Risk_Status'].isin(['WATCHLIST', 'DELAYED']))
                search_type += " + at-risk"
            elif 'on track' in query_lower:
                month_mask = month_mask & (df['Risk_Status'] == 'On Track')
                search_type += " + on-track"

            matched = df[month_mask].sort_values('Days_Remaining')
        else:
            # Standard keyword search
            mask = (
                df['Smart_ID'].astype(str).str.lower().str.contains(query_lower, na=False) |
                df['Buyer'].astype(str).str.lower().str.contains(query_lower, na=False)
            )

            for col in ['Style', 'Plant', 'Brands', 'Color', 'Division', 'Season']:
                if col in df.columns:
                    mask = mask | df[col].astype(str).str.lower().str.contains(query_lower, na=False)

            matched = df[mask]

        if matched.empty:
            return None

        # Return formatted results (top 20)
        show_count = min(20, len(matched))
        results = []
        for _, row in matched.head(show_count).iterrows():
            days = int(row['Days_Remaining'])
            days_txt = f"{abs(days)} days overdue" if days < 0 else f"{days} days remaining"
            del_date = row['Delivery_Date_Dt'].strftime('%Y-%m-%d') if pd.notna(row.get('Delivery_Date_Dt')) else 'N/A'
            results.append(
                f"  PO: {row['Smart_ID']} | Buyer: {row.get('Buyer', 'N/A')} | "
                f"Stage: {row.get('Estimated_Stage', 'N/A')} | {days_txt} | "
                f"Delivery: {del_date} | "
                f"Risk: {row['Risk_Status']} | Qty: {int(row.get('Quantity', 0))} | "
                f"Plant: {row.get('Plant', 'N/A')} | Style: {row.get('Style', 'N/A')}"
            )

        header = f"\n--- SEARCH RESULTS [{search_type}] ({len(matched)} total matches, showing top {show_count}) ---"
        return header + "\n" + "\n".join(results)


# --- LOAD DATA ONCE AT STARTUP ---
print("🔄 Loading production data...")
ENGINE = DataEngine()
print(f"✅ Loaded {len(ENGINE.df)} active orders.")


# --- MAIN CHAT HANDLER ---
def query_data(user_question):
    try:
        # Attempt to find specific order data related to the question
        search_context = ENGINE.search_orders(user_question) or ""

        # Build the LLM prompt with full data context
        llm = ChatGroq(
            temperature=0.3,
            model_name="llama-3.3-70b-versatile",
            api_key=GROQ_API_KEY,
            max_tokens=1024
        )

        prompt = ChatPromptTemplate.from_template(
            """You are the AI Production Consultant for Richa Global Exports, a garment manufacturing company.
You have access to LIVE production data below including OTIF intelligence. Answer the user's question accurately using ONLY this data.

RULES:
1. Always be specific — use exact numbers, PO numbers, buyer names, and dates from the data.
2. Format your response in clean Markdown with headers, bold text, and bullet points.
3. If the question is about specific orders or buyers, reference them by name/PO number.
4. If the question is general (greetings, off-topic), respond politely and briefly mention the current production status.
5. If the question is about strategy or recommendations, give concrete, actionable advice based on the data.
6. Never say "I don't have access to the data" — you DO have the data below.
7. Keep responses concise but comprehensive. Use tables for comparisons when helpful.
8. For OTIF questions, use the OTIF Intelligence section below for exact rates, trends, and plant/buyer performance.
9. For any question about manufacturing, garments, supply chain — answer using your knowledge AND the data.

=== LIVE PRODUCTION DATA ===
{data_summary}

{search_results}

=== USER QUESTION ===
{question}

Respond now:"""
        )

        chain = prompt | llm
        result = chain.invoke({
            "data_summary": ENGINE.data_summary,
            "search_results": search_context,
            "question": user_question
        })

        return result.content

    except Exception as e:
        print(f"⚠️ LLM Error: {str(e)}")
        try:
            df = ENGINE.df
            if df.empty:
                return "⚠️ No production data available. Please check the data file."

            delayed = len(df[df['Risk_Status'] == 'DELAYED'])
            watchlist = len(df[df['Risk_Status'] == 'WATCHLIST'])
            on_track = len(df[df['Risk_Status'] == 'On Track'])
            total = len(df)

            return (
                f"### 📊 Production Status Summary\n\n"
                f"_(AI analysis temporarily unavailable. Here's the current data:)_\n\n"
                f"- **Total Active Orders:** {total}\n"
                f"- 🔴 **Critical Delays:** {delayed}\n"
                f"- 🟡 **Watchlist:** {watchlist}\n"
                f"- 🟢 **On Track:** {on_track}\n\n"
                f"_Please try again in a moment for detailed analysis._"
            )
        except Exception:
            return "⚠️ System is temporarily unavailable. Please try again."