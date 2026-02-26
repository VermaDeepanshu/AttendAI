from sqlalchemy import (
    Column, Integer, String, Float, Date, Time,
    ForeignKey, Text, Enum, DateTime, Boolean
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum("admin", "teacher"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

class Teacher(Base):
    __tablename__ = "teachers"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    name = Column(String(150), nullable=False)
    raw_password = Column(String(255), nullable=True)  # Stored for admin viewing
    schedules = relationship("Schedule", back_populates="teacher", cascade="all, delete-orphan")
    user = relationship("User")

class Subject(Base):
    __tablename__ = "subjects"
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    code = Column(String(20), unique=True)

class ClassSection(Base):
    __tablename__ = "classes"
    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False)
    section = Column(String(10))

class Schedule(Base):
    __tablename__ = "schedules"
    id = Column(Integer, primary_key=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id"))
    subject_id = Column(Integer, ForeignKey("subjects.id"))
    class_id = Column(Integer, ForeignKey("classes.id"))
    day = Column(Enum("Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"))
    time_start = Column(Time)
    time_end = Column(Time)
    teacher = relationship("Teacher", back_populates="schedules")
    subject = relationship("Subject")
    class_section = relationship("ClassSection")

class Student(Base):
    __tablename__ = "students"
    id = Column(Integer, primary_key=True)
    name = Column(String(150), nullable=False)
    roll_number = Column(String(50), unique=True, nullable=False)
    image_path = Column(String(255))
    class_id = Column(Integer, ForeignKey("classes.id"))
    face_encodings = relationship("FaceEncoding", back_populates="student", cascade="all, delete-orphan")
    class_section = relationship("ClassSection")

class FaceEncoding(Base):
    __tablename__ = "face_encodings"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    encoding = Column(Text, nullable=False)  # JSON serialized numpy array
    student = relationship("Student", back_populates="face_encodings")

class StudentSubject(Base):
    __tablename__ = "student_subjects"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    subject_id = Column(Integer, ForeignKey("subjects.id"))

class Attendance(Base):
    __tablename__ = "attendance"
    id = Column(Integer, primary_key=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id"))
    subject_id = Column(Integer, ForeignKey("subjects.id"))
    class_id = Column(Integer, ForeignKey("classes.id"))
    date = Column(Date, nullable=False)
    time_start = Column(Time)
    created_at = Column(DateTime, server_default=func.now())
    # Relationships for teacher routes
    subject = relationship("Subject")
    class_section = relationship("ClassSection")
    teacher = relationship("Teacher")
    records = relationship("AttendanceRecord", back_populates="attendance", cascade="all, delete-orphan")

class AttendanceRecord(Base):
    __tablename__ = "attendance_records"
    id = Column(Integer, primary_key=True)
    attendance_id = Column(Integer, ForeignKey("attendance.id"))
    student_id = Column(Integer, ForeignKey("students.id"))
    status = Column(Enum("Present", "Absent", "Not Marked"), default="Not Marked")
    marked_by_ai = Column(Boolean, default=False)
    # Relationships
    attendance = relationship("Attendance", back_populates="records")
    student = relationship("Student")