from app.database import SessionLocal
from app.models.models import User
from app.utils.auth import hash_password

def seed_admin():
    db = SessionLocal()
    existing = db.query(User).filter(User.username == "admin@classroom.com").first()
    if not existing:
        admin = User(
            username="admin@classroom.com",
            password_hash=hash_password("Admin123"),
            role="admin"
        )
        db.add(admin)
        db.commit()
        print("✅ Admin seeded successfully")
    db.close()