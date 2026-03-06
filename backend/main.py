from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from logic import analyze_risk
from agent import query_data
from otif_engine import otif_engine
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os, json

# Load env vars on startup
load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

from typing import Optional, List, Dict

# Define the Chat Request format
class ChatRequest(BaseModel):
    question: str
    history: Optional[List[Dict[str, str]]] = []

@app.get("/")
def home():
    return {"message": "TAI Signal Layer AI is Running"}

@app.get("/api/orders")
def get_orders():
    # Use OTIF engine for enriched active orders
    data = otif_engine.get_active_orders()
    return {"data": data}

# --- KPI 1: OTIF Endpoints ---

@app.get("/api/kpi/otif-summary")
def get_otif_summary():
    """KPI scorecards: Current OTIF%, OT%, IF%, projected rate."""
    return otif_engine.get_otif_summary()

@app.get("/api/kpi/otif-trend")
def get_otif_trend():
    """Monthly OTIF/OT/IF rates for trend chart."""
    return otif_engine.get_monthly_trend()

@app.get("/api/kpi/risk-buckets")
def get_risk_buckets():
    """Active orders by delivery window with Red/Yellow/Green counts."""
    return otif_engine.get_risk_buckets()

@app.get("/api/kpi/plant-heatmap")
def get_plant_heatmap():
    """Per-plant data: active orders, red count, historical OTIF."""
    return otif_engine.get_plant_heatmap()

@app.get("/api/kpi/priority-orders")
def get_priority_orders():
    """Top 20 highest-breach-score orders with explanations."""
    return otif_engine.get_priority_orders(20)

@app.get("/api/kpi/model-report")
def get_model_report():
    """Serve real ML training report from disk."""
    path = os.path.join(BASE_DIR, "model", "training_report.json")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Training report not found. Run train_model.py first.")
    with open(path, "r") as f:
        return json.load(f)

@app.get("/api/kpi/business-rules")
def get_business_rules():
    """Serve business rules config from disk."""
    path = os.path.join(BASE_DIR, "business_rules.json")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Business rules file not found.")
    with open(path, "r") as f:
        return json.load(f)

@app.post("/api/kpi/business-rules")
def update_business_rules(payload: dict):
    """Save new business rules and trigger a live reload of the analytics engines."""
    path = os.path.join(BASE_DIR, "business_rules.json")
    try:
        with open(path, "w") as f:
            json.dump(payload, f, indent=4)
            
        print("🔄 Business Rules updated. Reloading analytics engines...")
        # Reload the OTIF Engine and Agent context here
        otif_engine.__init__() 
        import agent
        agent.ENGINE.__init__()
        
        return {"status": "success", "message": "Business rules updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save rules: {str(e)}")

@app.post("/api/system/retrain")
def trigger_model_retrain():
    """Trigger the XGBoost ML model retraining script asynchronously."""
    import subprocess
    script_path = os.path.join(BASE_DIR, "train_model.py")
    try:
        # Run in background to not block the request
        subprocess.Popen(["python", script_path], cwd=BASE_DIR)
        return {"status": "success", "message": "ML Model training started in the background."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start training: {str(e)}")

@app.get("/api/system/info")
def get_system_info():
    """System metadata: data size, last reload, active orders count."""
    try:
        summary = otif_engine.get_otif_summary()
        active = summary.get("total_active", 0)
        shipped = summary.get("total_shipped", 0)
    except Exception:
        active, shipped = 0, 0
    return {
        "active_orders": active,
        "shipped_orders": shipped,
        "backend_version": "1.0.0",
        "ml_model": "XGBoost (binary:logistic)",
        "data_source": "raw_data.xlsx"
    }

@app.get("/api/kpi/forecast")
def get_kpi2_forecast(window: int = 90):
    """KPI 2: Forward delivery risk filtered to 30/60/90-day window."""
    window = window if window in (30, 60, 90) else 90
    return otif_engine.get_kpi2_forecast(window_days=window)

@app.get("/api/kpi/projected-trend")
def get_kpi2_trend():
    """KPI 2: Historical OTIF + projected OTIF per upcoming month."""
    return otif_engine.get_kpi2_projected_trend()

@app.get("/api/kpi/lead-time-risk")
def get_kpi3_lead_time_risk():
    """KPI 3: Upstream production pressure scoring per order."""
    return otif_engine.get_kpi3_lead_time_risk()

# AI Chat Endpoint
@app.post("/api/chat")
def chat_with_data(request: ChatRequest):
    if not request.question:
        raise HTTPException(status_code=400, detail="No question provided")
    
    print(f"🤖 User asked: {request.question}")
    answer = query_data(request.question, request.history)
    print(f"💡 AI answered: {answer}")
    
    return {"answer": answer}

# To Run: uvicorn main:app --reload