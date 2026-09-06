# Rural Healthcare Access & Referral Platform

A prototype platform designed to improve healthcare access and referrals in rural areas.

## Tech Stack
- **Backend:** Django, Django REST Framework, PostgreSQL
- **Frontend:** React + TypeScript (Vite)

## Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL database

## Backend Setup

1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Create and activate the virtual environment (if not already done):
   ```bash
   python -m venv venv
   # Windows
   .\venv\Scripts\activate
   # Mac/Linux
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure your environment variables. Copy `.env.example` to `backend/.env` and update the values:
   ```bash
   cp ../.env.example .env
   ```
5. Run migrations and start the server:
   ```bash
   python manage.py migrate
   python manage.py runserver
   ```

## Frontend Setup

1. Navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```

## API Reference
- **Health Check:** `GET /api/v1/health/` - Returns `{"status": "ok"}` if the backend is successfully connected.
