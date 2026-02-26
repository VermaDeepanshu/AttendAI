from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from app.database import get_db
from app.models.models import (
    Teacher, User, Subject, ClassSection, Schedule,
    Student, StudentSubject, FaceEncoding,
    Attendance, AttendanceRecord
)
from app.utils.auth import require_teacher
from app.ai.face_service import process_video
from datetime import date, time as dt_time, datetime
import os, tempfile, json

router = APIRouter(prefix="/teacher", tags=["Teacher"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")

def get_teacher_from_token(current_user: dict, db: Session):
    """Get Teacher record from JWT payload."""
    user_id = int(current_user["sub"])
    teacher = db.query(Teacher).filter(Teacher.user_id == user_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    return teacher

# ─── Dashboard ──────────────────────────────────────────────────────────────

@router.get("/dashboard")
def teacher_dashboard(db: Session = Depends(get_db), current_user: dict = Depends(require_teacher)):
    teacher = get_teacher_from_token(current_user, db)
    schedules = db.query(Schedule).filter(Schedule.teacher_id == teacher.id).all()

    subjects = list({s.subject.name for s in schedules if s.subject})
    classes = list({f"{s.class_section.name} {s.class_section.section or ''}".strip()
                    for s in schedules if s.class_section})

    # Today's schedule
    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    today = day_names[date.today().weekday()]
    today_schedule = []
    for s in schedules:
        if s.day == today:
            today_schedule.append({
                "subject": s.subject.name if s.subject else "",
                "class_name": f"{s.class_section.name} {s.class_section.section or ''}".strip() if s.class_section else "",
                "time_start": str(s.time_start) if s.time_start else "",
                "time_end": str(s.time_end) if s.time_end else "",
            })

    # Total lectures taken
    total_lectures = db.query(Attendance).filter(Attendance.teacher_id == teacher.id).count()

    return {
        "name": teacher.name,
        "subjects": subjects,
        "classes": classes,
        "total_lectures": total_lectures,
        "today_schedule": today_schedule,
        "total_schedule_entries": len(schedules)
    }

# ─── Schedule ───────────────────────────────────────────────────────────────

@router.get("/schedule")
def get_schedule(db: Session = Depends(get_db), current_user: dict = Depends(require_teacher)):
    teacher = get_teacher_from_token(current_user, db)
    schedules = db.query(Schedule).filter(Schedule.teacher_id == teacher.id).all()

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

# ─── Attendance Filters ─────────────────────────────────────────────────────

@router.get("/attendance/filters")
def get_attendance_filters(db: Session = Depends(get_db),
                           current_user: dict = Depends(require_teacher)):
    teacher = get_teacher_from_token(current_user, db)
    schedules = db.query(Schedule).filter(Schedule.teacher_id == teacher.id).all()

    subjects = {}
    classes = {}
    days = set()

    for s in schedules:
        if s.subject:
            subjects[s.subject_id] = s.subject.name
        if s.class_section:
            classes[s.class_id] = f"{s.class_section.name} {s.class_section.section or ''}".strip()
        if s.day:
            days.add(s.day)

    return {
        "subjects": [{"id": k, "name": v} for k, v in subjects.items()],
        "classes": [{"id": k, "name": v} for k, v in classes.items()],
        "days": sorted(list(days))
    }

# ─── Get Students for Attendance ────────────────────────────────────────────

@router.get("/attendance/students")
def get_students_for_attendance(
    subject_id: int,
    class_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher)
):
    """Get students enrolled in a subject (optionally filtered by class)."""
    teacher = get_teacher_from_token(current_user, db)

    # Get student IDs enrolled in this subject
    ss_records = db.query(StudentSubject).filter(StudentSubject.subject_id == subject_id).all()
    student_ids = [ss.student_id for ss in ss_records]

    query = db.query(Student).filter(Student.id.in_(student_ids))
    if class_id:
        query = query.filter(Student.class_id == class_id)

    students = query.order_by(Student.roll_number).all()
    return [{
        "id": s.id,
        "name": s.name,
        "roll_number": s.roll_number,
        "class_name": s.class_section.name if s.class_section else "",
        "section": s.class_section.section if s.class_section else "",
    } for s in students]

# ─── AI Video Upload ────────────────────────────────────────────────────────

@router.post("/attendance/video")
async def upload_attendance_video(
    file: UploadFile = File(...),
    subject_id: int = 0,
    class_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher)
):
    """Upload video for AI face recognition attendance."""
    teacher = get_teacher_from_token(current_user, db)

    video_dir = os.path.join(UPLOAD_DIR, "videos")
    os.makedirs(video_dir, exist_ok=True)

    suffix = os.path.splitext(file.filename)[1].lower()
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix, dir=video_dir) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        detected_ids = process_video(tmp_path, db)

        # Get all students for this subject
        ss_records = db.query(StudentSubject).filter(StudentSubject.subject_id == subject_id).all()
        student_ids = [ss.student_id for ss in ss_records]

        query = db.query(Student).filter(Student.id.in_(student_ids))
        if class_id:
            query = query.filter(Student.class_id == class_id)

        students = query.order_by(Student.roll_number).all()

        results = []
        for s in students:
            results.append({
                "student_id": s.id,
                "name": s.name,
                "roll_number": s.roll_number,
                "status": "Present" if s.id in detected_ids else "Absent",
                "marked_by_ai": s.id in detected_ids
            })

        return {
            "message": f"Detected {len(detected_ids)} students",
            "total_students": len(students),
            "detected_count": len([r for r in results if r['status'] == 'Present']),
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Video processing error: {str(e)}")
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass

# ─── Save Attendance ────────────────────────────────────────────────────────

class AttendanceRecordItem(BaseModel):
    student_id: int
    status: str  # Present, Absent, Not Marked
    marked_by_ai: bool = False

class SaveAttendanceRequest(BaseModel):
    subject_id: int
    class_id: Optional[int] = None
    date: str  # YYYY-MM-DD
    time_start: Optional[str] = None  # HH:MM
    records: List[AttendanceRecordItem]

@router.post("/attendance")
def save_attendance(data: SaveAttendanceRequest,
                    db: Session = Depends(get_db),
                    current_user: dict = Depends(require_teacher)):
    teacher = get_teacher_from_token(current_user, db)

    att_date = datetime.strptime(data.date, "%Y-%m-%d").date()
    att_time = None
    if data.time_start:
        try:
            parts = data.time_start.split(":")
            att_time = dt_time(int(parts[0]), int(parts[1]))
        except Exception:
            pass

    # Check if attendance already exists for this teacher/subject/class/date
    existing = db.query(Attendance).filter(
        Attendance.teacher_id == teacher.id,
        Attendance.subject_id == data.subject_id,
        Attendance.date == att_date
    )
    if data.class_id:
        existing = existing.filter(Attendance.class_id == data.class_id)

    existing_att = existing.first()

    if existing_att:
        # Update existing records
        db.query(AttendanceRecord).filter(
            AttendanceRecord.attendance_id == existing_att.id
        ).delete()
        attendance = existing_att
        attendance.time_start = att_time
    else:
        attendance = Attendance(
            teacher_id=teacher.id,
            subject_id=data.subject_id,
            class_id=data.class_id,
            date=att_date,
            time_start=att_time
        )
        db.add(attendance)
        db.flush()

    for rec in data.records:
        record = AttendanceRecord(
            attendance_id=attendance.id,
            student_id=rec.student_id,
            status=rec.status,
            marked_by_ai=rec.marked_by_ai
        )
        db.add(record)

    db.commit()
    return {"message": "Attendance saved successfully", "attendance_id": attendance.id}

# ─── Attendance Records ─────────────────────────────────────────────────────

@router.get("/attendance/records")
def get_attendance_records(
    subject_id: Optional[int] = None,
    class_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher)
):
    teacher = get_teacher_from_token(current_user, db)
    query = db.query(Attendance).filter(Attendance.teacher_id == teacher.id)

    if subject_id:
        query = query.filter(Attendance.subject_id == subject_id)
    if class_id:
        query = query.filter(Attendance.class_id == class_id)
    if date_from:
        query = query.filter(Attendance.date >= datetime.strptime(date_from, "%Y-%m-%d").date())
    if date_to:
        query = query.filter(Attendance.date <= datetime.strptime(date_to, "%Y-%m-%d").date())

    attendance_list = query.order_by(Attendance.date.desc()).all()

    result = []
    for att in attendance_list:
        records = db.query(AttendanceRecord).filter(
            AttendanceRecord.attendance_id == att.id
        ).all()

        present_count = sum(1 for r in records if r.status == "Present")
        total = len(records)

        result.append({
            "id": att.id,
            "date": str(att.date),
            "time_start": str(att.time_start) if att.time_start else None,
            "subject": att.subject.name if att.subject else "",
            "subject_id": att.subject_id,
            "class_name": att.class_section.name if att.class_section else "",
            "class_id": att.class_id,
            "present": present_count,
            "total": total,
            "records": [{
                "id": r.id,
                "student_id": r.student_id,
                "student_name": r.student.name if r.student else "",
                "roll_number": r.student.roll_number if r.student else "",
                "status": r.status,
                "marked_by_ai": r.marked_by_ai
            } for r in records]
        })

    return result

# ─── Edit Attendance ────────────────────────────────────────────────────────

class EditAttendanceItem(BaseModel):
    student_id: int
    status: str

class EditAttendanceRequest(BaseModel):
    records: List[EditAttendanceItem]

@router.put("/attendance/{attendance_id}")
def edit_attendance(attendance_id: int, data: EditAttendanceRequest,
                    db: Session = Depends(get_db),
                    current_user: dict = Depends(require_teacher)):
    teacher = get_teacher_from_token(current_user, db)
    attendance = db.query(Attendance).filter(
        Attendance.id == attendance_id,
        Attendance.teacher_id == teacher.id
    ).first()

    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    # Delete old records and add new
    db.query(AttendanceRecord).filter(AttendanceRecord.attendance_id == attendance_id).delete()

    for rec in data.records:
        record = AttendanceRecord(
            attendance_id=attendance_id,
            student_id=rec.student_id,
            status=rec.status,
            marked_by_ai=False
        )
        db.add(record)

    db.commit()
    return {"message": "Attendance updated successfully"}

# ─── Analytics ──────────────────────────────────────────────────────────────

@router.get("/analytics")
def get_analytics(db: Session = Depends(get_db),
                  current_user: dict = Depends(require_teacher)):
    teacher = get_teacher_from_token(current_user, db)

    # Get all attendance sessions for this teacher
    sessions = db.query(Attendance).filter(Attendance.teacher_id == teacher.id).all()

    # Subject-wise analytics
    subject_analytics = {}
    for session in sessions:
        subj_name = session.subject.name if session.subject else "Unknown"
        if subj_name not in subject_analytics:
            subject_analytics[subj_name] = {
                "subject": subj_name,
                "subject_id": session.subject_id,
                "total_lectures": 0,
                "total_present": 0,
                "total_records": 0
            }
        subject_analytics[subj_name]["total_lectures"] += 1

        records = db.query(AttendanceRecord).filter(
            AttendanceRecord.attendance_id == session.id
        ).all()
        present = sum(1 for r in records if r.status == "Present")
        subject_analytics[subj_name]["total_present"] += present
        subject_analytics[subj_name]["total_records"] += len(records)

    for key in subject_analytics:
        sa = subject_analytics[key]
        if sa["total_records"] > 0:
            sa["attendance_percentage"] = round(
                (sa["total_present"] / sa["total_records"]) * 100, 1
            )
        else:
            sa["attendance_percentage"] = 0

    # Students with < 75% attendance
    low_attendance_students = []
    # Get all subjects taught by this teacher
    teacher_subject_ids = list({s.subject_id for s in sessions if s.subject_id})

    for subject_id in teacher_subject_ids:
        ss_records = db.query(StudentSubject).filter(
            StudentSubject.subject_id == subject_id
        ).all()

        subject_sessions = [s for s in sessions if s.subject_id == subject_id]
        total_lectures = len(subject_sessions)

        if total_lectures == 0:
            continue

        subject = db.query(Subject).filter(Subject.id == subject_id).first()

        for ss in ss_records:
            student = db.query(Student).filter(Student.id == ss.student_id).first()
            if not student:
                continue

            present_count = 0
            for session in subject_sessions:
                rec = db.query(AttendanceRecord).filter(
                    AttendanceRecord.attendance_id == session.id,
                    AttendanceRecord.student_id == student.id,
                    AttendanceRecord.status == "Present"
                ).first()
                if rec:
                    present_count += 1

            percentage = round((present_count / total_lectures) * 100, 1)
            if percentage < 75:
                low_attendance_students.append({
                    "student_name": student.name,
                    "roll_number": student.roll_number,
                    "subject": subject.name if subject else "",
                    "attendance_percentage": percentage,
                    "present": present_count,
                    "total": total_lectures
                })

    return {
        "total_lectures": len(sessions),
        "subject_analytics": list(subject_analytics.values()),
        "low_attendance_students": low_attendance_students
    }
