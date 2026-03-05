"""
train_model.py — XGBoost OTIF Prediction Model
================================================
Reads raw_data.xlsx → engineers features → trains XGBoost with 5-fold CV
→ generates SHAP explainer → saves everything to backend/model/

Usage:
    python train_model.py

Output:
    model/otif_xgb.joblib          — trained model
    model/label_encoders.joblib    — fitted encoders
    model/feature_config.json      — feature names & metadata
    model/training_report.json     — metrics, confusion matrix
"""

import os
import json
import logging
import numpy as np
import pandas as pd
import joblib
from datetime import datetime

from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import (
    roc_auc_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report
)
from xgboost import XGBClassifier

logging.basicConfig(level=logging.INFO, format='%(message)s')
log = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "..", "data", "order_sample_data.xlsx")
MODEL_DIR = os.path.join(BASE_DIR, "model")

# ─── Feature configuration ───
CATEGORICAL_FEATURES = ['Plant', 'Buyer', 'Division', 'Season', 'Gender', 'Customer Group', 'Brands']
NUMERIC_FEATURES = ['Quantity', 'USD_Value', 'Rate']
ENGINEERED_FEATURES = ['Delivery_Month', 'Delivery_Quarter', 'Delivery_DayOfWeek',
                        'Is_Large_Order', 'Is_High_Value', 'Log_Quantity',
                        'Buyer_Freq', 'Plant_Freq']
RARE_THRESHOLD = 20  # groups with < 20 orders → "OTHER"


def load_and_prepare():
    """Step 1: Load data, split shipped/active, create target variable."""
    log.info("=" * 60)
    log.info("STEP 1: Loading & Preparing Data")
    log.info("=" * 60)

    df = pd.read_excel(DATA_PATH, header=0)
    df.columns = df.columns.str.strip()

    # Normalize column names from the new dataset format to the expected format
    rename_map = {
        'Customer': 'Buyer',
        'Order Quantity': 'Quantity',
        'Ship Qty': 'Ship Quantity'
    }
    df.rename(columns=rename_map, inplace=True)

    log.info(f"  📄 Loaded {len(df)} rows × {len(df.columns)} columns")

    # Parse dates
    df['Delivery_Dt'] = pd.to_datetime(df['Delivery Date'], errors='coerce')
    df['Ship_Dt'] = pd.to_datetime(df['Ship Date'], errors='coerce')

    # Split: shipped (has Ship Date + Ship Qty > 0) vs active
    shipped = df[df['Ship_Dt'].notna() & (df['Ship Quantity'] > 0)].copy()
    active = df[df['Ship_Dt'].isna()].copy()
    log.info(f"  📦 Shipped: {len(shipped)} | Active: {len(active)}")

    # === TARGET VARIABLE ===
    # Is_Late: Ship Date > Delivery Date
    shipped['Is_Late'] = (shipped['Ship_Dt'] > shipped['Delivery_Dt']).astype(int)
    # Is_Short: Ship Quantity < Quantity
    shipped['Is_Short'] = (shipped['Ship Quantity'] < shipped['Quantity']).astype(int)
    # OTIF_Fail: either late or short
    shipped['OTIF_Fail'] = ((shipped['Is_Late'] == 1) | (shipped['Is_Short'] == 1)).astype(int)

    late_pct = shipped['Is_Late'].mean() * 100
    short_pct = shipped['Is_Short'].mean() * 100
    fail_pct = shipped['OTIF_Fail'].mean() * 100
    log.info(f"  🎯 Target distribution:")
    log.info(f"     Late:      {shipped['Is_Late'].sum():,} ({late_pct:.1f}%)")
    log.info(f"     Short:     {shipped['Is_Short'].sum():,} ({short_pct:.1f}%)")
    log.info(f"     OTIF Fail: {shipped['OTIF_Fail'].sum():,} ({fail_pct:.1f}%)")
    log.info(f"     OTIF Pass: {(~shipped['OTIF_Fail'].astype(bool)).sum():,} ({100-fail_pct:.1f}%)")

    return shipped, active


def engineer_features(df, fit_mode=True, encoders=None, freq_maps=None):
    """Step 2: Feature engineering — categoricals, numerics, derived features."""
    log.info("=" * 60)
    log.info("STEP 2: Feature Engineering")
    log.info("=" * 60)

    feat = pd.DataFrame(index=df.index)

    # --- Numeric features ---
    feat['Quantity'] = df['Quantity'].fillna(0).astype(float)
    feat['USD_Value'] = df['USD Value'].fillna(0).astype(float)
    feat['Rate'] = df['Rate'].fillna(0).astype(float)

    # --- Engineered numeric features ---
    feat['Log_Quantity'] = np.log1p(feat['Quantity'])
    feat['Is_Large_Order'] = (feat['Quantity'] > 3000).astype(int)
    feat['Is_High_Value'] = (feat['USD_Value'] > 15000).astype(int)

    # --- Date-derived features ---
    if 'Delivery_Dt' in df.columns:
        feat['Delivery_Month'] = df['Delivery_Dt'].dt.month.fillna(6).astype(int)
        feat['Delivery_Quarter'] = df['Delivery_Dt'].dt.quarter.fillna(2).astype(int)
        feat['Delivery_DayOfWeek'] = df['Delivery_Dt'].dt.dayofweek.fillna(0).astype(int)
    elif 'Delivery Date' in df.columns:
        dt = pd.to_datetime(df['Delivery Date'], errors='coerce')
        feat['Delivery_Month'] = dt.dt.month.fillna(6).astype(int)
        feat['Delivery_Quarter'] = dt.dt.quarter.fillna(2).astype(int)
        feat['Delivery_DayOfWeek'] = dt.dt.dayofweek.fillna(0).astype(int)

    # --- Frequency encoding (how often does this buyer/plant appear?) ---
    if fit_mode:
        freq_maps = {}
        for col in ['Buyer', 'Plant']:
            freq_maps[col] = df[col].value_counts().to_dict()
    feat['Buyer_Freq'] = df['Buyer'].map(freq_maps['Buyer']).fillna(1).astype(int)
    feat['Plant_Freq'] = df['Plant'].map(freq_maps['Plant']).fillna(1).astype(int)

    # --- Categorical features (Label Encoding) ---
    if fit_mode:
        encoders = {}

    for col in CATEGORICAL_FEATURES:
        if col not in df.columns:
            feat[f'{col}_enc'] = 0
            continue

        series = df[col].astype(str).fillna('UNKNOWN')

        # Group rare categories
        if fit_mode:
            counts = series.value_counts()
            rare = set(counts[counts < RARE_THRESHOLD].index)
            series = series.apply(lambda x: 'OTHER' if x in rare else x)

            le = LabelEncoder()
            le.fit(series)
            encoders[col] = {'encoder': le, 'rare_set': rare}
        else:
            info = encoders[col]
            series = series.apply(lambda x: 'OTHER' if x in info['rare_set'] else x)
            le = info['encoder']
            # Handle unseen categories at inference time
            known = set(le.classes_)
            series = series.apply(lambda x: 'OTHER' if x not in known else x)

        feat[f'{col}_enc'] = le.transform(series)

    feature_names = list(feat.columns)
    log.info(f"  ✅ Engineered {len(feature_names)} features:")
    for f in feature_names:
        log.info(f"     • {f}")

    return feat, encoders, freq_maps, feature_names


def train_model(X, y, feature_names):
    """Step 3: Train XGBoost with 5-fold stratified CV + holdout evaluation."""
    log.info("=" * 60)
    log.info("STEP 3: Training XGBoost")
    log.info("=" * 60)

    # Train/test split (80/20)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    log.info(f"  📊 Train: {len(X_train)} | Test: {len(X_test)}")

    # Class weight ratio
    pos_weight = (y_train == 0).sum() / max((y_train == 1).sum(), 1)
    log.info(f"  ⚖️  Scale pos weight: {pos_weight:.2f}")

    # Shared hyperparams
    xgb_params = dict(
        n_estimators=500,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=20,
        scale_pos_weight=pos_weight,
        eval_metric='auc',
        random_state=42,
        verbosity=0,
        n_jobs=-1,
    )

    # === 5-fold Stratified Cross Validation (NO early stopping — sklearn doesn't pass eval_set) ===
    log.info("  🔄 Running 5-fold stratified cross-validation...")
    cv_model = XGBClassifier(**xgb_params)
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(cv_model, X_train, y_train, cv=cv, scoring='roc_auc')
    log.info(f"  📈 CV AUC-ROC: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")
    log.info(f"     Fold scores: {[round(s, 4) for s in cv_scores]}")

    # === Final training WITH early stopping (uses holdout eval_set) ===
    log.info("  🚀 Training final model with early stopping...")
    model = XGBClassifier(**xgb_params, early_stopping_rounds=30)
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False
    )
    log.info(f"  ⏹️  Best iteration: {model.best_iteration} / 500")

    # === Holdout Evaluation ===
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    y_pred = (y_pred_proba >= 0.5).astype(int)

    auc = roc_auc_score(y_test, y_pred_proba)
    precision = precision_score(y_test, y_pred)
    recall = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    cm = confusion_matrix(y_test, y_pred)

    log.info(f"\n  ═══ HOLDOUT RESULTS ═══")
    log.info(f"  AUC-ROC:   {auc:.4f}")
    log.info(f"  Precision: {precision:.4f}")
    log.info(f"  Recall:    {recall:.4f}")
    log.info(f"  F1 Score:  {f1:.4f}")
    log.info(f"  Confusion Matrix:")
    log.info(f"    TN={cm[0][0]:,}  FP={cm[0][1]:,}")
    log.info(f"    FN={cm[1][0]:,}  TP={cm[1][1]:,}")

    # Feature importance (top 10)
    importance = dict(zip(feature_names, model.feature_importances_))
    top_features = sorted(importance.items(), key=lambda x: x[1], reverse=True)[:10]
    log.info(f"\n  🏆 Top 10 Feature Importances:")
    for fname, imp in top_features:
        bar = '█' * int(imp * 100)
        log.info(f"     {fname:25s} {imp:.4f} {bar}")

    metrics = {
        'cv_auc_mean': round(float(cv_scores.mean()), 4),
        'cv_auc_std': round(float(cv_scores.std()), 4),
        'cv_fold_scores': [round(float(s), 4) for s in cv_scores],
        'holdout_auc': round(float(auc), 4),
        'holdout_precision': round(float(precision), 4),
        'holdout_recall': round(float(recall), 4),
        'holdout_f1': round(float(f1), 4),
        'confusion_matrix': cm.tolist(),
        'feature_importance': {k: round(float(v), 4) for k, v in top_features},
        'train_size': len(X_train),
        'test_size': len(X_test),
        'pos_weight': round(float(pos_weight), 2),
    }

    return model, metrics


def build_shap_explanations(model, X_sample, feature_names):
    """Step 4: Build SHAP explainer for per-order explanations."""
    log.info("=" * 60)
    log.info("STEP 4: Building SHAP Explainer")
    log.info("=" * 60)

    try:
        import shap
        # Ensure float64 arrays for SHAP compatibility
        bg = np.array(X_sample[:200], dtype=np.float64) if len(X_sample) > 200 else np.array(X_sample, dtype=np.float64)

        # Try TreeExplainer first (fastest), fall back to Explainer
        try:
            explainer = shap.TreeExplainer(model)
            log.info(f"  ✅ SHAP TreeExplainer built (model-only, no background)")
        except Exception:
            explainer = shap.Explainer(model, bg)
            log.info(f"  ✅ SHAP Explainer built with {len(bg)} background samples")

        # Quick test: explain 3 samples
        test_input = np.array(X_sample[:3], dtype=np.float64)
        test_shap = explainer.shap_values(test_input)
        log.info(f"  🔍 Sample SHAP output shape: {np.array(test_shap).shape}")
        log.info(f"  📊 Sample explanation for row 0:")
        for i, fname in enumerate(feature_names):
            sv = float(test_shap[0][i])
            if abs(sv) > 0.01:
                direction = "↑ risk" if sv > 0 else "↓ safe"
                log.info(f"     {fname:25s} SHAP={sv:+.3f} ({direction})")

        return explainer
    except Exception as e:
        log.warning(f"  ⚠️ SHAP failed: {e}. Model will work without per-order explanations.")
        return None


def save_artifacts(model, encoders, freq_maps, feature_names, metrics, explainer):
    """Step 5: Save everything to backend/model/."""
    log.info("=" * 60)
    log.info("STEP 5: Saving Model Artifacts")
    log.info("=" * 60)

    os.makedirs(MODEL_DIR, exist_ok=True)

    # 1. Model
    model_path = os.path.join(MODEL_DIR, "otif_xgb.joblib")
    joblib.dump(model, model_path)
    size_kb = os.path.getsize(model_path) / 1024
    log.info(f"  💾 Model → {model_path} ({size_kb:.0f} KB)")

    # 2. Encoders
    enc_path = os.path.join(MODEL_DIR, "label_encoders.joblib")
    joblib.dump({'encoders': encoders, 'freq_maps': freq_maps}, enc_path)
    log.info(f"  💾 Encoders → {enc_path}")

    # 3. Feature config
    config_path = os.path.join(MODEL_DIR, "feature_config.json")
    config = {
        'feature_names': feature_names,
        'categorical_features': CATEGORICAL_FEATURES,
        'numeric_features': NUMERIC_FEATURES,
        'engineered_features': ENGINEERED_FEATURES,
        'rare_threshold': RARE_THRESHOLD,
        'trained_at': datetime.now().isoformat(),
        'data_path': DATA_PATH,
    }
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2)
    log.info(f"  💾 Feature config → {config_path}")

    # 4. Training report
    report_path = os.path.join(MODEL_DIR, "training_report.json")
    metrics['trained_at'] = datetime.now().isoformat()
    with open(report_path, 'w') as f:
        json.dump(metrics, f, indent=2)
    log.info(f"  💾 Training report → {report_path}")

    # 5. SHAP explainer (optional)
    if explainer is not None:
        shap_path = os.path.join(MODEL_DIR, "shap_explainer.joblib")
        joblib.dump(explainer, shap_path)
        size_kb = os.path.getsize(shap_path) / 1024
        log.info(f"  💾 SHAP explainer → {shap_path} ({size_kb:.0f} KB)")

    log.info(f"\n  ✅ All artifacts saved to {MODEL_DIR}/")


def main():
    log.info("\n" + "🤖 OTIF XGBoost Model Training Pipeline".center(60))
    log.info("=" * 60 + "\n")

    # Step 1: Load & prepare
    shipped, active = load_and_prepare()

    # Step 2: Feature engineering
    X, encoders, freq_maps, feature_names = engineer_features(shipped, fit_mode=True)
    y = shipped['OTIF_Fail'].values

    log.info(f"  📐 Feature matrix: {X.shape[0]} rows × {X.shape[1]} columns")
    log.info(f"  🎯 Target: {y.sum():,} positive / {(~y.astype(bool)).sum():,} negative\n")

    # Step 3: Train
    model, metrics = train_model(X.values, y, feature_names)

    # Step 4: SHAP
    explainer = build_shap_explanations(model, X.values, feature_names)

    # Step 5: Save
    save_artifacts(model, encoders, freq_maps, feature_names, metrics, explainer)

    # === BONUS: Score active orders as a preview ===
    log.info("=" * 60)
    log.info("BONUS: Scoring Active Orders (Preview)")
    log.info("=" * 60)

    X_active, _, _, _ = engineer_features(active, fit_mode=False, encoders=encoders, freq_maps=freq_maps)
    active_probs = model.predict_proba(X_active.values)[:, 1]
    active_scores = (active_probs * 100).astype(int)

    red = (active_scores > 60).sum()
    yellow = ((active_scores > 40) & (active_scores <= 60)).sum()
    green = (active_scores <= 40).sum()

    log.info(f"  📊 Active orders scored: {len(active_scores):,}")
    log.info(f"     🔴 RED (>60):    {red:,}")
    log.info(f"     🟡 YELLOW (40-60): {yellow:,}")
    log.info(f"     🟢 GREEN (<40):  {green:,}")
    log.info(f"     Mean score:      {active_scores.mean():.1f}")
    log.info(f"     Max score:       {active_scores.max()}")
    log.info(f"     Min score:       {active_scores.min()}")

    log.info("\n" + "✅ Training complete!".center(60))
    log.info("=" * 60)


if __name__ == "__main__":
    main()
