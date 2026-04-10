import { useEffect, useMemo, useRef, useState } from 'react'
import { parseMinutes } from '../utils/time'
import Button from './Button'

function NotificationSystem({ lectures, nextLecture }) {
  const remindedRef = useRef(new Set())
  const [permission, setPermission] = useState(() => {
    if (!('Notification' in window)) {
      return 'unsupported'
    }
    return Notification.permission
  })
  const [lastReminder, setLastReminder] = useState('')

  const notificationLabel = useMemo(() => {
    if (permission === 'granted') {
      return 'Browser notifications enabled'
    }
    if (permission === 'denied') {
      return 'Notifications blocked in browser'
    }
    if (permission === 'unsupported') {
      return 'Browser notification API not available'
    }
    return 'Reminder permission not enabled yet'
  }, [permission])

  const enableNotifications = async () => {
    if (!('Notification' in window)) {
      setPermission('unsupported')
      return
    }
    const result = await Notification.requestPermission()
    setPermission(result)
  }

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
        const reminderId = `${lecture.day}-${lecture.time}-${lecture.subject}-${lecture.teacher}`
        if (diff >= 4 && diff <= 5 && !remindedRef.current.has(reminderId)) {
          remindedRef.current.add(reminderId)
          const message = `Reminder: ${lecture.subject} starts at ${lecture.time}.`
          setLastReminder(message)

          if ('Notification' in window && permission === 'granted') {
            new Notification('Timetable Reminder', { body: message })
          } else if (permission === 'unsupported') {
            window.alert(message)
          }
        }
      })
    }

    checkReminders()
    const interval = window.setInterval(checkReminders, 60000)
    return () => window.clearInterval(interval)
  }, [lectures, permission])

  return (
    <div className="glass-card notify-panel">
      <div className="section-heading">
        <span className="eyebrow">Notifications</span>
        <h2>Reminder System</h2>
        <p>{notificationLabel}</p>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <span>Next Reminder</span>
          <strong>{nextLecture ? `${nextLecture.subject} at ${nextLecture.time}` : 'No upcoming lecture'}</strong>
        </div>
        <div className="summary-card">
          <span>Reminder Window</span>
          <strong>5 minutes before lecture</strong>
        </div>
      </div>

      {permission !== 'granted' && (
        <Button className="ghost-button" variant="ghost" onClick={enableNotifications}>
          Enable Notifications
        </Button>
      )}

      {lastReminder && <p className="status-text">{lastReminder}</p>}
    </div>
  )
}

export default NotificationSystem
