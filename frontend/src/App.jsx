import { startTransition, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import './App.css'
import ChatBox from './components/ChatBox'
import InputBox from './components/InputBox'
import NotificationSystem from './components/NotificationSystem'
import RoleSelector from './components/RoleSelector'
import SchedulePanel from './components/SchedulePanel'
import TimetableForm from './components/TimetableForm'
import { api, endpoints } from './services/api'
import {
  CLASS_OPTIONS,
  DAY_OPTIONS,
  createBotMessage,
  createUserMessage,
  getGreetingByHour,
} from './utils/time'

const STORAGE_KEY = 'timetable-bot-session'

const emptyStudentEntry = {
  day: 'Monday',
  time: '09:30 AM',
  subject: '',
  teacher: '',
}

const createTeacherDraft = (name = '') => ({
  teacherName: name,
  subject: '',
  time: '09:30 AM',
  day: 'Monday',
  className: 'SecondYear_A',
})

function App() {
  const [step, setStep] = useState('name')
  const [name, setName] = useState('')
  const [user, setUser] = useState({
    name: '',
    role: '',
    timetableMode: '',
    className: '',
    teacherName: '',
  })
  const [messages, setMessages] = useState([])
  const [allTimetables, setAllTimetables] = useState(null)
  const [todayData, setTodayData] = useState({
    day: '',
    greeting: '',
    lectures: [],
    currentLecture: null,
    nextLecture: null,
  })
  const [studentEntry, setStudentEntry] = useState(emptyStudentEntry)
  const [studentEntries, setStudentEntries] = useState([])
  const [teacherDraft, setTeacherDraft] = useState(createTeacherDraft())
  const [teacherLectures, setTeacherLectures] = useState([])
  const [statusMessage, setStatusMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [chatLoading, setChatLoading] = useState(false)
  const hasBootstrapped = useRef(false)

  const quickActions = useMemo(() => {
    if (user.role === 'teacher') {
      return ["Show today's schedule", 'What is my next lecture?', `When is ${user.teacherName || user.name}'s lecture?`]
    }
    return ["Show today's schedule", 'What is my next lecture?', 'Which lecture is at 9:30?']
  }, [user.name, user.role, user.teacherName])

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
      if (!saved) {
        return
      }
      setStep(saved.step || 'name')
      setName(saved.name || '')
      setUser(saved.user || {})
      setMessages(saved.messages || [])
      setTodayData(saved.todayData || { day: '', greeting: '', lectures: [], currentLecture: null, nextLecture: null })
      setTeacherLectures(saved.teacherLectures || [])
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        step,
        name,
        user,
        messages,
        todayData,
        teacherLectures,
      }),
    )
  }, [messages, name, step, teacherLectures, todayData, user])

  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        const response = await api.get(endpoints.getTimetable)
        setAllTimetables(response.data)
      } catch (error) {
        setStatusMessage(error.message || 'Unable to connect to backend.')
      }
    }
    fetchTimetable()
  }, [])

  const loadTodayForUser = async (targetUser) => {
    if (!targetUser?.role) {
      return
    }
    try {
      const response = await api.get(endpoints.getToday, {
        params: {
          name: targetUser.name,
          role: targetUser.role,
          className: targetUser.className,
          timetableMode: targetUser.timetableMode,
          teacherName: targetUser.teacherName || targetUser.name,
        },
      })
      setTodayData(response.data)
    } catch (error) {
      setStatusMessage(error.message || 'Could not load today schedule.')
    }
  }

  const refreshToday = useEffectEvent(() => {
    loadTodayForUser(user)
  })

  useEffect(() => {
    if (step !== 'chat' || !user.role) {
      return
    }
    if (!hasBootstrapped.current) {
      hasBootstrapped.current = true
      const greeting = getGreetingByHour(new Date().getHours())
      const intro =
        user.role === 'teacher'
          ? `${greeting}, ${user.name}. I can show your lectures, detect your next class, and help you update the timetable.`
          : `${greeting}, ${user.name}. Ask for today's schedule, next lecture, or any class by time or teacher.`
      setMessages((current) => (current.length ? current : [createBotMessage(intro)]))
    }

    refreshToday()
    const interval = window.setInterval(() => {
      refreshToday()
    }, 60000)
    return () => window.clearInterval(interval)
  }, [step, user])

  const enterChat = async (nextUser) => {
    setUser(nextUser)
    setStep('chat')
    setStatusMessage('')
    await loadTodayForUser(nextUser)
  }

  const handleNameSubmit = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setStatusMessage('Please enter your name to continue.')
      return
    }
    setUser((current) => ({ ...current, name: trimmed, teacherName: trimmed }))
    setStatusMessage('')
    setStep('role')
  }

  const handleRoleSelect = (role) => {
    const nextUser = {
      ...user,
      name: name.trim(),
      role,
      teacherName: name.trim(),
    }
    setUser(nextUser)
    setTeacherDraft(createTeacherDraft(nextUser.teacherName))
    setStatusMessage('')
    setStep(role === 'student' ? 'student-mode' : 'teacher-setup')
  }

  const handleStudentModeSelect = (mode) => {
    setUser((current) => ({ ...current, timetableMode: mode }))
    setStatusMessage('')
    setStep(mode === 'custom' ? 'student-upload' : 'student-template')
  }

  const addStudentEntry = () => {
    if (!studentEntry.subject.trim() || !studentEntry.teacher.trim()) {
      setStatusMessage('Add subject and teacher before saving the entry.')
      return
    }
    setStudentEntries((current) => [...current, { ...studentEntry }])
    setStudentEntry(emptyStudentEntry)
    setStatusMessage('Lecture added to your custom draft.')
  }

  const removeStudentEntry = (indexToRemove) => {
    setStudentEntries((current) => current.filter((_, index) => index !== indexToRemove))
  }

  const saveStudentTimetable = async () => {
    if (!studentEntries.length) {
      setStatusMessage('Please add at least one lecture before saving.')
      return
    }
    setLoading(true)
    try {
      await api.post(endpoints.addStudentTimetable, {
        name: user.name,
        entries: studentEntries,
      })
      setStatusMessage('Custom timetable saved successfully.')
      await enterChat({ ...user, timetableMode: 'custom', className: '' })
    } catch (error) {
      setStatusMessage(error.response?.data?.error || error.message || 'Could not save custom timetable.')
    } finally {
      setLoading(false)
    }
  }

  const continueWithTemplate = async () => {
    if (!user.className) {
      setStatusMessage('Please select a year template first.')
      return
    }
    setLoading(true)
    try {
      await enterChat({ ...user, timetableMode: 'template' })
    } finally {
      setLoading(false)
    }
  }

  const saveTeacherLecture = async () => {
    if (!teacherDraft.teacherName.trim() || !teacherDraft.subject.trim()) {
      setStatusMessage('Teacher name and subject are required.')
      return
    }
    setLoading(true)
    try {
      const response = await api.post(endpoints.addTeacherTimetable, teacherDraft)
      setTeacherLectures(response.data.teacherLectures || [])
      const nextUser = {
        ...user,
        teacherName: teacherDraft.teacherName.trim(),
        role: 'teacher',
      }
      setUser(nextUser)
      setTeacherDraft(createTeacherDraft(teacherDraft.teacherName.trim()))
      setStatusMessage('Lecture saved. You can add more or enter the chat dashboard.')
    } catch (error) {
      setStatusMessage(error.response?.data?.error || error.message || 'Could not update teacher timetable.')
    } finally {
      setLoading(false)
    }
  }

  const openTeacherDashboard = async () => {
    const nextUser = {
      ...user,
      role: 'teacher',
      teacherName: teacherDraft.teacherName.trim() || user.name,
    }
    setLoading(true)
    try {
      await enterChat(nextUser)
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async (text) => {
    const trimmed = text.trim()
    if (!trimmed) {
      return
    }
    startTransition(() => {
      setMessages((current) => [...current, createUserMessage(trimmed)])
    })
    setChatLoading(true)

    try {
      const response = await api.post(endpoints.chat, {
        message: trimmed,
        user: {
          name: user.name,
          role: user.role,
          className: user.className,
          timetableMode: user.timetableMode,
          teacherName: user.teacherName || user.name,
        },
      })
      setMessages((current) => [...current, createBotMessage(response.data.reply)])
      if (response.data.todaySchedule) {
        setTodayData((current) => ({
          ...current,
          day: response.data.today || current.day,
          lectures: response.data.todaySchedule,
          currentLecture: response.data.currentLecture,
          nextLecture: response.data.nextLecture,
        }))
      }
    } catch {
      setMessages((current) => [...current, createBotMessage('The chatbot could not respond right now. Please try again.')])
    } finally {
      setChatLoading(false)
    }
  }

  const selectedTemplate = allTimetables?.timetable?.[user.className]

  return (
    <div className="app-shell">
      <video className="background-video" autoPlay loop muted playsInline>
        <source src="/video/back.mp4" type="video/mp4" />
      </video>
      <div className="background-overlay" />

      <main className="app-frame">
        <section className="hero-panel glass-card">
          <span className="hero-badge">College Technical Event Demo</span>
          <h1>Intelligent Timetable Chatbot</h1>
          <p>
            A production-ready student and teacher assistant with timetable management, natural language chat,
            current lecture highlighting, and reminder notifications.
          </p>
          <div className="hero-tags">
            <span>React + Vite</span>
            <span>Flask API</span>
            <span>JSON Storage</span>
            <span>Voice Input</span>
          </div>
        </section>

        {step !== 'chat' ? (
          <section className="setup-grid">
            <div className="glass-card flow-card">
              {step === 'name' && (
                <>
                  <div className="section-heading">
                    <span className="eyebrow">Step 1</span>
                    <h2>Enter Your Name</h2>
                    <p>We store your name locally so the chatbot can greet you and save your preferred timetable flow.</p>
                  </div>
                  <div className="form-row">
                    <input
                      className="text-input"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      onKeyDown={(event) => event.key === 'Enter' && handleNameSubmit()}
                      placeholder="Enter your name"
                    />
                    <button className="primary-button" onClick={handleNameSubmit}>
                      Continue
                    </button>
                  </div>
                </>
              )}

              {step === 'role' && (
                <RoleSelector
                  name={user.name}
                  onSelect={handleRoleSelect}
                />
              )}

              {step === 'student-mode' && (
                <>
                  <div className="section-heading">
                    <span className="eyebrow">Step 3</span>
                    <h2>Choose Student Mode</h2>
                    <p>Upload your custom event timetable or use a ready-made class template.</p>
                  </div>
                  <div className="option-grid">
                    <button className="option-card" onClick={() => handleStudentModeSelect('custom')}>
                      <strong>Upload Timetable</strong>
                      <span>Build a personal schedule day by day.</span>
                    </button>
                    <button className="option-card" onClick={() => handleStudentModeSelect('template')}>
                      <strong>Select Existing Template</strong>
                      <span>Use SecondYear_A, SecondYear_B, ThirdYear, or FourthYear.</span>
                    </button>
                  </div>
                </>
              )}

              {step === 'student-upload' && (
                <TimetableForm
                  mode="student"
                  title="Upload Custom Timetable"
                  subtitle="Add multiple lecture entries, then save them under your name."
                  entry={studentEntry}
                  entries={studentEntries}
                  onEntryChange={setStudentEntry}
                  onAddEntry={addStudentEntry}
                  onRemoveEntry={removeStudentEntry}
                  onSave={saveStudentTimetable}
                  loading={loading}
                />
              )}

              {step === 'student-template' && (
                <>
                  <div className="section-heading">
                    <span className="eyebrow">Step 3</span>
                    <h2>Select Existing Template</h2>
                    <p>Choose your academic year and jump straight into the chatbot.</p>
                  </div>
                  <div className="template-options">
                    {CLASS_OPTIONS.map((option) => (
                      <button
                        key={option}
                        className={`pill-button ${user.className === option ? 'active' : ''}`}
                        onClick={() => setUser((current) => ({ ...current, className: option }))}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  <button className="primary-button" onClick={continueWithTemplate} disabled={loading}>
                    {loading ? 'Loading...' : 'Enter Chat Interface'}
                  </button>
                </>
              )}

              {step === 'teacher-setup' && (
                <TimetableForm
                  mode="teacher"
                  title="Teacher Timetable Management"
                  subtitle="Add or update a lecture, then enter the dashboard to view your schedule and chat."
                  entry={teacherDraft}
                  entries={teacherLectures}
                  onEntryChange={setTeacherDraft}
                  onSave={saveTeacherLecture}
                  onSecondaryAction={openTeacherDashboard}
                  loading={loading}
                />
              )}

              {statusMessage && <p className="status-text">{statusMessage}</p>}
            </div>

            <div className="glass-card preview-card">
              <div className="section-heading">
                <span className="eyebrow">Preview</span>
                <h2>What The Bot Can Do</h2>
                <p>Natural language support without external AI APIs.</p>
              </div>
              <ul className="preview-list">
                <li>Which lecture is at 9:30?</li>
                <li>What is my next lecture?</li>
                <li>When is Nirmal Sir&apos;s lecture?</li>
                <li>Show today&apos;s schedule</li>
              </ul>

              {selectedTemplate && (
                <div className="template-preview">
                  <h3>{user.className} Snapshot</h3>
                  <div className="preview-days">
                    {DAY_OPTIONS.slice(0, 3).map((day) => (
                      <div key={day} className="preview-day-card">
                        <strong>{day}</strong>
                        <span>{selectedTemplate[day]?.length || 0} lectures</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        ) : (
          <section className="dashboard-grid">
            <div className="glass-card chat-panel">
              <div className="chat-header">
                <div>
                  <span className="eyebrow">Live Assistant</span>
                  <h2>{user.role === 'teacher' ? 'Teacher Dashboard' : 'Student Chat Interface'}</h2>
                </div>
                <div className="chat-meta">
                  <span>{user.name}</span>
                  <span>{user.role === 'teacher' ? user.teacherName || user.name : user.className || 'Custom timetable'}</span>
                </div>
              </div>

              <div className="quick-actions">
                {quickActions.map((action) => (
                  <button key={action} className="chip-button" onClick={() => sendMessage(action)}>
                    {action}
                  </button>
                ))}
              </div>

              <ChatBox messages={messages} loading={chatLoading} />
              <InputBox onSend={sendMessage} loading={chatLoading} />
            </div>

            <div className="side-column">
              <SchedulePanel todayData={todayData} role={user.role} />

              {user.role === 'teacher' && (
                <div className="glass-card compact-panel">
                  <TimetableForm
                    mode="teacher"
                    title="Add / Update Timetable"
                    subtitle="Manage your lectures without leaving the dashboard."
                    entry={teacherDraft}
                    entries={teacherLectures}
                    onEntryChange={setTeacherDraft}
                    onSave={saveTeacherLecture}
                    loading={loading}
                    compact
                  />
                </div>
              )}
            </div>

            <NotificationSystem lectures={todayData.lectures} role={user.role} />
          </section>
        )}
      </main>
    </div>
  )
}

export default App
