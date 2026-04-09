export const DAY_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const CLASS_OPTIONS = ['SecondYear_A', 'SecondYear_B', 'ThirdYear', 'FourthYear']

export const getGreetingByHour = (hour) => {
  if (hour >= 5 && hour < 12) {
    return 'Good Morning ☀️'
  }
  if (hour >= 12 && hour < 17) {
    return 'Good Afternoon 🌤️'
  }
  return 'Good Evening 🌙'
}

export const parseMinutes = (value) => {
  if (!value) {
    return null
  }
  const normalized = value.trim().toUpperCase()
  const match = normalized.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/)
  if (!match) {
    return null
  }
  let hour = Number(match[1])
  const minute = Number(match[2])
  const meridiem = match[3]

  if (meridiem === 'PM' && hour !== 12) {
    hour += 12
  }
  if (meridiem === 'AM' && hour === 12) {
    hour = 0
  }
  return hour * 60 + minute
}

export const formatClock = () =>
  new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

const createMessage = (sender, text) => ({
  id: `${sender}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  sender,
  text,
  time: formatClock(),
})

export const createBotMessage = (text) => createMessage('bot', text)
export const createUserMessage = (text) => createMessage('user', text)
