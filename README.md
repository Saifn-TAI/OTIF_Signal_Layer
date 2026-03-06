# TAI Signal Layer

An AI-powered insights and operations dashboard with an integrated conversational AI agent.

## Quick Start (For Windows)

We have provided automated scripts to make running this project as simple as a single double-click.

### Prerequisites
Before running, ensure you have the following installed on your machine:
1. **Python 3.9+** (Make sure to check "Add Python to PATH" during installation)
2. **Node.js 18+** (LTS version recommended)
3. **Git** (Optional, to clone the repo)

---

### Step 1: Install Dependencies
Double-click the **`setup.bat`** file in the root folder.
This script will automatically:
- Create an isolated Python virtual environment (`venv`).
- Install all backend AI/data dependencies (`pandas`, `fastapi`, `xgboost`, `langchain`, etc.).
- Install all frontend React dependencies (`npm install`).

*You only need to run this once.*

### Step 2: Start the Servers
Double-click the **`run.bat`** file in the root folder.
This script will simultaneously:
- Launch the FastAPI Backend on Port `8000`.
- Launch the Vite/React Frontend on Port `5173`.

A browser window will open automatically, or you can navigate to `http://localhost:5173`.

---

## Manual Execution (Mac/Linux)

If you are not on Windows, follow these manual steps from the terminal:

### 1. Start the Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### 2. Start the Frontend
Open a **new** terminal window:
```bash
cd frontend
npm install
npm run dev
```

---

## Important Configuration
- **API Keys**: Ensure your `.env` file in the `backend` directory contains a valid `GROQ_API_KEY` for the AI Chat to function.
- **Business Rules**: Production rules and lead times are dictated by `backend/business_rules.json`. These can be modified directly in the UI under **Settings**.
