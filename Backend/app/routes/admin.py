from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.models import Teacher, User, Subject, ClassSection, Schedule, Student
from app.utils.auth import hash_password
import random, string

router = APIRouter(prefix="/admin", tags=["Admin"])

def generate_credentials(name: str):
    username = name.lower().replace(" ", ".") + "@classroom.com"
    password = ''.join(random.choices(string.ascii_letters + string.digits, k=10))
    return username, password

class AddTeacherRequest(BaseModel):
    name: str

@router.post("/teachers")
def add_teacher(data: AddTeacherRequest, db: Session = Depends(get_db)):
    username, raw_password = generate_credentials(data.name)
    # ensure unique username
    count = db.query(User).filter(User.username.like(f"{username.split('@')[0]}%")).count()
    if count > 0:
        username = username.split('@')[0] + str(count) + "@classroom.com"
    
    user = User(username=username, password_hash=hash_password(raw_password), role="teacher")
    db.add(user)
    db.flush()
    
    teacher = Teacher(user_id=user.id, name=data.name)
    db.add(teacher)
    db.commit()
    
    return {
        "message": "Teacher added",
        "username": username,
        "password": raw_password,  # Show once, save externally
        "teacher_id": teacher.id
    }

@router.get("/teachers")
def get_teachers(db: Session = Depends(get_db)):
    teachers = db.query(Teacher).all()
    result = []
    for t in teachers:
        result.append({
            "id": t.id,
            "name": t.name,
            "username": t.user.username if t.user else ""
        })
    return result

@router.delete("/teachers/{teacher_id}")
def delete_teacher(teacher_id: int, db: Session = Depends(get_db)):
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    db.query(User).filter(User.id == teacher.user_id).delete()
    db.delete(teacher)
    db.commit()
    return {"message": "Teacher deleted"}

@router.get("/dashboard/stats")
def dashboard_stats(db: Session = Depends(get_db)):
    return {
        "total_students": db.query(Student).count(),
        "total_teachers": db.query(Teacher).count(),
        "total_subjects": db.query(Subject).count(),
        "total_classes": db.query(ClassSection).count()
    }