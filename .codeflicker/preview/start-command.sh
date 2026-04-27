cd backend
source .venv/bin/activate
python -m uvicorn app.main:app --reload --port 8000
cd ../frontend
npm run dev -- --host 127.0.0.1