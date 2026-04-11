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
import ParticleBackground from './components/ParticleBackground'
import Logo from './components/Logo'
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

// Layout constants removed for a cleaner chat interface

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme-preference') || 'light')
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
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme-preference', theme)
  }, [theme])

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light')

  // Vanta Birds effect removed for cleaner aesthetic

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

  // Hero stats removed

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

  const handleBack = () => {
    setStatusMessage('')
    switch (step) {
      case 'role':
        setStep('name')
        break
      case 'student-mode':
      case 'teacher-setup':
        setStep('role')
        break
      case 'student-upload':
      case 'student-template':
        setStep('student-mode')
        break
      default:
        break
    }
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
    <div className="app-shell">
      <ParticleBackground />
      <main className="app-frame">
        {step !== 'chat' ? (
          <section className="setup-container">
            <div className="glass-panel setup-panel fade-in">
              <div className="brand-header" style={{ justifyContent: 'space-between', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {step !== 'name' && step !== 'chat' && (
                    <Button
                      variant="ghost"
                      onClick={handleBack}
                      style={{ padding: '0.25rem 0.5rem', marginRight: '4px' }}
                      title="Go Back"
                    >
                      ←
                    </Button>
                  )}
                  <Logo className="brand-logo" />
                  <h1>ParvAI</h1>
                </div>
                <Button className="ui-button--mini" variant="ghost" onClick={toggleTheme}>
                  {theme === 'light' ? '🌙' : '☀️'}
                </Button>
              </div>

              {step === 'name' && (
                <div className="setup-step">
                  <div className="step-content">
                    <h2>Welcome</h2>
                    <p>Enter your name to initialize the assistant.</p>
                  </div>
                  <div className="form-group">
                    <input
                      className="input-base"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      onKeyDown={(event) => event.key === 'Enter' && handleNameSubmit()}
                      placeholder="Your name"
                      autoFocus
                    />
                    <Button className="btn-primary w-full" variant="primary" onClick={handleNameSubmit}>
                      Continue
                    </Button>
                  </div>
                </div>
              )}

              {step === 'role' && <RoleSelector name={user.name} onSelect={handleRoleSelect} />}

              {step === 'student-mode' && (
                <div className="setup-step">
                  <div className="step-content">
                    <h2>Select Mode</h2>
                    <p>Choose how you want to set up your schedule.</p>
                  </div>
                  <div className="grid-options">
                    <Button className="btn-card" variant="option" onClick={() => handleStudentModeSelect('custom')}>
                      <strong>Custom Schedule</strong>
                      <span>Create and upload your own timetable.</span>
                    </Button>
                    <Button className="btn-card" variant="option" onClick={() => handleStudentModeSelect('template')}>
                      <strong>Use Template</strong>
                      <span>Select an existing class template.</span>
                    </Button>
                  </div>
                </div>
              )}

              {step === 'student-upload' && (
                <TimetableForm
                  mode="student"
                  title="Custom Timetable"
                  subtitle="Add your lectures and save your schedule."
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
                <div className="setup-step">
                  <div className="step-content">
                    <h2>Select Class</h2>
                    <p>Pick your year and division.</p>
                  </div>
                  <div className="chip-group">
                    {CLASS_OPTIONS.map((option) => (
                      <Button
                        key={option}
                        className={`chip ${user.className === option ? 'active' : ''}`}
                        variant="pill"
                        active={user.className === option}
                        onClick={() => setUser((current) => ({ ...current, className: option }))}
                      >
                        {option}
                      </Button>
                    ))}
                  </div>
                  <Button className="btn-primary w-full" variant="primary" onClick={continueWithTemplate} disabled={loading} loading={loading}>
                    {loading ? 'Entering...' : 'Enter Chat'}
                  </Button>
                </div>
              )}

              {step === 'teacher-setup' && (
                <TimetableForm
                  mode="teacher"
                  title="Teacher Dashboard Setup"
                  subtitle="Configure your schedule or continue to chat."
                  entry={teacherDraft}
                  entries={teacherLectures}
                  onEntryChange={setTeacherDraft}
                  onSave={saveTeacherLecture}
                  onSecondaryAction={openTeacherDashboard}
                  loading={loading}
                />
              )}

              {statusMessage && (
                <div className="status-toast">
                  <span className="status-indicator"></span>
                  <p>{statusMessage}</p>
                </div>
              )}
            </div>
          </section>
        ) : (
          <section className="dashboard-layout fade-in">
            <div className="chat-container glass-panel">
              <header className="chat-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <Button
                    variant="ghost"
                    onClick={() => setStep(user.role === 'teacher' ? 'teacher-setup' : 'student-mode')}
                    style={{ padding: '0.25rem 0.5rem', marginRight: '4px' }}
                    title="Go Back to Setup"
                  >
                    ←
                  </Button>
                  <Logo className="brand-logo" style={{ width: '28px', height: '28px' }} />
                  <div>
                    <h2 className="header-title">ParvAI</h2>
                    <span className="header-subtitle">
                      {user.role === 'teacher' ? 'Teacher Mode' : 'Student Mode'}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <Button className="ui-button--mini" variant="ghost" onClick={toggleTheme}>
                    {theme === 'light' ? '🌙' : '☀️'}
                  </Button>
                  <div className="user-badge">
                    {user.name[0].toUpperCase()}
                  </div>
                </div>
              </header>

              <div className="quick-prompts">
                {quickActions.map((action) => (
                  <Button key={action} className="prompt-chip" variant="chip" onClick={() => sendMessage(action)}>
                    {action}
                  </Button>
                ))}
              </div>

              <div className="chat-view">
                <ChatBox messages={messages} loading={chatLoading} />
              </div>
              <div className="input-view">
                <InputBox onSend={sendMessage} loading={chatLoading} />
              </div>
            </div>

            <aside className="sidebar-container">
              <SchedulePanel todayData={todayData} role={user.role} loading={isTodayLoading} />
              <NotificationSystem lectures={todayData.lectures} nextLecture={todayData.nextLecture} />

              {user.role === 'teacher' && (
                <div className="glass-panel side-panel">
                  <TimetableForm
                    mode="teacher"
                    title="Quick Update"
                    subtitle="Add lectures instantly."
                    entry={teacherDraft}
                    entries={teacherLectures}
                    onEntryChange={setTeacherDraft}
                    onSave={saveTeacherLecture}
                    loading={loading}
                    compact
                  />
                </div>
              )}
            </aside>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
