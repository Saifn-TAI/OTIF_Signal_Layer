"""
OTIF Engine — KPI 1: Order Fulfillment Rate (On-Time In-Full)

Core intelligence module that:
1. Reads raw_data.xlsx and derives shipped/active status
2. Computes OTIF metrics for historical orders
3. Builds risk profiles per Plant, Buyer, Division, Season
4. Uses XGBoost ML model for breach probability scoring
5. Generates ML-driven explanations using feature contributions
6. Saves processed_data.xlsx with all computed columns
"""

import pandas as pd
import numpy as np
import json
import os
import logging
import joblib
from datetime import datetime
from typing import Dict, List, Any, Optional
from sklearn.preprocessing import LabelEncoder

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


class OTIFEngine:
    """
    The AI Agent for KPI 1 — Order Fulfillment Rate.
    Initialized once at module load. All results cached in memory.
    """

    def __init__(self):
        logger.info("🚀 OTIF Engine initializing...")

        # Load config
        config_path = os.path.join(BASE_DIR, "business_rules.json")
        with open(config_path, 'r') as f:
            self.config = json.load(f)

        # === LOAD ML MODEL ===
        self.ml_model = None
        self.ml_encoders = None
        self.ml_freq_maps = None
        self.ml_feature_names = None
        self._load_ml_model()

        # === STEP 1: Read the Data ===
        data_path = os.path.join(BASE_DIR, "..", "data", "order_sample_data.xlsx")
        logger.info(f"📄 Reading {data_path}...")
        self.df = pd.read_excel(data_path, header=0) 
        self.df.columns = self.df.columns.str.strip()

        # Normalize column names from the new dataset format to the expected format
        rename_map = {
            'Customer': 'Buyer',
            'Order Quantity': 'Quantity',
            'Ship Qty': 'Ship Quantity'
        }
        self.df.rename(columns=rename_map, inplace=True)

        logger.info(f"✅ Loaded {len(self.df)} rows × {len(self.df.columns)} columns")

        # Parse dates
        self.df['Delivery_Date_Dt'] = pd.to_datetime(self.df['Delivery Date'], errors='coerce')
        self.df['Ship_Date_Dt'] = pd.to_datetime(self.df['Ship Date'], errors='coerce')

        # === STEP 2: Split Into Two Piles ===
        self.df['Current_Status'] = np.where(
            self.df['Ship_Date_Dt'].notna() & (self.df['Ship Quantity'] > 0),
            'Shipped',
            'Not Shipped'
        )
        self.historical_df = self.df[self.df['Current_Status'] == 'Shipped'].copy()
        self.active_df = self.df[self.df['Current_Status'] == 'Not Shipped'].copy()
        logger.info(f"📊 Shipped: {len(self.historical_df)} | Active: {len(self.active_df)}")

        # === STEP 3: Study the History (OTIF Calculation) ===
        self._compute_otif()

        # === STEP 4: Learn Patterns ===
        self._build_profiles()

        # === STEP 5-7: ML-Powered Active Order Analysis ===
        self._analyze_active_orders()

        # === STEP 8: ML-Driven Explanations ===
        self._generate_explanations()

        # Save processed data
        self._save_processed_data()

        logger.info("✅ OTIF Engine ready (ML mode: {'ON' if self.ml_model else 'OFF'}).")

    # =========================================================================
    # ML Model Loader
    # =========================================================================
    def _load_ml_model(self):
        """Load trained XGBoost model, encoders, and feature config."""
        model_dir = os.path.join(BASE_DIR, "model")
        model_path = os.path.join(model_dir, "otif_xgb.joblib")
        enc_path = os.path.join(model_dir, "label_encoders.joblib")
        config_path = os.path.join(model_dir, "feature_config.json")

        try:
            self.ml_model = joblib.load(model_path)
            enc_data = joblib.load(enc_path)
            self.ml_encoders = enc_data['encoders']
            self.ml_freq_maps = enc_data['freq_maps']

            with open(config_path, 'r') as f:
                config = json.load(f)
            self.ml_feature_names = config['feature_names']

            report_path = os.path.join(model_dir, "training_report.json")
            if os.path.exists(report_path):
                with open(report_path, 'r') as f:
                    report = json.load(f)
                logger.info(f"🤖 ML Model loaded — AUC: {report.get('holdout_auc', 'N/A')}, F1: {report.get('holdout_f1', 'N/A')}")
            else:
                logger.info("🤖 ML Model loaded successfully")
        except Exception as e:
            logger.warning(f"⚠️ ML model not found ({e}). Falling back to rule-based scoring.")
            self.ml_model = None

    def _engineer_features_for_prediction(self, df):
        """Transform active orders into the feature matrix the ML model expects."""
        feat = pd.DataFrame(index=df.index)

        # Numeric
        feat['Quantity'] = df['Quantity'].fillna(0).astype(float)
        feat['USD_Value'] = df['USD Value'].fillna(0).astype(float)
        feat['Rate'] = df['Rate'].fillna(0).astype(float)

        # Engineered numeric
        feat['Log_Quantity'] = np.log1p(feat['Quantity'])
        feat['Is_Large_Order'] = (feat['Quantity'] > 3000).astype(int)
        feat['Is_High_Value'] = (feat['USD_Value'] > 15000).astype(int)

        # Date-derived
        dt = pd.to_datetime(df['Delivery Date'], errors='coerce')
        feat['Delivery_Month'] = dt.dt.month.fillna(6).astype(int)
        feat['Delivery_Quarter'] = dt.dt.quarter.fillna(2).astype(int)
        feat['Delivery_DayOfWeek'] = dt.dt.dayofweek.fillna(0).astype(int)

        # Frequency encoding
        feat['Buyer_Freq'] = df['Buyer'].map(self.ml_freq_maps['Buyer']).fillna(1).astype(int)
        feat['Plant_Freq'] = df['Plant'].map(self.ml_freq_maps['Plant']).fillna(1).astype(int)

        # Categorical encoding
        cat_features = ['Plant', 'Buyer', 'Division', 'Season', 'Gender', 'Customer Group', 'Brands']
        for col in cat_features:
            if col not in df.columns:
                feat[f'{col}_enc'] = 0
                continue
            series = df[col].astype(str).fillna('UNKNOWN')
            info = self.ml_encoders[col]
            series = series.apply(lambda x: 'OTHER' if x in info['rare_set'] else x)
            le = info['encoder']
            known = set(le.classes_)
            series = series.apply(lambda x: 'OTHER' if x not in known else x)
            feat[f'{col}_enc'] = le.transform(series)

        # Ensure column order matches training
        return feat[self.ml_feature_names]

    # =========================================================================
    # STEP 3: Historical OTIF Calculation
    # =========================================================================
    def _compute_otif(self):
        """Compute On-Time, In-Full, and OTIF flags for all shipped orders."""
        df = self.historical_df

        # On-Time: Ship Date <= Delivery Date
        df['Is_On_Time'] = df['Ship_Date_Dt'] <= df['Delivery_Date_Dt']

        # In-Full: Ship Quantity >= Quantity
        df['Is_In_Full'] = df['Ship Quantity'] >= df['Quantity']

        # OTIF: Both must be true
        df['Is_OTIF'] = df['Is_On_Time'] & df['Is_In_Full']

        # Days Late (0 if on time)
        df['Days_Late'] = (df['Ship_Date_Dt'] - df['Delivery_Date_Dt']).dt.days
        df['Days_Late'] = df['Days_Late'].clip(lower=0)

        # Fulfillment percentage
        df['Fulfillment_Pct'] = np.where(
            df['Quantity'] > 0,
            (df['Ship Quantity'] / df['Quantity'] * 100).round(1),
            100.0
        )

        # Monthly aggregation
        df['Delivery_Month'] = df['Delivery_Date_Dt'].dt.to_period('M')
        self.monthly_otif = df.groupby('Delivery_Month').agg(
            total=('Is_OTIF', 'size'),
            otif_pass=('Is_OTIF', 'sum'),
            ot_pass=('Is_On_Time', 'sum'),
            if_pass=('Is_In_Full', 'sum'),
            total_qty=('Quantity', 'sum'),
            avg_days_late=('Days_Late', 'mean')
        ).reset_index()

        self.monthly_otif['otif_rate'] = (self.monthly_otif['otif_pass'] / self.monthly_otif['total'] * 100).round(1)
        self.monthly_otif['ot_rate'] = (self.monthly_otif['ot_pass'] / self.monthly_otif['total'] * 100).round(1)
        self.monthly_otif['if_rate'] = (self.monthly_otif['if_pass'] / self.monthly_otif['total'] * 100).round(1)
        self.monthly_otif['month_str'] = self.monthly_otif['Delivery_Month'].dt.strftime('%b %Y')

        # Drop the non-serializable Period object column before saving/returning
        if 'Delivery_Month' in self.monthly_otif.columns:
            self.monthly_otif = self.monthly_otif.drop(columns=['Delivery_Month'])

        # Overall rates
        total = len(df)
        self.overall_otif = round(df['Is_OTIF'].sum() / total * 100, 1) if total > 0 else 0
        self.overall_ot = round(df['Is_On_Time'].sum() / total * 100, 1) if total > 0 else 0
        self.overall_if = round(df['Is_In_Full'].sum() / total * 100, 1) if total > 0 else 0

        logger.info(f"📈 OTIF: {self.overall_otif}% | OT: {self.overall_ot}% | IF: {self.overall_if}%")

    # =========================================================================
    # STEP 4: Pattern Profiler
    # =========================================================================
    def _build_profiles(self):
        """Build risk profiles per Plant, Buyer, Division, Season."""
        df = self.historical_df
        min_orders = self.config.get("profile_min_orders", 10)

        def build_profile(group_col):
            grouped = df.groupby(group_col).agg(
                total=('Is_OTIF', 'size'),
                otif_pass=('Is_OTIF', 'sum'),
                ot_pass=('Is_On_Time', 'sum')
            ).reset_index()
            # Only keep groups with enough data
            grouped = grouped[grouped['total'] >= min_orders]
            grouped['otif_rate'] = (grouped['otif_pass'] / grouped['total'] * 100).round(1)
            grouped['risk_score'] = ((1 - grouped['otif_pass'] / grouped['total'])).round(3)
            # Fix: extract dictionary correctly
            profile_dict = grouped[['otif_rate', 'risk_score', 'total']].set_index(grouped[group_col]).to_dict('index')
            return profile_dict

        self.plant_profiles = build_profile('Plant')
        self.buyer_profiles = build_profile('Buyer')
        self.division_profiles = build_profile('Division')
        self.season_profiles = build_profile('Season')

        logger.info(f"🔍 Profiles built — Plants: {len(self.plant_profiles)}, Buyers: {len(self.buyer_profiles)}, "
                     f"Divisions: {len(self.division_profiles)}, Seasons: {len(self.season_profiles)}")

    # =========================================================================
    # STEP 5-7: ML-Powered Active Order Analysis
    # =========================================================================
    def _analyze_active_orders(self):
        """Score active orders using XGBoost ML model (fallback: rule-based)."""
        df = self.active_df
        today = pd.to_datetime(datetime.now().date())
        lead_times = self.config['lead_times']

        # Calculate buffer (still needed for context)
        df['Days_Remaining'] = (df['Delivery_Date_Dt'] - today).dt.days

        def estimate_stage(days_rem):
            if days_rem < 0:    return 'Shipped'
            elif days_rem <= 5: return 'Packing'
            elif days_rem <= 10: return 'Quality Check'
            elif days_rem <= 15: return 'Finishing'
            elif days_rem <= 20: return 'Washing'
            elif days_rem <= 30: return 'Sewing'
            elif days_rem <= 40: return 'Cutting'
            else:               return 'Material Inward'

        df['Estimated_Stage'] = df['Days_Remaining'].apply(estimate_stage)
        df['Days_Needed'] = df['Estimated_Stage'].map(lead_times).fillna(10)
        df['Buffer'] = df['Days_Remaining'] - df['Days_Needed']

        if self.ml_model is not None:
            self._ml_score_orders(df)
        else:
            self._rule_score_orders(df)

        # Sort by breach score descending
        df.sort_values('Breach_Score', ascending=False, inplace=True)

        red = (df['Classification'] == 'RED').sum()
        yellow = (df['Classification'] == 'YELLOW').sum()
        green = (df['Classification'] == 'GREEN').sum()
        mode = 'ML' if self.ml_model else 'Rule'
        logger.info(f"🚦 [{mode}] Active orders — 🔴 {red} | 🟡 {yellow} | 🟢 {green}")

    def _ml_score_orders(self, df):
        """Use XGBoost predict_proba for breach scoring."""
        logger.info("🤖 Scoring with XGBoost ML model...")

        # Engineer features
        X = self._engineer_features_for_prediction(df)
        probs = self.ml_model.predict_proba(X.values)[:, 1]

        # Breach Score = probability × 100
        df['Breach_Score'] = (probs * 100).astype(int)

        # Classification from ML probability
        df['Classification'] = pd.cut(
            df['Breach_Score'],
            bins=[-1, 40, 60, 101],
            labels=['GREEN', 'YELLOW', 'RED']
        ).astype(str)

        # Store ML probability for explanations
        df['ML_Prob'] = probs

        # Profile lookups (still useful for explanations)
        df['Plant_OTIF'] = df['Plant'].map(
            lambda p: self.plant_profiles.get(p, {'otif_rate': self.overall_otif})['otif_rate']
        )
        df['Buyer_OTIF'] = df['Buyer'].map(
            lambda b: self.buyer_profiles.get(b, {'otif_rate': self.overall_otif})['otif_rate']
        )

        logger.info(f"   Mean breach score: {df['Breach_Score'].mean():.1f} | Max: {df['Breach_Score'].max()}")

    def _rule_score_orders(self, df):
        """Fallback rule-based scoring (used when ML model is not available)."""
        logger.info("📋 Scoring with rule-based system (ML model not loaded)...")
        thresholds = self.config.get('breach_thresholds', {})

        def classify_and_score(row):
            buffer = row['Buffer']
            days_rem = row['Days_Remaining']
            plant = row.get('Plant', '')
            buyer = row.get('Buyer', '')
            quantity = row.get('Quantity', 0)

            if days_rem < 0: base = 'RED'
            elif buffer < 0: base = 'RED'
            elif buffer < 10: base = 'YELLOW'
            else: base = 'GREEN'

            plant_profile = self.plant_profiles.get(plant, {'otif_rate': self.overall_otif, 'risk_score': 0.4, 'total': 0})
            buyer_profile = self.buyer_profiles.get(buyer, {'otif_rate': self.overall_otif, 'risk_score': 0.4, 'total': 0})
            upgrade_threshold = thresholds.get('profile_upgrade_threshold', 0.5)
            classification = base
            if plant_profile['risk_score'] > upgrade_threshold or buyer_profile['risk_score'] > upgrade_threshold:
                if base == 'GREEN': classification = 'YELLOW'
                elif base == 'YELLOW': classification = 'RED'

            # Breach score components
            buf_s = 40 if buffer < -14 else 35 if buffer < 0 else 25 if buffer < 5 else 15 if buffer < 10 else 8 if buffer < 20 else 3
            plant_otif = plant_profile['otif_rate']
            pl_s = 20 if plant_otif < 50 else 15 if plant_otif < 60 else 10 if plant_otif < 70 else 5
            buyer_otif = buyer_profile['otif_rate']
            by_s = 20 if buyer_otif < 50 else 15 if buyer_otif < 60 else 10 if buyer_otif < 70 else 5
            qt_s = 10 if quantity > 5000 else 7 if quantity > 2000 else 3
            ov_s = 10 if days_rem < -30 else 8 if days_rem < -14 else 5 if days_rem < 0 else 0

            return pd.Series({
                'Classification': classification,
                'Breach_Score': min(100, buf_s + pl_s + by_s + qt_s + ov_s),
                'Plant_OTIF': plant_otif,
                'Buyer_OTIF': buyer_otif,
            })

        scores = df.apply(classify_and_score, axis=1)
        for col in scores.columns:
            df[col] = scores[col]

    # =========================================================================
    # STEP 8: ML-Driven Explanation Generator
    # =========================================================================
    def _generate_explanations(self):
        """Generate explanations using ML feature contribution analysis."""
        df = self.active_df
        use_ml = self.ml_model is not None

        # Get feature importances for contribution-based explanations
        if use_ml:
            importances = dict(zip(self.ml_feature_names, self.ml_model.feature_importances_))
            X = self._engineer_features_for_prediction(df)

        def explain(row):
            factors = []
            actions = []
            classification = row['Classification']
            days_rem = row['Days_Remaining']
            buffer = row['Buffer']
            plant = row.get('Plant', 'Unknown')
            buyer = row.get('Buyer', 'Unknown')
            quantity = row.get('Quantity', 0)
            breach_score = int(row['Breach_Score'])
            plant_otif = row.get('Plant_OTIF', self.overall_otif)
            buyer_otif = row.get('Buyer_OTIF', self.overall_otif)

            if use_ml and breach_score > 40:
                # ML-driven explanation based on feature contributions
                if days_rem < 0:
                    factors.append(f"OVERDUE by {abs(int(days_rem))} days — delivery date has passed")
                elif buffer < 0:
                    factors.append(f"TIME DEFICIT — needs {int(row['Days_Needed'])}d but only {int(days_rem)}d remain")

                if plant_otif < 60:
                    factors.append(f"{plant} has {plant_otif}% historical OTIF (below average)")

                if buyer_otif < 60:
                    factors.append(f"{buyer} orders historically have {buyer_otif}% OTIF")

                if quantity > 3000:
                    factors.append(f"Large order ({int(quantity):,} pcs) increases delay risk")

                # Add ML confidence
                ml_prob = row.get('ML_Prob', breach_score / 100)
                factors.append(f"ML model predicts {ml_prob*100:.0f}% breach probability")
            else:
                # Rule-based or green orders
                if days_rem < 0:
                    factors.append(f"OVERDUE by {abs(int(days_rem))} days")
                elif buffer < 5 and buffer >= 0:
                    factors.append(f"Tight buffer — only {int(buffer)} days slack")
                if plant_otif < 60:
                    factors.append(f"{plant} has {plant_otif}% historical OTIF")

            # Recommended actions based on classification
            if classification == 'RED':
                actions.append("Escalate to production head for priority allocation")
                if days_rem < 0:
                    actions.append("Pre-alert buyer about delivery slip")
                if quantity > 5000:
                    actions.append("Consider partial shipment to protect buyer relationship")
                actions.append("Authorize overtime if production is still possible")
            elif classification == 'YELLOW':
                actions.append("Increase monitoring to daily status updates")
                actions.append("Identify bottleneck stage and allocate resources")
                if quantity > 5000:
                    actions.append(f"Consider splitting batch ({int(quantity):,} pcs)")

            why_text = " • ".join(factors) if factors else "Within acceptable parameters"
            action_text = " • ".join(actions) if actions else "Maintain current pace"

            status_icon = '🔴' if classification == 'RED' else '🟡' if classification == 'YELLOW' else '✅'
            source = 'ML' if use_ml else 'Rule'
            risk_reason = f"{status_icon} {classification} — Breach Score: {breach_score}% [{source}] • {why_text}"
            if classification != 'GREEN' and actions:
                risk_reason += f" • Actions: {action_text}"

            return pd.Series({
                'Why_Reasons': why_text,
                'Recommended_Actions': action_text,
                'Risk_Reason': risk_reason,
            })

        explanations = df.apply(explain, axis=1)
        for col in explanations.columns:
            df[col] = explanations[col]

    # =========================================================================
    # Save Processed Data
    # =========================================================================
    def _save_processed_data(self):
        """Save the enriched data as processed_data.xlsx."""
        output_path = os.path.join(BASE_DIR, "..", "data", "processed_data.xlsx")
        try:
            # Combine historical and active with computed columns
            combined = pd.concat([self.historical_df, self.active_df], ignore_index=True)
            # Drop datetime helper columns for clean output (keep original string dates)
            drop_cols = ['Delivery_Date_Dt', 'Ship_Date_Dt', 'Delivery_Month']
            combined.drop(columns=[c for c in drop_cols if c in combined.columns], inplace=True)
            combined.to_excel(output_path, index=False)
            logger.info(f"💾 Saved processed_data.xlsx ({len(combined)} rows)")
        except Exception as e:
            logger.error(f"Failed to save processed_data.xlsx: {e}")

    # =========================================================================
    # API GETTERS (served by FastAPI endpoints)
    # =========================================================================

    def get_otif_summary(self) -> Dict[str, Any]:
        """KPI Scorecards: Current OTIF, OT, IF rates + projected."""
        # Last 3 months trend
        recent = self.monthly_otif.tail(3)
        if len(recent) >= 2:
            trend = round(recent['otif_rate'].iloc[-1] - recent['otif_rate'].iloc[-2], 1)
        else:
            trend = 0.0

        # Projected: consider active orders' breach scores
        active_red_pct = (self.active_df['Classification'] == 'RED').mean() * 100
        # Projected OTIF = current OTIF adjusted by proportion of at-risk active orders
        projected = round(self.overall_otif * (1 - active_red_pct / 200), 1)  # Moderate pessimism

        return {
            "current_otif": self.overall_otif,
            "on_time_rate": self.overall_ot,
            "in_full_rate": self.overall_if,
            "projected_90d": projected,
            "trend_vs_last_month": trend,
            "total_shipped": len(self.historical_df),
            "total_active": len(self.active_df),
        }

    def get_monthly_trend(self) -> List[Dict[str, Any]]:
        """Monthly OTIF/OT/IF rates for trend chart."""
        result = []
        if type(self.monthly_otif) is pd.DataFrame and not self.monthly_otif.empty:
            for _, row in self.monthly_otif.iterrows():
                result.append({
                    "month_str": str(row['month_str']),
                    "otif_rate": float(row['otif_rate']),
                    "ot_rate": float(row['ot_rate']),
                    "if_rate": float(row['if_rate']),
                    "total_orders": int(row['total']),
                    "total_qty": int(row['total_qty']),
                })
        return result

    def get_risk_buckets(self) -> List[Dict[str, Any]]:
        """Active orders grouped by delivery window with Red/Yellow/Green counts."""
        df = self.active_df
        today = pd.to_datetime(datetime.now().date())

        buckets = [
            {"label": "Overdue", "min": -9999, "max": -1},
            {"label": "0-30 days", "min": 0, "max": 30},
            {"label": "30-60 days", "min": 31, "max": 60},
            {"label": "60-90 days", "min": 61, "max": 90},
            {"label": "90+ days", "min": 91, "max": 9999},
        ]

        result = []
        for bucket in buckets:
            mask = (df['Days_Remaining'] >= bucket['min']) & (df['Days_Remaining'] <= bucket['max'])
            subset = df[mask]
            result.append({
                "window": bucket['label'],
                "total": len(subset),
                "red": int((subset['Classification'] == 'RED').sum()),
                "yellow": int((subset['Classification'] == 'YELLOW').sum()),
                "green": int((subset['Classification'] == 'GREEN').sum()),
                "qty_at_risk": int(subset.loc[subset['Classification'] == 'RED', 'Quantity'].sum()),
            })
        return result

    def get_plant_heatmap(self) -> List[Dict[str, Any]]:
        """Per-plant data: active orders, red count, historical OTIF."""
        df = self.active_df
        result = []

        plant_active = df.groupby('Plant').agg(
            active_orders=('Breach_Score', 'size'),
            red_count=('Classification', lambda x: (x == 'RED').sum()),
            yellow_count=('Classification', lambda x: (x == 'YELLOW').sum()),
            green_count=('Classification', lambda x: (x == 'GREEN').sum()),
            avg_breach=('Breach_Score', 'mean'),
            total_qty=('Quantity', 'sum')
        ).reset_index()

        for _, row in plant_active.iterrows():
            plant = row['Plant']
            profile = self.plant_profiles.get(plant, {'otif_rate': self.overall_otif, 'total': 0})
            red_pct = round(row['red_count'] / row['active_orders'] * 100, 1) if row['active_orders'] > 0 else 0

            result.append({
                "plant": plant,
                "active_orders": int(row['active_orders']),
                "red_count": int(row['red_count']),
                "yellow_count": int(row['yellow_count']),
                "green_count": int(row['green_count']),
                "red_pct": red_pct,
                "historical_otif": profile['otif_rate'],
                "avg_breach_score": round(float(row['avg_breach']), 1),
                "total_qty": int(row['total_qty']),
            })

        # Sort by red count descending
        result.sort(key=lambda x: x['red_count'], reverse=True)
        return result

    def get_priority_orders(self, top_n: int = 20) -> List[Dict[str, Any]]:
        """Top N highest breach-score orders with explanations."""
        df = self.active_df.head(top_n)  # Already sorted by Breach_Score desc
        result = []

        for _, row in df.iterrows():
            result.append({
                "buyer_po": str(row.get('Buyer PO', 'N/A')),
                "buyer": row.get('Buyer', 'Unknown'),
                "plant": row.get('Plant', 'N/A'),
                "division": row.get('Division', 'N/A'),
                "season": row.get('Season', 'N/A'),
                "item": row.get('Item', 'N/A'),
                "delivery_date": row['Delivery_Date_Dt'].strftime('%Y-%m-%d') if pd.notna(row['Delivery_Date_Dt']) else 'N/A',
                "quantity": int(row.get('Quantity', 0)),
                "days_remaining": int(row['Days_Remaining']),
                "buffer": int(row['Buffer']),
                "estimated_stage": row.get('Estimated_Stage', 'Unknown'),
                "classification": row['Classification'],
                "breach_score": int(row['Breach_Score']),
                "why_reasons": row.get('Why_Reasons', ''),
                "recommended_actions": row.get('Recommended_Actions', ''),
                "risk_reason": row.get('Risk_Reason', ''),
            })
        return result

    def get_active_orders(self) -> List[Dict[str, Any]]:
        """All active orders for the orders table."""
        df = self.active_df
        result = []

        for _, row in df.iterrows():
            result.append({
                "Smart_ID": str(row.get('Buyer PO', 'N/A')).strip(),
                "Customer": row.get('Buyer', 'Unknown'),
                "Plant": row.get('Plant', 'N/A'),
                "Style": row.get('Style', 'N/A'),
                "Delivery_Date": row['Delivery_Date_Dt'].strftime('%Y-%m-%d') if pd.notna(row['Delivery_Date_Dt']) else 'N/A',
                "Current_Status": row.get('Estimated_Stage', 'Unknown'),
                "Quantity": int(row.get('Quantity', 0)),
                "Days_Remaining": int(row['Days_Remaining']),
                "Risk_Status": "DELAYED" if row['Classification'] == 'RED' else
                               "WATCHLIST" if row['Classification'] == 'YELLOW' else "On Track",
                "Risk_Reason": row.get('Risk_Reason', ''),
                "Breach_Score": int(row['Breach_Score']),
                "Classification": row['Classification'],
                "Buyer": row.get('Buyer', 'Unknown'),
                "Division": row.get('Division', 'N/A'),
                "Season": row.get('Season', 'N/A'),
            })
        return result

    def get_otif_context_for_chatbot(self) -> str:
        """Generate OTIF context string to inject into chatbot LLM prompt."""
        summary = self.get_otif_summary()
        df = self.active_df

        lines = [
            "=== OTIF INTELLIGENCE (KPI 1: Order Fulfillment Rate) ===",
            f"Current OTIF Rate: {summary['current_otif']}%",
            f"On-Time Rate: {summary['on_time_rate']}%",
            f"In-Full Rate: {summary['in_full_rate']}%",
            f"Projected 90-Day OTIF: {summary['projected_90d']}%",
            f"Total Shipped Orders (historical): {summary['total_shipped']}",
            f"Total Active Orders: {summary['total_active']}",
            "",
            "--- Active Order Risk Breakdown ---",
            f"🔴 RED (High Risk): {(df['Classification'] == 'RED').sum()} orders",
            f"🟡 YELLOW (Moderate): {(df['Classification'] == 'YELLOW').sum()} orders",
            f"🟢 GREEN (On Track): {(df['Classification'] == 'GREEN').sum()} orders",
            "",
            "--- Monthly OTIF Trend ---",
        ]

        for _, row in self.monthly_otif.iterrows():
            lines.append(f"  {row['month_str']}: OTIF {row['otif_rate']}% | OT {row['ot_rate']}% | IF {row['if_rate']}% ({int(row['total'])} orders)")

        # Plant profiles
        lines.append("")
        lines.append("--- Plant Performance Profiles ---")
        for plant, profile in sorted(self.plant_profiles.items(), key=lambda x: x[1]['otif_rate']):
            lines.append(f"  {plant}: OTIF {profile['otif_rate']}% ({profile['total']} historical orders)")

        # Buyer profiles (top 15 worst)
        lines.append("")
        lines.append("--- Buyer Performance (Bottom 15) ---")
        sorted_buyers = sorted(self.buyer_profiles.items(), key=lambda x: x[1]['otif_rate'])[:15]
        for buyer, profile in sorted_buyers:
            lines.append(f"  {buyer}: OTIF {profile['otif_rate']}% ({profile['total']} orders)")

        # Top 10 priority orders for chatbot reference
        lines.append("")
        lines.append("--- Top 10 Priority Orders (Highest Breach Risk) ---")
        for order in self.get_priority_orders(10):
            lines.append(f"  PO {order['buyer_po']} | {order['buyer']} | {order['plant']} | "
                        f"Due {order['delivery_date']} | Buffer {order['buffer']}d | "
                        f"Breach {order['breach_score']}% | {order['classification']}")

        # Active orders with delivery dates for month-based queries
        lines.append("")
        lines.append("--- Active Orders by Delivery Month ---")
        month_counts = df.groupby(df['Delivery_Date_Dt'].dt.strftime('%B %Y')).agg(
            total=('Breach_Score', 'size'),
            red=('Classification', lambda x: (x == 'RED').sum()),
            total_qty=('Quantity', 'sum')
        )
        for month, row in month_counts.iterrows():
            lines.append(f"  {month}: {int(row['total'])} orders ({int(row['red'])} RED), {int(row['total_qty']):,} pcs")

        return "\n".join(lines)

    # =========================================================================
    # KPI 2 — Forward Delivery Risk (30 / 60 / 90 Day Window)
    # =========================================================================
    def get_kpi2_forecast(self, window_days: int = 90) -> dict:
        """
        KPI 2: Forward delivery risk for orders due within the next N days.
        Uses existing buffer analysis + plant/buyer risk profiles.
        window_days: 30, 60, or 90
        """
        today = pd.to_datetime('today').normalize()
        cutoff = today + pd.Timedelta(days=window_days)

        df = self.active_df.copy()
        df = df[df['Delivery_Date_Dt'] <= cutoff].copy()

        total = len(df)
        red_count   = int((df['Classification'] == 'RED').sum())
        yellow_count = int((df['Classification'] == 'YELLOW').sum())
        green_count  = int((df['Classification'] == 'GREEN').sum())

        # Risk rate
        at_risk = red_count + yellow_count
        risk_pct = round((at_risk / total * 100), 1) if total > 0 else 0
        avg_score = round(float(df['Breach_Score'].mean()), 1) if total > 0 else 0

        # Week-by-week breakdown
        weekly = []
        for w in range(0, window_days, 7):
            week_start = today + pd.Timedelta(days=w)
            week_end   = today + pd.Timedelta(days=w + 7)
            week_df = df[(df['Delivery_Date_Dt'] >= week_start) & (df['Delivery_Date_Dt'] < week_end)]
            weekly.append({
                "week_label": f"Wk {w // 7 + 1} ({week_start.strftime('%d %b')})",
                "total": int(len(week_df)),
                "red":    int((week_df['Classification'] == 'RED').sum()),
                "yellow": int((week_df['Classification'] == 'YELLOW').sum()),
                "green":  int((week_df['Classification'] == 'GREEN').sum()),
                "avg_score": round(float(week_df['Breach_Score'].mean()), 1) if len(week_df) else 0,
            })

        # Top 10 at-risk orders in window
        top_orders = df.nlargest(10, 'Breach_Score')[[
            'Buyer PO', 'Buyer', 'Plant', 'Delivery_Date_Dt',
            'Days_Remaining', 'Breach_Score', 'Classification', 'Quantity'
        ]].copy()
        top_list = []
        for _, row in top_orders.iterrows():
            top_list.append({
                "po": str(row.get('Buyer PO', '')).strip(),
                "buyer": row.get('Buyer', '—'),
                "plant": row.get('Plant', '—'),
                "delivery_date": row['Delivery_Date_Dt'].strftime('%Y-%m-%d') if pd.notna(row['Delivery_Date_Dt']) else '—',
                "days_remaining": int(row['Days_Remaining']),
                "breach_score": int(row['Breach_Score']),
                "classification": row['Classification'],
                "quantity": int(row.get('Quantity', 0)),
            })

        # Plant breakdown in window
        plant_risk = []
        for plant, grp in df.groupby('Plant'):
            plant_risk.append({
                "plant": str(plant),
                "total": int(len(grp)),
                "red": int((grp['Classification'] == 'RED').sum()),
                "avg_score": round(float(grp['Breach_Score'].mean()), 1),
            })
        plant_risk.sort(key=lambda x: x['red'], reverse=True)

        return {
            "window_days": window_days,
            "total_in_window": total,
            "red_count": red_count,
            "yellow_count": yellow_count,
            "green_count": green_count,
            "at_risk_pct": risk_pct,
            "avg_breach_score": avg_score,
            "weekly_breakdown": weekly,
            "top_at_risk": top_list,
            "plant_risk": plant_risk[:10],
        }

    def get_kpi2_projected_trend(self) -> list:
        """
        Project OTIF trend for each future month based on active orders
        and their breach probability. Returns monthly projected OTIF rate.
        """
        df = self.active_df.copy()
        today = pd.to_datetime('today').normalize()

        # Group by delivery month
        df['Delivery_Month'] = df['Delivery_Date_Dt'].dt.to_period('M')
        result = []

        for period, grp in df.groupby('Delivery_Month'):
            total = len(grp)
            avg_score = float(grp['Breach_Score'].mean())
            # Projected OTIF = 100 - weighted avg breach probability
            projected_otif = round(100 - avg_score, 1)
            result.append({
                "month": str(period),
                "month_str": period.strftime('%b %Y'),
                "total_orders": total,
                "avg_breach_score": round(avg_score, 1),
                "projected_otif": max(0, min(100, projected_otif)),
                "red": int((grp['Classification'] == 'RED').sum()),
                "yellow": int((grp['Classification'] == 'YELLOW').sum()),
            })

        # Also include last 3 months of historical OTIF for comparison
        hist = self.monthly_otif.copy()
        hist_result = []
        for _, row in hist.tail(6).iterrows():
            hist_result.append({
                "month_str": row['month_str'],
                "otif_rate": float(row['otif_rate']),
                "type": "historical",
            })

        return {
            "projected": sorted(result, key=lambda x: x['month']),
            "historical": hist_result,
        }

    # =========================================================================
    # KPI 3 — Upstream Lead Time Risk (Production Pressure Score)
    # =========================================================================
    def get_kpi3_lead_time_risk(self) -> dict:
        """
        KPI 3: Upstream risk based on whether the order has enough
        production lead time given its current stage and days remaining.
        Uses business_rules.json lead_times to compute required lead time.
        """
        df = self.active_df.copy()
        today = pd.to_datetime('today').normalize()

        # Required lead times from business rules
        lead_times = self.config.get('lead_times', {
            'Material Inward': 40, 'Cutting': 30, 'Sewing': 20,
            'Washing': 15, 'Finishing': 10, 'Packing': 5, 'Quality Check': 3,
        })
        stage_commentary = self.config.get('commentary_templates', {})

        # Stages that indicate order is essentially complete — no production risk
        COMPLETED_STAGES = {'Shipped', 'Dispatched', 'Delivered', 'Completed'}

        def compute_lead_time_risk(row):
            stage = row.get('Estimated_Stage', 'Material Inward')
            days_rem = row.get('Days_Remaining', 0)
            required = lead_times.get(stage, 30)
            gap = days_rem - required  # positive = has buffer, negative = overdue

            # Orders that are shipped/dispatched/completed have NO production risk
            if stage in COMPLETED_STAGES:
                return 2, max(gap, 0), 0

            # Packing stage: very low risk since production is essentially done
            if stage == 'Packing':
                if gap < 0:
                    score = min(30, 15 + abs(gap))  # slight pressure if very late
                else:
                    score = 5
                return int(score), int(gap), required

            # Risk score: 0 = no risk, 100 = critical
            if gap < 0:
                score = min(100, 60 + abs(gap) * 2)  # Already past needed time
            elif gap < 5:
                score = 55  # Borderline
            elif gap < 10:
                score = 35
            elif gap < 20:
                score = 15
            else:
                score = 5
            return int(score), int(gap), required

        rows = []
        for _, row in df.iterrows():
            score, gap, required = compute_lead_time_risk(row)
            cls = 'RED' if score >= 55 else 'YELLOW' if score >= 30 else 'GREEN'
            rows.append({
                "po": str(row.get('Buyer PO', '')).strip(),
                "buyer": row.get('Buyer', '—'),
                "plant": row.get('Plant', '—'),
                "stage": row.get('Estimated_Stage', 'Unknown'),
                "days_remaining": int(row.get('Days_Remaining', 0)),
                "required_days": required,
                "lead_time_gap": gap,
                "pressure_score": score,
                "classification": cls,
                "delivery_date": row['Delivery_Date_Dt'].strftime('%Y-%m-%d') if pd.notna(row['Delivery_Date_Dt']) else '—',
                "quantity": int(row.get('Quantity', 0)),
                "stage_comment": stage_commentary.get(row.get('Estimated_Stage', ''), ''),
            })

        result_df = pd.DataFrame(rows)
        total = len(rows)
        red = int((result_df['classification'] == 'RED').sum())
        yellow = int((result_df['classification'] == 'YELLOW').sum())
        green = int((result_df['classification'] == 'GREEN').sum())

        # Stage distribution
        stage_dist = result_df.groupby('stage').agg(
            total=('po', 'count'),
            red=('classification', lambda x: (x == 'RED').sum()),
            avg_score=('pressure_score', 'mean'),
        ).reset_index()
        stage_list = [
            {
                "stage": r['stage'],
                "total": int(r['total']),
                "red": int(r['red']),
                "avg_score": round(float(r['avg_score']), 1),
            }
            for _, r in stage_dist.iterrows()
        ]
        # Sort by stage sequence
        seq = ['Material Inward', 'Cutting', 'Sewing', 'Washing', 'Finishing', 'Quality Check', 'Packing']
        stage_list.sort(key=lambda x: seq.index(x['stage']) if x['stage'] in seq else 99)

        # Top 20 highest pressure orders
        top = sorted(rows, key=lambda x: x['pressure_score'], reverse=True)[:20]

        # Plant pressure summary
        plant_pressure = result_df.groupby('plant').agg(
            total=('po', 'count'),
            red=('classification', lambda x: (x == 'RED').sum()),
            avg_score=('pressure_score', 'mean'),
        ).reset_index()
        plant_list = sorted([
            {"plant": r['plant'], "total": int(r['total']), "red": int(r['red']),
             "avg_score": round(float(r['avg_score']), 1)}
            for _, r in plant_pressure.iterrows()
        ], key=lambda x: x['red'], reverse=True)[:10]

        return {
            "total": total,
            "red_count": red,
            "yellow_count": yellow,
            "green_count": green,
            "at_risk_pct": round((red + yellow) / total * 100, 1) if total else 0,
            "stage_distribution": stage_list,
            "top_pressure_orders": top,
            "plant_pressure": plant_list,
        }


# =========================================================================
# Module-level initialization (runs once when imported)
# =========================================================================
logger.info("=" * 60)
logger.info("OTIF ENGINE — Initializing...")
logger.info("=" * 60)
otif_engine = OTIFEngine()
