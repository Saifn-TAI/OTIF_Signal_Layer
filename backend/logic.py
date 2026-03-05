import pandas as pd
import json
import os
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional

# Configure Logging (Enterprise Standard: Don't just print errors)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ProductionRiskAnalyzer:
    def __init__(self, config_path: str = "business_rules.json", data_path: Optional[str] = None):
        """
        Initialize the analyzer by loading configuration and data paths.
        """
        self.base_dir = os.path.dirname(os.path.abspath(__file__))
        self.config = self._load_config(os.path.join(self.base_dir, config_path))
        
        # Use env variable for data path if not provided (Best Practice)
        if data_path:
            self.data_file_path = data_path
        else:
            self.data_file_path = os.getenv(
                "DATA_FILE_PATH", 
                os.path.join(self.base_dir, "..", "data", "raw_data.xlsx")
            )

    def _load_config(self, path: str) -> Dict[str, Any]:
        """Loads business rules from JSON. Fails gracefully if missing."""
        if not os.path.exists(path):
            logger.error(f"Configuration file not found: {path}")
            raise FileNotFoundError(f"Config file missing: {path}")
        
        with open(path, 'r') as f:
            logger.info("Business rules loaded successfully.")
            return json.load(f)

    def _get_stage_commentary(self, stage: str) -> str:
        """Fetches commentary from config, falling back to default."""
        templates = self.config.get("commentary_templates", {})
        return templates.get(stage, templates.get("default", "").format(stage=stage))

    def _generate_detailed_insight(self, current_stage: str, days_remaining: int, 
                                 risk_status: str, quantity: float, buyer: str) -> str:
        """
        Generates insight using loaded configuration rules.
        """
        # Load rules from config
        stage_order = self.config["stage_sequence"]
        lead_times = self.config["lead_times"]
        thresholds = self.config["thresholds"]

        # Calculate Progress
        stage_idx = stage_order.index(current_stage) if current_stage in stage_order else 0
        total_stages = len(stage_order) - 1
        progress_pct = round((stage_idx / total_stages) * 100) if total_stages > 0 else 0
        remaining_stages = stage_order[stage_idx + 1:] if stage_idx < total_stages else []
        days_needed = lead_times.get(current_stage, 10)

        lines = []

        # --- SECTION 1: Status Headline ---
        if risk_status == "DELAYED":
            overdue = abs(days_remaining)
            if overdue > thresholds["critical_delay_days"]:
                lines.append(f"🔴 **CRITICAL DELAY** — Overdue by **{overdue} days**.")
                lines.append("Significant delivery window breach. Executive intervention required.")
            elif overdue > thresholds["severe_delay_days"]:
                lines.append(f"🔴 **SEVERE DELAY** — Overdue by **{overdue} days**.")
                lines.append("Escalation imminent.")
            else:
                lines.append(f"🟠 **DELAYED** — Overdue by **{overdue} days**.")
                lines.append("Swift action needed.")

        elif risk_status == "POTENTIAL DELAY":
            gap = days_needed - days_remaining
            lines.append(f"⚠️ **AT RISK** — Buffer is **negative by {gap} days**.")

        elif risk_status == "WATCHLIST":
            buffer = days_remaining - days_needed
            lines.append(f"🟡 **WATCHLIST** — Thin safety buffer of **{max(0, buffer)} days**.")

        else:
            buffer = days_remaining - days_needed
            lines.append(f"✅ **ON TRACK** — Healthy buffer of **{buffer} days**.")

        # --- SECTION 2: Stage Analysis ---
        lines.append(f"\n📍 **Stage:** {current_stage} ({progress_pct}% complete)")
        if remaining_stages:
            lines.append(f"**Next →** {remaining_stages[0]} | **{len(remaining_stages)}** stages remaining")

        # --- SECTION 3: Dynamic Commentary ---
        lines.append(f"\n{self._get_stage_commentary(current_stage)}")

        # --- SECTION 4: Recommendations (Dynamic Logic) ---
        lines.append("\n**📋 Recommended Actions:**")
        if risk_status == "DELAYED":
            lines.append("• Escalate to production head")
            if overdue > thresholds["severe_delay_days"]:
                lines.append("• Prepare airship contingency plan")
        elif risk_status in ["POTENTIAL DELAY", "WATCHLIST"]:
            lines.append("• Increase monitoring to daily")
            if quantity > thresholds["bulk_quantity_split"]:
                lines.append(f"• Consider splitting the batch ({int(quantity):,} pcs)")
        else:
            lines.append("• Maintain current pace")

        return "\n".join(lines)

    def analyze_risk(self) -> List[Dict[str, Any]]:
        """
        Main execution method to process data and return risk analysis.
        """
        if not os.path.exists(self.data_file_path):
            logger.error(f"Data file missing: {self.data_file_path}")
            return [{"error": "Data file not found"}]

        try:
            df = pd.read_excel(self.data_file_path, header=1)  # Headers at row 2
            # Normalize column names
            df.columns = df.columns.str.strip()
        except Exception as e:
            logger.exception("Failed to read Excel file")
            return [{"error": str(e)}]

        # Parse dates and derive shipped status
        df['Ship_Date_Dt'] = pd.to_datetime(df['Ship Date'], errors='coerce')
        df['Delivery Date'] = pd.to_datetime(df['Delivery Date'], errors='coerce')
        
        # Filter to active orders: Ship Date is NaN or Ship Qty == 0
        open_orders = df[df['Ship_Date_Dt'].isna() | (df['Ship Quantity'] == 0)].copy()
        
        today = pd.to_datetime(datetime.now().date())
        
        results = []

        for _, row in open_orders.iterrows():
            if pd.isnull(row['Delivery Date']):
                continue

            days_remaining = (row['Delivery Date'] - today).days
            
            # Estimate stage from days remaining (no stage column in raw data)
            if days_remaining < 0:
                current_stage = 'Overdue'
            elif days_remaining <= 5:
                current_stage = 'Packing'
            elif days_remaining <= 10:
                current_stage = 'Quality Check'
            elif days_remaining <= 15:
                current_stage = 'Finishing'
            elif days_remaining <= 20:
                current_stage = 'Washing'
            elif days_remaining <= 30:
                current_stage = 'Sewing'
            elif days_remaining <= 40:
                current_stage = 'Cutting'
            else:
                current_stage = 'Material Inward'
            
            # Use Config for Lead Times
            days_needed = self.config["lead_times"].get(current_stage, 0)
            thresholds = self.config["thresholds"]

            # Risk Logic using Configured Thresholds
            if days_remaining < 0:
                risk_status = "DELAYED"
                risk_reason = f"Overdue by {abs(days_remaining)} days"
            elif days_remaining < days_needed:
                risk_status = "POTENTIAL DELAY"
                risk_reason = f"Buffer Negative"
            elif days_remaining < (days_needed + thresholds["watchlist_safety_buffer"]):
                risk_status = "WATCHLIST"
                risk_reason = "Buffer Low"
            else:
                risk_status = "On Track"
                risk_reason = "Normal Progress"

            # Generate Insight
            detailed_insight = self._generate_detailed_insight(
                current_stage, days_remaining, risk_status, 
                row.get("Quantity", 0), row.get("Buyer", "Unknown")
            )

            results.append({
                "SO_Number": row.get("Sales Invoice No", "N/A"),
                "Smart_ID": str(row.get("Buyer PO", "N/A")).strip(),
                "Customer": row.get("Buyer", "Unknown"),
                "Style": row.get("Style", "N/A"),
                "Plant": row.get("Plant", "N/A"),
                "Delivery_Date": row["Delivery Date"].strftime("%Y-%m-%d"),
                "Current_Status": current_stage,
                "Quantity": row.get("Quantity", 0),
                "Risk_Status": risk_status,
                "Risk_Reason": detailed_insight,
                "Days_Remaining": days_remaining
            })

        return results

# --- Entry Point for API ---
# This mimics your existing function call structure but uses the class
analyzer = ProductionRiskAnalyzer() 

# Cache results to avoid re-reading Excel on every 5-second poll
_cached_results = None

def analyze_risk():
    global _cached_results
    if _cached_results is None:
        logger.info("First call — computing risk analysis...")
        _cached_results = analyzer.analyze_risk()
        logger.info(f"Cached {len(_cached_results)} orders.")
    return _cached_results