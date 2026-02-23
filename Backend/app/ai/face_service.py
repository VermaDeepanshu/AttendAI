import cv2
import face_recognition
import numpy as np
import json
from sqlalchemy.orm import Session
from app.models.models import FaceEncoding, Student

def encode_student_image(image_path: str) -> list:
    image = face_recognition.load_image_file(image_path)
    encodings = face_recognition.face_encodings(image)
    if encodings:
        return encodings[0].tolist()
    return None

def load_all_encodings(db: Session):
    records = db.query(FaceEncoding).all()
    encodings = []
    student_ids = []
    for r in records:
        enc = json.loads(r.encoding)
        encodings.append(np.array(enc))
        student_ids.append(r.student_id)
    return encodings, student_ids

def process_video(video_path: str, db: Session, frame_interval=30):
    known_encodings, student_ids = load_all_encodings(db)
    detected_ids = set()

    cap = cv2.VideoCapture(video_path)
    frame_count = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        if frame_count % frame_interval == 0:
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            face_locations = face_recognition.face_locations(rgb_frame)
            face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)

            for face_enc in face_encodings:
                matches = face_recognition.compare_faces(known_encodings, face_enc, tolerance=0.5)
                distances = face_recognition.face_distance(known_encodings, face_enc)
                if True in matches:
                    best_idx = np.argmin(distances)
                    if matches[best_idx]:
                        detected_ids.add(student_ids[best_idx])
        frame_count += 1

    cap.release()
    return list(detected_ids)