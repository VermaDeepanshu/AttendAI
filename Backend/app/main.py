from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import Base, engine
from app.models import models
from app.routes import auth, admin, teacher
from app.utils.seed import seed_admin
import os

# Create all tables
Base.metadata.create_all(bind=engine)

# Seed admin on startup
seed_admin()

app = FastAPI(title="AttendAI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files
uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(teacher.router)

@app.get("/")
def root():
    return {"message": "AttendAI Backend Running"}