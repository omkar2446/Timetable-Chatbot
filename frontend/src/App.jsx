import { startTransition, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import './App.css'
import Button from './components/Button'
import ChatBox from './components/ChatBox'
import InputBox from './components/InputBox'
import LoadingSkeleton from './components/LoadingSkeleton'
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

const promptExamples = [
  'Which lecture is at 9:30?',
  'What is my next lecture?',
  'When is Nirmal Sir lecture today?',
  'Monday 10 a clock lecture',
]

function App() {
  const appShellRef = useRef(null)
  const birdsEffectRef = useRef(null)
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
  const [isTimetableLoading, setIsTimetableLoading] = useState(true)
  const [isTodayLoading, setIsTodayLoading] = useState(false)
  const hasBootstrapped = useRef(false)

  useEffect(() => {
    if (!appShellRef.current || !window.VANTA?.BIRDS || birdsEffectRef.current) {
      return undefined
    }

    birdsEffectRef.current = window.VANTA.BIRDS({
      el: appShellRef.current,
      mouseControls: true,
      touchControls: true,
      gyroControls: false,
      minHeight: 200.0,
      minWidth: 200.0,
      scale: 1.0,
      scaleMobile: 1.0,
      backgroundAlpha: 0,
      color1: 0xffd166,
      color2: 0xff7b54,
      birdSize: 1.2,
      wingSpan: 24.0,
      speedLimit: 4.0,
      separation: 40.0,
      alignment: 32.0,
      cohesion: 28.0,
      quantity: 3.0,
    })

    return () => {
      birdsEffectRef.current?.destroy()
      birdsEffectRef.current = null
    }
  }, [])

  const quickActions = useMemo(() => {
    if (user.role === 'teacher') {
      return [
        "Show today's schedule",
        'What is my next lecture?',
        `When is ${user.teacherName || user.name}'s lecture?`,
      ]
    }
    return [
      "Show today's schedule",
      'What is my next lecture?',
      'Which lecture is at 9:30?',
    ]
  }, [user.name, user.role, user.teacherName])

  const heroStats = useMemo(
    () => [
      {
        label: 'Supported roles',
        value: 'Student + Teacher',
        note: 'Two tailored onboarding flows',
      },
      {
        label: 'Reminder engine',
        value: '5 min alerts',
        note: 'Browser notifications or fallback alerts',
      },
      {
        label: 'Timetable source',
        value: 'JSON powered',
        note: 'Fast updates without database overhead',
      },
    ],
    [],
  )

  const selectedTemplate = allTimetables?.timetable?.[user.className]
  const dashboardHighlights = useMemo(
    () => [
      {
        label: 'Today',
        value: todayData.day || 'Waiting',
      },
      {
        label: 'Lectures loaded',
        value: `${todayData.lectures?.length || 0}`,
      },
      {
        label: 'Mode',
        value:
          user.role === 'teacher'
            ? 'Teacher Console'
            : user.timetableMode === 'custom'
              ? 'Custom Timetable'
              : user.className || 'Template',
      },
    ],
    [todayData.day, todayData.lectures?.length, user.className, user.role, user.timetableMode],
  )

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
      setIsTimetableLoading(true)
      try {
        const response = await api.get(endpoints.getTimetable)
        setAllTimetables(response.data)
      } catch (error) {
        setStatusMessage(error.message || 'Unable to connect to backend.')
      } finally {
        setIsTimetableLoading(false)
      }
    }
    fetchTimetable()
  }, [])

  const loadTodayForUser = async (targetUser) => {
    if (!targetUser?.role) {
      return
    }
    setIsTodayLoading(true)
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
    } finally {
      setIsTodayLoading(false)
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
      setMessages((current) => [
        ...current,
        createBotMessage('The chatbot could not respond right now. Please try again.'),
      ])
    } finally {
      setChatLoading(false)
    }
  }

  return (
    <div className="app-shell" ref={appShellRef}>
      <div className="background-overlay" aria-hidden="true" />

      <main className="app-frame">
        <section className="hero-panel glass-card scene-card">
          <div className="hero-grid">
            <div className="hero-copy">
              <span className="hero-badge">Competition-ready timetable assistant</span>
              <h1>Modern AI timetable chat for college events and lecture planning.</h1>
              <p>
                Clean onboarding, flexible timetable queries, day-wise schedule visibility, and gentle reminder
                automation in one polished web application.
              </p>
              <div className="hero-tags">
                <span>Responsive dashboard</span>
                <span>Fast JSON backend</span>
                <span>Voice enabled input</span>
                <span>Teacher console</span>
              </div>
            </div>

            <div className="hero-metrics">
              {heroStats.map((item) => (
                <article key={item.label} className="hero-metric-card">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <p>{item.note}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {step !== 'chat' ? (
          <section className="setup-grid">
            <div className="glass-card flow-card scene-card">
              {step === 'name' && (
                <>
                  <div className="section-heading">
                    <span className="eyebrow">Step 1</span>
                    <h2>Enter Your Name</h2>
                    <p>Start with your identity so the interface can personalize the chatbot and save your workflow.</p>
                  </div>
                  <div className="form-row">
                    <input
                      className="text-input"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      onKeyDown={(event) => event.key === 'Enter' && handleNameSubmit()}
                      placeholder="Enter your name"
                    />
                    <Button className="primary-button" variant="primary" onClick={handleNameSubmit}>
                      Continue
                    </Button>
                  </div>
                </>
              )}

              {step === 'role' && <RoleSelector name={user.name} onSelect={handleRoleSelect} />}

              {step === 'student-mode' && (
                <>
                  <div className="section-heading">
                    <span className="eyebrow">Step 3</span>
                    <h2>Choose Student Mode</h2>
                    <p>Upload a custom timetable for the event, or enter directly with a predefined class template.</p>
                  </div>
                  <div className="option-grid">
                    <Button className="option-card" variant="option" onClick={() => handleStudentModeSelect('custom')}>
                      <span className="option-card__eyebrow">Personal workflow</span>
                      <strong>Upload Timetable</strong>
                      <span>Build a custom schedule with multiple lectures and store it against your name.</span>
                    </Button>
                    <Button className="option-card" variant="option" onClick={() => handleStudentModeSelect('template')}>
                      <span className="option-card__eyebrow">Fast start</span>
                      <strong>Select Existing Template</strong>
                      <span>Jump in with a curated academic timetable for your year or division.</span>
                    </Button>
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
                    <p>Choose your year and continue into the polished timetable assistant dashboard.</p>
                  </div>
                  <div className="template-options">
                    {CLASS_OPTIONS.map((option) => (
                      <Button
                        key={option}
                        className="pill-button"
                        variant="pill"
                        active={user.className === option}
                        onClick={() => setUser((current) => ({ ...current, className: option }))}
                      >
                        {option}
                      </Button>
                    ))}
                  </div>
                  <Button className="primary-button" variant="primary" onClick={continueWithTemplate} disabled={loading} loading={loading}>
                    {loading ? 'Loading...' : 'Enter Chat Interface'}
                  </Button>
                </>
              )}

              {step === 'teacher-setup' && (
                <TimetableForm
                  mode="teacher"
                  title="Teacher Timetable Management"
                  subtitle="Add or update a lecture, then open the dashboard to view your schedule and answer timetable questions."
                  entry={teacherDraft}
                  entries={teacherLectures}
                  onEntryChange={setTeacherDraft}
                  onSave={saveTeacherLecture}
                  onSecondaryAction={openTeacherDashboard}
                  loading={loading}
                />
              )}

              {statusMessage && (
                <div className="status-banner">
                  <span className="status-dot" />
                  <p>{statusMessage}</p>
                </div>
              )}
            </div>

            <div className="aside-stack">
              <div className="glass-card preview-card scene-card">
                <div className="section-heading">
                  <span className="eyebrow">Prompt Ideas</span>
                  <h2>What The Bot Understands</h2>
                  <p>Loose natural language, teacher lookups, time windows, and day-wise schedule requests.</p>
                </div>
                <div className="prompt-grid">
                  {promptExamples.map((prompt) => (
                    <article key={prompt} className="prompt-card">
                      <span className="prompt-card__label">Sample query</span>
                      <strong>{prompt}</strong>
                    </article>
                  ))}
                </div>
              </div>

              <div className="glass-card preview-card scene-card">
                <div className="section-heading">
                  <span className="eyebrow">Template Snapshot</span>
                  <h2>{user.className || 'Choose a template to preview'}</h2>
                  <p>Quick lecture counts for the first three weekdays so the user sees immediate structure.</p>
                </div>

                {isTimetableLoading ? (
                  <LoadingSkeleton lines={5} />
                ) : selectedTemplate ? (
                  <div className="preview-days">
                    {DAY_OPTIONS.slice(0, 3).map((day) => (
                      <div key={day} className="preview-day-card">
                        <span>{day}</span>
                        <strong>{selectedTemplate[day]?.length || 0}</strong>
                        <p>lectures scheduled</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-panel">
                    <strong>Waiting for selection</strong>
                    <p>Pick a year template to see how many sessions are scheduled across the week.</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        ) : (
          <section className="dashboard-grid">
            <div className="glass-card chat-panel scene-card">
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

              <div className="dashboard-highlight-row">
                {dashboardHighlights.map((item) => (
                  <article key={item.label} className="highlight-card">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </article>
                ))}
              </div>

              <div className="quick-actions">
                {quickActions.map((action) => (
                  <Button key={action} className="chip-button" variant="chip" onClick={() => sendMessage(action)}>
                    {action}
                  </Button>
                ))}
              </div>

              <ChatBox messages={messages} loading={chatLoading} />
              <InputBox onSend={sendMessage} loading={chatLoading} />
            </div>

            <div className="side-column">
              <SchedulePanel todayData={todayData} role={user.role} loading={isTodayLoading} />
              <NotificationSystem lectures={todayData.lectures} nextLecture={todayData.nextLecture} />

              {user.role === 'teacher' && (
                <div className="glass-card compact-panel scene-card">
                  <TimetableForm
                    mode="teacher"
                    title="Add Or Update Timetable"
                    subtitle="Keep your lecture slots updated without leaving the dashboard."
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
          </section>
        )}
      </main>
    </div>
  )
}

export default App
