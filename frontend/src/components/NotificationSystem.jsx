import { useEffect, useRef } from 'react'
import { parseMinutes } from '../utils/time'

function NotificationSystem({ lectures }) {
  const remindedRef = useRef(new Set())

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => null)
    }
  }, [])

  useEffect(() => {
    const checkReminders = () => {
      const now = new Date()
      const currentMinutes = now.getHours() * 60 + now.getMinutes()

      lectures.forEach((lecture) => {
        const lectureMinutes = parseMinutes(lecture.time)
        if (lectureMinutes === null) {
          return
        }
        const diff = lectureMinutes - currentMinutes
        const reminderId = `${lecture.day}-${lecture.time}-${lecture.subject}`
        if (diff >= 4 && diff <= 5 && !remindedRef.current.has(reminderId)) {
          remindedRef.current.add(reminderId)
          const message = `Reminder: ${lecture.subject} lecture in 5 minutes`

          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Timetable Reminder', { body: message })
          } else {
            window.alert(message)
          }
        }
      })
    }

    checkReminders()
    const interval = window.setInterval(checkReminders, 60000)
    return () => window.clearInterval(interval)
  }, [lectures])

  return null
}

export default NotificationSystem
