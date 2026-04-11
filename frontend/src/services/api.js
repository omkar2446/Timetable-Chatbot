import axios from 'axios'

const apiBaseUrl = 'https://timetable-chatbot-backend.onrender.com/'

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
