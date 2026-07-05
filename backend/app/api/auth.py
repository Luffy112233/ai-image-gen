"""User authentication and authorization."""

from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import JWTError, jwt
import sqlite3
import os

# ── Config ──────────────────────────────────────────────────
SECRET_KEY = "your-secret-key-change-in-production"  # TODO: load from env
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# ── Database ────────────────────────────────────────────────
DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "users.db")
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)


def get_db():
    """Get database connection."""
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def init_db():
    """Initialize user tables."""
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            hashed_password TEXT NOT NULL,
            username TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT 1
        )
    """)
    conn.commit()
    conn.close()


# ── Models ──────────────────────────────────────────────────
class UserCreate(BaseModel):
    email: str
    password: str
    username: str


class UserLogin(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class User(BaseModel):
    id: int
    email: str
    username: str
    created_at: str
    is_active: bool


# ── Helpers ─────────────────────────────────────────────────
def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme), db=Depends(get_db)):
    """Extract current user from JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = int(payload.get("sub"))
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if user is None:
        raise credentials_exception
    return dict(user)


# ── Routes ──────────────────────────────────────────────────
@router.post("/register")
async def register(user_data: UserCreate, db=Depends(get_db)):
    """Register a new user."""
    # Check if email exists
    existing = db.execute("SELECT id FROM users WHERE email = ?", (user_data.email,)).fetchone()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Insert user
    hashed = hash_password(user_data.password)
    cur = db.execute(
        "INSERT INTO users (email, hashed_password, username) VALUES (?, ?, ?)",
        (user_data.email, hashed, user_data.username),
    )
    db.commit()
    
    return {"message": "User created successfully", "user_id": cur.lastrowid}


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db=Depends(get_db)):
    """Login and get JWT token."""
    user = db.execute("SELECT * FROM users WHERE email = ?", (form_data.username,)).fetchone()
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": str(user["id"])})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=User)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user info."""
    return current_user
