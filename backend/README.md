# AI Image Gen Backend

## Setup

```bash
# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Copy env file
copy .env.example .env  # Windows
# cp .env.example .env  # Linux/Mac

# Run development server
uvicorn app.main:app --reload --port 8000
```

## API Endpoints

- `GET /health` - Health check
- `GET /docs` - Swagger UI (auto-generated)
