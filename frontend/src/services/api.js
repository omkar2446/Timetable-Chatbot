import axios from 'axios'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000'

export const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 8000,
})

export const endpoints = {
  chat: '/chat',
  addStudentTimetable: '/add-student-timetable',
  addTeacherTimetable: '/add-teacher-timetable',
  getTimetable: '/get-timetable',
  getToday: '/get-today',
}
