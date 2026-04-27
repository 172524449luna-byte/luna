# EventMaster AI

活动策划生成应用，前端使用 React + Vite（Node.js），后端使用 FastAPI（Python）。

## 目录结构

- `backend/`：Python API，负责链式策划生成
- `frontend/`：Node.js 前端，负责输入表单与结果展示

## 启动后端

```bash
cd /Users/luna/EventMasterAI/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## 启动前端

```bash
cd /Users/luna/EventMasterAI/frontend
npm install
npm run dev
```

前端默认地址：`http://127.0.0.1:5173`

后端默认地址：`http://127.0.0.1:8000`
