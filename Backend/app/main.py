from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.models import models
from app.routes import auth, admin
from app.utils.seed import seed_admin

# Create all tables
Base.metadata.create_all(bind=engine)

# Seed admin on startup
seed_admin()

app = FastAPI(title="AttendAI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)

@app.get("/")
def root():
    return {"message": "AttendAI Backend Running"}