from __future__ import annotations

import json
import re
from copy import deepcopy
from datetime import datetime
from pathlib import Path
from typing import Any

from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DATA_FILE = Path(__file__).with_name("timetable.json")
CLASS_OPTIONS = ["SecondYear_A", "SecondYear_B", "ThirdYear", "FourthYear"]
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
DEFAULT_DATA: dict[str, Any] = {
    "users": [],
    "timetable": {class_name: {day: [] for day in DAYS} for class_name in CLASS_OPTIONS},
    "customTimetable": {},
    "teacherSchedule": [],
}


def slugify(value: str) -> str:
    cleaned = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return cleaned or "user"


def parse_time_to_minutes(value: str | None) -> int | None:
    if not value:
        return None
    value = value.strip().upper()
    for fmt in ("%I:%M %p", "%I %p", "%H:%M"):
        try:
            parsed = datetime.strptime(value, fmt)
            return parsed.hour * 60 + parsed.minute
        except ValueError:
            continue
    return None


def canonical_time(value: str) -> str:
    if not value:
        raise ValueError("Time is required.")
    value = value.strip().upper().replace(".", "")
    for fmt in ("%I:%M %p", "%I %p", "%H:%M"):
        try:
            parsed = datetime.strptime(value, fmt)
            return parsed.strftime("%I:%M %p")
        except ValueError:
            continue
    raise ValueError("Time must be like 09:30 AM.")


def sort_lectures(lectures: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(lectures, key=lambda item: parse_time_to_minutes(item.get("time")) or 10**9)


def build_teacher_schedule(data: dict[str, Any]) -> list[dict[str, Any]]:
    teacher_schedule: list[dict[str, Any]] = []
    for class_name, class_schedule in data.get("timetable", {}).items():
        for day, lectures in class_schedule.items():
            for lecture in lectures:
                teacher_schedule.append(
                    {
                        "time": lecture["time"],
                        "subject": lecture["subject"],
                        "teacher": lecture["teacher"],
                        "day": lecture.get("day", day),
                        "className": class_name,
                    }
                )
    return sort_lectures(teacher_schedule)


def normalize_lecture(lecture: dict[str, Any], *, default_day: str | None = None) -> dict[str, Any]:
    day = lecture.get("day", default_day)
    if day not in DAYS:
        raise ValueError("Day must be between Monday and Saturday.")

    normalized = {
        "time": canonical_time(str(lecture.get("time", ""))),
        "subject": str(lecture.get("subject", "")).strip(),
        "teacher": str(lecture.get("teacher", lecture.get("teacherName", ""))).strip(),
        "day": day,
    }
    if not normalized["subject"] or not normalized["teacher"]:
        raise ValueError("Subject and teacher are required.")
    return normalized


def ensure_data_shape(data: dict[str, Any]) -> dict[str, Any]:
    normalized = deepcopy(DEFAULT_DATA)
    normalized["users"] = data.get("users", [])
    normalized["customTimetable"] = data.get("customTimetable", {})

    source_timetable = data.get("timetable", data)
    for class_name in CLASS_OPTIONS:
        class_schedule = source_timetable.get(class_name, {})
        for day in DAYS:
            normalized["timetable"][class_name][day] = sort_lectures(
                [normalize_lecture(lecture, default_day=day) for lecture in class_schedule.get(day, [])]
            )

    rebuilt_custom: dict[str, Any] = {}
    for key, schedule in normalized["customTimetable"].items():
        rebuilt_custom[key] = {}
        for day in DAYS:
            rebuilt_custom[key][day] = sort_lectures(
                [normalize_lecture(lecture, default_day=day) for lecture in schedule.get(day, [])]
            )
    normalized["customTimetable"] = rebuilt_custom
    normalized["teacherSchedule"] = build_teacher_schedule(normalized)
    return normalized


def save_data(data: dict[str, Any]) -> None:
    DATA_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")


def load_data() -> dict[str, Any]:
    if not DATA_FILE.exists():
        data = deepcopy(DEFAULT_DATA)
        save_data(data)
        return data

    try:
        data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        data = deepcopy(DEFAULT_DATA)
        save_data(data)
        return data

    normalized = ensure_data_shape(data)
    if normalized != data:
        save_data(normalized)
    return normalized


def register_user(data: dict[str, Any], user: dict[str, Any]) -> None:
    name = str(user.get("name", "")).strip()
    role = str(user.get("role", "")).lower()
    if not name or role not in {"student", "teacher"}:
        return

    existing = next(
        (
            item
            for item in data["users"]
            if item.get("name", "").strip().lower() == name.lower() and item.get("role", "").lower() == role
        ),
        None,
    )
    payload = {
        "name": name,
        "role": role,
        "className": user.get("className"),
        "timetableMode": user.get("timetableMode"),
        "updatedAt": datetime.now().isoformat(timespec="seconds"),
    }
    if existing:
        existing.update({key: value for key, value in payload.items() if value})
    else:
        data["users"].append(payload)


def get_user_schedule(data: dict[str, Any], user: dict[str, Any]) -> dict[str, list[dict[str, Any]]]:
    role = str(user.get("role", "")).lower()
    if role == "teacher":
        teacher_name = str(user.get("teacherName") or user.get("name") or "").strip().lower()
        schedule_map = {day: [] for day in DAYS}
        for lecture in data.get("teacherSchedule", []):
            if lecture["teacher"].strip().lower() == teacher_name:
                schedule_map[lecture["day"]].append(lecture)
        return {day: sort_lectures(lectures) for day, lectures in schedule_map.items()}

    if user.get("timetableMode") == "custom":
        custom_key = slugify(str(user.get("name", "")))
        return deepcopy(data.get("customTimetable", {}).get(custom_key, {day: [] for day in DAYS}))

    class_name = user.get("className") or user.get("year") or "SecondYear_A"
    return deepcopy(data.get("timetable", {}).get(class_name, {day: [] for day in DAYS}))


def annotate_schedule(lectures: list[dict[str, Any]], now_minutes: int | None) -> dict[str, Any]:
    sorted_lectures = sort_lectures(lectures)
    current_lecture = None
    next_lecture = None
    annotated: list[dict[str, Any]] = []

    for index, lecture in enumerate(sorted_lectures):
        start = parse_time_to_minutes(lecture["time"])
        if start is None:
            annotated.append({**lecture, "isCurrent": False, "isNext": False})
            continue

        next_start = parse_time_to_minutes(sorted_lectures[index + 1]["time"]) if index + 1 < len(sorted_lectures) else None
        end = next_start if next_start and next_start > start else start + 55
        is_current = bool(now_minutes is not None and start <= now_minutes < end)
        is_next = bool(now_minutes is not None and now_minutes < start and next_lecture is None)
        lecture_payload = {**lecture, "isCurrent": is_current, "isNext": is_next}
        annotated.append(lecture_payload)

        if is_current and current_lecture is None:
            current_lecture = lecture_payload
        if is_next and next_lecture is None:
            next_lecture = lecture_payload

    return {"lectures": annotated, "currentLecture": current_lecture, "nextLecture": next_lecture}


def extract_requested_day(message: str) -> str | None:
    lowered = message.lower()
    for day in DAYS:
        if day.lower() in lowered:
            return day
    return None


def extract_time_query(message: str) -> tuple[int, int | None, str | None] | None:
    match = re.search(r"\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b", message.lower())
    if not match:
        return None
    return int(match.group(1)), int(match.group(2) or 0), match.group(3).upper() if match.group(3) else None


def lecture_matches_time(lecture_time: str, time_query: tuple[int, int | None, str | None]) -> bool:
    hour, minute, meridiem = time_query
    lecture_parsed = datetime.strptime(lecture_time, "%I:%M %p")
    if lecture_parsed.minute != minute:
        return False
    if meridiem and lecture_parsed.strftime("%p") != meridiem:
        return False
    return lecture_parsed.hour % 12 == hour % 12


def extract_teacher_name(message: str, lectures: list[dict[str, Any]]) -> str | None:
    lowered = message.lower()
    candidates = sorted({lecture["teacher"] for lecture in lectures if lecture.get("teacher")}, key=len, reverse=True)
    for teacher in candidates:
        if teacher.lower() in lowered:
            return teacher
    return None


def has_keyword(message: str, keyword: str) -> bool:
    if " " in keyword:
        return keyword in message
    return re.search(rf"\b{re.escape(keyword)}\b", message) is not None


def has_any_keyword(message: str, keywords: list[str]) -> bool:
    return any(has_keyword(message, keyword) for keyword in keywords)


def format_schedule_summary(day: str, lectures: list[dict[str, Any]], role: str) -> str:
    if not lectures:
        return f"You do not have any lectures scheduled on {day}." if role == "teacher" else f"No lectures are scheduled for {day}."
    lines = [f"{lecture['time']} - {lecture['subject']} ({lecture['teacher']})" for lecture in lectures]
    return f"{day}'s schedule:\n" + "\n".join(lines)


def build_greeting() -> str:
    current_hour = datetime.now().hour
    if 5 <= current_hour < 12:
        return "Good Morning ☀️"
    if 12 <= current_hour < 17:
        return "Good Afternoon 🌤️"
    return "Good Evening 🌙"


def chat_response(data: dict[str, Any], message: str, user: dict[str, Any]) -> dict[str, Any]:
    clean_message = message.strip()
    if not clean_message:
        return {"reply": "Please type a timetable question so I can help."}

    register_user(data, user)
    schedule_map = get_user_schedule(data, user)
    today = datetime.now().strftime("%A")
    requested_day = extract_requested_day(clean_message) or today
    now_minutes = datetime.now().hour * 60 + datetime.now().minute
    full_schedule = [lecture for day in DAYS for lecture in schedule_map.get(day, [])]
    day_schedule = schedule_map.get(requested_day, [])
    annotated = annotate_schedule(day_schedule, now_minutes)
    role = str(user.get("role", "student")).lower()
    lowered = clean_message.lower()

    if has_any_keyword(lowered, ["hello", "hi", "hey", "good morning", "good afternoon", "good evening"]):
        return {
            "reply": f"{build_greeting()}, {user.get('name', 'there')}! Ask me about your timetable, next lecture, or today's schedule.",
            "today": today,
            "todaySchedule": annotated["lectures"],
            "currentLecture": annotated["currentLecture"],
            "nextLecture": annotated["nextLecture"],
        }

    if has_any_keyword(lowered, ["today", "schedule"]):
        return {
            "reply": format_schedule_summary(requested_day, annotated["lectures"], role),
            "today": requested_day,
            "todaySchedule": annotated["lectures"],
            "currentLecture": annotated["currentLecture"],
            "nextLecture": annotated["nextLecture"],
        }

    if has_any_keyword(lowered, ["current", "ongoing", "right now", "now"]):
        if annotated["currentLecture"]:
            lecture = annotated["currentLecture"]
            class_note = f" for {lecture['className']}" if lecture.get("className") else ""
            return {
                "reply": f"The current lecture is {lecture['subject']}{class_note} at {lecture['time']} with {lecture['teacher']}.",
                "today": requested_day,
                "todaySchedule": annotated["lectures"],
                "currentLecture": lecture,
                "nextLecture": annotated["nextLecture"],
            }
        return {"reply": "There is no live lecture right now.", "today": requested_day, "todaySchedule": annotated["lectures"], "currentLecture": None, "nextLecture": annotated["nextLecture"]}

    if has_any_keyword(lowered, ["next", "upcoming"]):
        if annotated["nextLecture"]:
            lecture = annotated["nextLecture"]
            class_note = f" for {lecture['className']}" if lecture.get("className") else ""
            return {
                "reply": f"Your next lecture is {lecture['subject']}{class_note} at {lecture['time']} with {lecture['teacher']}.",
                "today": requested_day,
                "todaySchedule": annotated["lectures"],
                "currentLecture": annotated["currentLecture"],
                "nextLecture": lecture,
            }
        return {"reply": f"There are no more lectures scheduled for {requested_day}.", "today": requested_day, "todaySchedule": annotated["lectures"], "currentLecture": annotated["currentLecture"], "nextLecture": None}

    time_query = extract_time_query(clean_message)
    if time_query:
        lecture = next((item for item in day_schedule if lecture_matches_time(item["time"], time_query)), None)
        if lecture:
            class_note = f" for {lecture['className']}" if lecture.get("className") else ""
            return {
                "reply": f"You have {lecture['subject']}{class_note} with {lecture['teacher']} at {lecture['time']}.",
                "today": requested_day,
                "todaySchedule": annotated["lectures"],
                "currentLecture": annotated["currentLecture"],
                "nextLecture": annotated["nextLecture"],
                "matchedLecture": lecture,
            }
        return {"reply": f"I could not find a lecture at that time on {requested_day}.", "today": requested_day, "todaySchedule": annotated["lectures"], "currentLecture": annotated["currentLecture"], "nextLecture": annotated["nextLecture"]}

    teacher_name = extract_teacher_name(clean_message, full_schedule)
    if teacher_name:
        today_match = next((lecture for lecture in day_schedule if lecture["teacher"] == teacher_name), None)
        if today_match:
            class_note = f" for {today_match['className']}" if today_match.get("className") else ""
            return {
                "reply": f"{teacher_name} teaches {today_match['subject']}{class_note} at {today_match['time']} on {requested_day}.",
                "today": requested_day,
                "todaySchedule": annotated["lectures"],
                "currentLecture": annotated["currentLecture"],
                "nextLecture": annotated["nextLecture"],
            }
        any_match = next((lecture for lecture in full_schedule if lecture["teacher"] == teacher_name), None)
        if any_match:
            class_note = f" for {any_match['className']}" if any_match.get("className") else ""
            return {
                "reply": f"{teacher_name} next appears on {any_match['day']} at {any_match['time']} with {any_match['subject']}{class_note}.",
                "today": requested_day,
                "todaySchedule": annotated["lectures"],
                "currentLecture": annotated["currentLecture"],
                "nextLecture": annotated["nextLecture"],
            }

    return {"reply": "I can help with today's schedule, next lecture, current lecture, time-based questions, and teacher lookups.", "today": requested_day, "todaySchedule": annotated["lectures"], "currentLecture": annotated["currentLecture"], "nextLecture": annotated["nextLecture"]}


@app.get("/")
def health() -> Any:
    return jsonify({"status": "ok", "message": "Timetable chatbot backend is running."})


@app.post("/chat")
def chat() -> Any:
    payload = request.get_json(silent=True) or {}
    data = load_data()
    response = chat_response(data, payload.get("message", ""), payload.get("user", {}))
    save_data(data)
    return jsonify(response)


@app.post("/add-student-timetable")
def add_student_timetable() -> Any:
    payload = request.get_json(silent=True) or {}
    name = str(payload.get("name", "")).strip()
    entries = payload.get("entries", [])
    if not name:
        return jsonify({"error": "Student name is required."}), 400
    if not isinstance(entries, list) or not entries:
        return jsonify({"error": "Please send at least one timetable entry."}), 400

    data = load_data()
    grouped_schedule = {day: [] for day in DAYS}
    for entry in entries:
        lecture = normalize_lecture(entry)
        grouped_schedule[lecture["day"]].append(lecture)

    data["customTimetable"][slugify(name)] = {day: sort_lectures(lectures) for day, lectures in grouped_schedule.items()}
    register_user(data, {"name": name, "role": "student", "timetableMode": "custom"})
    save_data(data)
    return jsonify({"message": f"Custom timetable saved for {name}.", "scheduleKey": slugify(name), "schedule": data["customTimetable"][slugify(name)]})


@app.post("/add-teacher-timetable")
def add_teacher_timetable() -> Any:
    payload = request.get_json(silent=True) or {}
    class_name = payload.get("className")
    if class_name not in CLASS_OPTIONS:
        return jsonify({"error": "Class must be one of the predefined templates."}), 400

    data = load_data()
    lecture = normalize_lecture({"time": payload.get("time"), "subject": payload.get("subject"), "teacher": payload.get("teacherName") or payload.get("teacher"), "day": payload.get("day")})
    day_schedule = data["timetable"][class_name][lecture["day"]]

    replaced = False
    for index, existing in enumerate(day_schedule):
        same_slot = existing["time"] == lecture["time"]
        same_teacher = existing["teacher"].lower() == lecture["teacher"].lower()
        same_subject = existing["subject"].lower() == lecture["subject"].lower()
        if same_slot or (same_teacher and same_subject and existing["day"] == lecture["day"]):
            day_schedule[index] = lecture
            replaced = True
            break
    if not replaced:
        day_schedule.append(lecture)

    data["timetable"][class_name][lecture["day"]] = sort_lectures(day_schedule)
    data["teacherSchedule"] = build_teacher_schedule(data)
    register_user(data, {"name": lecture["teacher"], "role": "teacher"})
    save_data(data)

    teacher_lectures = [item for item in data["teacherSchedule"] if item["teacher"].lower() == lecture["teacher"].lower()]
    return jsonify({"message": "Teacher timetable updated successfully.", "lecture": {**lecture, "className": class_name}, "teacherLectures": teacher_lectures})


@app.get("/get-timetable")
def get_timetable() -> Any:
    return jsonify(load_data())


@app.get("/get-today")
def get_today() -> Any:
    data = load_data()
    day = request.args.get("day") or datetime.now().strftime("%A")
    user = {
        "name": request.args.get("name"),
        "role": request.args.get("role"),
        "className": request.args.get("className"),
        "timetableMode": request.args.get("timetableMode"),
        "teacherName": request.args.get("teacherName"),
    }
    schedule_map = get_user_schedule(data, user)
    now_minutes = datetime.now().hour * 60 + datetime.now().minute
    annotated = annotate_schedule(schedule_map.get(day, []), now_minutes)
    return jsonify({"day": day, "greeting": build_greeting(), "lectures": annotated["lectures"], "currentLecture": annotated["currentLecture"], "nextLecture": annotated["nextLecture"]})


if __name__ == "__main__":
    load_data()
    app.run(debug=True)
