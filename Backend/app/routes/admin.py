from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from app.database import get_db
from app.models.models import (
    Teacher, User, Subject, ClassSection, Schedule,
    Student, StudentSubject, FaceEncoding
)
from app.utils.auth import hash_password, verify_password, require_admin, create_access_token
from app.ai.face_service import encode_student_image
import random, string, os, json, shutil, tempfile, zipfile
import pandas as pd

router = APIRouter(prefix="/admin", tags=["Admin"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ─── Helpers ────────────────────────────────────────────────────────────────

def generate_credentials(name: str):
    username = name.lower().replace(" ", ".") + "@classroom.com"
    password = ''.join(random.choices(string.ascii_letters + string.digits, k=10))
    return username, password

def get_or_create_subject(db: Session, name: str, code: str = None):
    name = name.strip()
    if not name:
        return None
    subj = db.query(Subject).filter(Subject.name == name).first()
    if not subj:
        if not code:
            code = name[:3].upper() + str(random.randint(100, 999))
        existing = db.query(Subject).filter(Subject.code == code).first()
        if existing:
            code = code + str(random.randint(10, 99))
        subj = Subject(name=name, code=code)
        db.add(subj)
        db.flush()
    return subj

def get_or_create_class(db: Session, name: str, section: str = None):
    name = name.strip()
    if not name:
        return None
    q = db.query(ClassSection).filter(ClassSection.name == name)
    if section:
        q = q.filter(ClassSection.section == section.strip())
    cls = q.first()
    if not cls:
        cls = ClassSection(name=name, section=section.strip() if section else None)
        db.add(cls)
        db.flush()
    return cls

# ─── Teacher Management ─────────────────────────────────────────────────────

class AddTeacherRequest(BaseModel):
    name: str

class EditTeacherRequest(BaseModel):
    name: str

@router.post("/teachers")
def add_teacher(data: AddTeacherRequest, db: Session = Depends(get_db), _=Depends(require_admin)):
    username, raw_password = generate_credentials(data.name)
    count = db.query(User).filter(User.username.like(f"{username.split('@')[0]}%")).count()
    if count > 0:
        username = username.split('@')[0] + str(count) + "@classroom.com"

    user = User(username=username, password_hash=hash_password(raw_password), role="teacher")
    db.add(user)
    db.flush()

    teacher = Teacher(user_id=user.id, name=data.name, raw_password=raw_password)
    db.add(teacher)
    db.commit()

    return {
        "message": "Teacher added",
        "username": username,
        "password": raw_password,
        "teacher_id": teacher.id
    }

@router.get("/teachers")
def get_teachers(db: Session = Depends(get_db), _=Depends(require_admin)):
    teachers = db.query(Teacher).all()
    result = []
    for t in teachers:
        schedules = db.query(Schedule).filter(Schedule.teacher_id == t.id).all()
        subjects = list({s.subject.name for s in schedules if s.subject})
        classes = list({f"{s.class_section.name} {s.class_section.section or ''}".strip()
                        for s in schedules if s.class_section})
        result.append({
            "id": t.id,
            "name": t.name,
            "username": t.user.username if t.user else "",
            "password": t.raw_password or "(not available)",
            "subjects": subjects,
            "classes": classes,
            "has_schedule": len(schedules) > 0
        })
    return result

@router.put("/teachers/{teacher_id}")
def edit_teacher(teacher_id: int, data: EditTeacherRequest,
                 db: Session = Depends(get_db), _=Depends(require_admin)):
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    teacher.name = data.name
    db.commit()
    return {"message": "Teacher updated"}

@router.delete("/teachers/{teacher_id}")
def delete_teacher(teacher_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    # Delete schedules
    db.query(Schedule).filter(Schedule.teacher_id == teacher.id).delete()
    user_id = teacher.user_id
    db.delete(teacher)
    if user_id:
        db.query(User).filter(User.id == user_id).delete()
    db.commit()
    return {"message": "Teacher deleted"}

# ─── Schedule Management ────────────────────────────────────────────────────

@router.post("/teachers/{teacher_id}/schedule")
async def upload_schedule(teacher_id: int, file: UploadFile = File(...),
                          db: Session = Depends(get_db), _=Depends(require_admin)):
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    # Save uploaded file temporarily
    suffix = os.path.splitext(file.filename)[1].lower()
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        # Parse file
        if suffix in ['.xlsx', '.xls']:
            df = pd.read_excel(tmp_path)
        elif suffix == '.csv':
            df = pd.read_csv(tmp_path)
        elif suffix == '.pdf':
            # Use PyMuPDF to extract tables from PDF
            import fitz
            doc = fitz.open(tmp_path)
            all_text = ""
            for page in doc:
                all_text += page.get_text()
            doc.close()
            # Try to parse as CSV-like text
            import io
            lines = [l.strip() for l in all_text.strip().split('\n') if l.strip()]
            if len(lines) < 2:
                raise HTTPException(status_code=400, detail="Could not parse PDF schedule")
            # Try tab or comma separated
            header = lines[0]
            sep = '\t' if '\t' in header else ','
            csv_text = '\n'.join(lines)
            df = pd.read_csv(io.StringIO(csv_text), sep=sep)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Use Excel, CSV, or PDF.")

        # Normalize column names
        df.columns = [c.strip().lower().replace(' ', '_') for c in df.columns]

        # Expected columns: day, time (or time_start/time_end), subject, class (or class/section)
        required = {'day', 'subject'}
        if not required.issubset(set(df.columns)):
            raise HTTPException(
                status_code=400,
                detail=f"File must contain columns: day, subject. Found: {list(df.columns)}"
            )

        # Delete old schedule for this teacher
        db.query(Schedule).filter(Schedule.teacher_id == teacher_id).delete()

        for _, row in df.iterrows():
            day = str(row.get('day', '')).strip()
            subject_name = str(row.get('subject', '')).strip()
            class_name = str(row.get('class', row.get('class_section', row.get('section', '')))).strip()
            if class_name == 'nan':
                class_name = ''

            # Parse time
            time_str = str(row.get('time', row.get('time_start', ''))).strip()
            time_end_str = str(row.get('time_end', '')).strip()

            from datetime import time as dt_time
            time_start = None
            time_end = None
            if time_str and time_str != 'nan':
                # Handle formats like "9:00-10:00" or "09:00"
                if '-' in time_str:
                    parts = time_str.split('-')
                    time_str = parts[0].strip()
                    time_end_str = parts[1].strip()
                try:
                    h, m = time_str.replace(' ', '').split(':')
                    time_start = dt_time(int(h), int(m))
                except Exception:
                    pass
            if time_end_str and time_end_str != 'nan':
                try:
                    h, m = time_end_str.replace(' ', '').split(':')
                    time_end = dt_time(int(h), int(m))
                except Exception:
                    pass

            if not day or not subject_name or day == 'nan' or subject_name == 'nan':
                continue

            subject = get_or_create_subject(db, subject_name)
            class_section = None
            if class_name:
                # Parse "10-A" or "10 A" or "Class 10"
                sec = None
                if '-' in class_name:
                    parts = class_name.split('-')
                    class_name = parts[0].strip()
                    sec = parts[1].strip() if len(parts) > 1 else None
                class_section = get_or_create_class(db, class_name, sec)

            schedule = Schedule(
                teacher_id=teacher_id,
                subject_id=subject.id if subject else None,
                class_id=class_section.id if class_section else None,
                day=day,
                time_start=time_start,
                time_end=time_end
            )
            db.add(schedule)

        db.commit()
        return {"message": "Schedule uploaded successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing file: {str(e)}")
    finally:
        os.unlink(tmp_path)

@router.get("/teachers/{teacher_id}/schedule")
def get_teacher_schedule(teacher_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    schedules = db.query(Schedule).filter(Schedule.teacher_id == teacher_id).all()
    result = []
    for s in schedules:
        result.append({
            "id": s.id,
            "day": s.day,
            "time_start": str(s.time_start) if s.time_start else None,
            "time_end": str(s.time_end) if s.time_end else None,
            "subject": s.subject.name if s.subject else "",
            "subject_id": s.subject_id,
            "class_name": s.class_section.name if s.class_section else "",
            "section": s.class_section.section if s.class_section else "",
            "class_id": s.class_id
        })
    return result

# ─── Student Management ─────────────────────────────────────────────────────

@router.post("/students/upload")
async def upload_students(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _=Depends(require_admin)
):
    """
    Upload a ZIP file containing:
    - students.csv (or .xlsx) with columns: name, roll_number, class, section (optional), subjects
    - images/ folder with images named by roll_number (e.g., STU001.jpg)
    """
    suffix = os.path.splitext(file.filename)[1].lower()
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        extract_dir = tempfile.mkdtemp()
        added = 0
        errors = []

        if suffix == '.zip':
            with zipfile.ZipFile(tmp_path, 'r') as zf:
                zf.extractall(extract_dir)
        else:
            # If just a CSV/Excel is uploaded (no images)
            shutil.copy(tmp_path, os.path.join(extract_dir, file.filename))

        # Find the CSV/Excel file
        data_file = None
        for root, dirs, files in os.walk(extract_dir):
            for f in files:
                if f.lower().endswith(('.csv', '.xlsx', '.xls')) and not f.startswith('~'):
                    data_file = os.path.join(root, f)
                    break
            if data_file:
                break

        if not data_file:
            raise HTTPException(status_code=400, detail="No CSV or Excel file found in upload")

        if data_file.endswith('.csv'):
            df = pd.read_csv(data_file)
        else:
            df = pd.read_excel(data_file)

        df.columns = [c.strip().lower().replace(' ', '_') for c in df.columns]

        if 'name' not in df.columns or 'roll_number' not in df.columns:
            raise HTTPException(
                status_code=400,
                detail=f"File must contain 'name' and 'roll_number' columns. Found: {list(df.columns)}"
            )

        # Find images directory
        images_dir = None
        for root, dirs, files in os.walk(extract_dir):
            for d in dirs:
                if d.lower() in ['images', 'photos', 'imgs']:
                    images_dir = os.path.join(root, d)
                    break
            if images_dir:
                break

        student_upload_dir = os.path.join(UPLOAD_DIR, "students")
        os.makedirs(student_upload_dir, exist_ok=True)

        for _, row in df.iterrows():
            name = str(row['name']).strip()
            roll = str(row['roll_number']).strip()

            if name == 'nan' or roll == 'nan':
                continue

            # Check if student already exists
            existing = db.query(Student).filter(Student.roll_number == roll).first()
            if existing:
                errors.append(f"Student {roll} already exists, skipping")
                continue

            # Get/create class
            class_name = str(row.get('class', '')).strip()
            section = str(row.get('section', '')).strip()
            if class_name == 'nan':
                class_name = ''
            if section == 'nan':
                section = ''
            class_section = None
            if class_name:
                class_section = get_or_create_class(db, class_name, section if section else None)

            # Find and save image
            image_path = None
            if images_dir:
                for ext in ['.jpg', '.jpeg', '.png', '.bmp']:
                    candidate = os.path.join(images_dir, f"{roll}{ext}")
                    if os.path.exists(candidate):
                        dest = os.path.join(student_upload_dir, f"{roll}{ext}")
                        shutil.copy(candidate, dest)
                        image_path = f"uploads/students/{roll}{ext}"
                        break

            student = Student(
                name=name,
                roll_number=roll,
                image_path=image_path,
                class_id=class_section.id if class_section else None
            )
            db.add(student)
            db.flush()

            # Handle subjects
            subjects_str = str(row.get('subjects', '')).strip()
            if subjects_str and subjects_str != 'nan':
                for subj_name in subjects_str.split(','):
                    subj = get_or_create_subject(db, subj_name.strip())
                    if subj:
                        ss = StudentSubject(student_id=student.id, subject_id=subj.id)
                        db.add(ss)

            # Generate face encoding if image exists
            if image_path:
                full_path = os.path.join(
                    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                    image_path
                )
                try:
                    encoding = encode_student_image(full_path)
                    if encoding:
                        fe = FaceEncoding(
                            student_id=student.id,
                            encoding=json.dumps(encoding)
                        )
                        db.add(fe)
                except Exception as e:
                    errors.append(f"Face encoding failed for {roll}: {str(e)}")

            added += 1

        db.commit()
        shutil.rmtree(extract_dir, ignore_errors=True)
        return {
            "message": f"Successfully added {added} students",
            "added": added,
            "errors": errors
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing upload: {str(e)}")
    finally:
        os.unlink(tmp_path)

@router.get("/students")
def get_students(subject_id: Optional[int] = None, db: Session = Depends(get_db),
                 _=Depends(require_admin)):
    query = db.query(Student)
    if subject_id:
        student_ids = [ss.student_id for ss in
                       db.query(StudentSubject).filter(StudentSubject.subject_id == subject_id).all()]
        query = query.filter(Student.id.in_(student_ids))

    students = query.all()
    result = []
    for s in students:
        # Get subjects
        ss_records = db.query(StudentSubject).filter(StudentSubject.student_id == s.id).all()
        subjects = []
        for ss in ss_records:
            subj = db.query(Subject).filter(Subject.id == ss.subject_id).first()
            if subj:
                subjects.append({"id": subj.id, "name": subj.name})

        result.append({
            "id": s.id,
            "name": s.name,
            "roll_number": s.roll_number,
            "image_path": s.image_path,
            "class_name": s.class_section.name if s.class_section else "",
            "section": s.class_section.section if s.class_section else "",
            "subjects": subjects,
            "has_encoding": len(s.face_encodings) > 0
        })
    return result

@router.get("/subjects")
def get_subjects(db: Session = Depends(get_db), _=Depends(require_admin)):
    subjects = db.query(Subject).all()
    return [{"id": s.id, "name": s.name, "code": s.code} for s in subjects]

# ─── Admin Credentials ──────────────────────────────────────────────────────

class ChangeCredentialsRequest(BaseModel):
    old_password: str
    new_username: Optional[str] = None
    new_password: Optional[str] = None

@router.put("/credentials")
def change_credentials(data: ChangeCredentialsRequest,
                       db: Session = Depends(get_db),
                       current_user: dict = Depends(require_admin)):
    user = db.query(User).filter(User.id == int(current_user["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not verify_password(data.old_password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect current password")

    if data.new_username and data.new_username.strip():
        # Check uniqueness
        existing = db.query(User).filter(
            User.username == data.new_username.strip(),
            User.id != user.id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")
        user.username = data.new_username.strip()

    if data.new_password and data.new_password.strip():
        user.password_hash = hash_password(data.new_password.strip())

    db.commit()

    # Generate new token
    new_token = create_access_token({"sub": str(user.id), "role": user.role})
    return {"message": "Credentials updated", "access_token": new_token}

# ─── Dashboard Stats ────────────────────────────────────────────────────────

@router.get("/dashboard/stats")
def dashboard_stats(db: Session = Depends(get_db), _=Depends(require_admin)):
    from app.models.models import Attendance, AttendanceRecord
    from sqlalchemy import func
    from datetime import date, timedelta

    total_attendance = db.query(Attendance).count()

    # Attendance trend: last 7 days
    trend = []
    for i in range(6, -1, -1):
        d = date.today() - timedelta(days=i)
        count = db.query(AttendanceRecord).join(Attendance).filter(
            Attendance.date == d,
            AttendanceRecord.status == "Present"
        ).count()
        trend.append({"date": str(d), "present": count})

    return {
        "total_students": db.query(Student).count(),
        "total_teachers": db.query(Teacher).count(),
        "total_subjects": db.query(Subject).count(),
        "total_classes": db.query(ClassSection).count(),
        "total_attendance_sessions": total_attendance,
        "attendance_trend": trend
    }