import { useMemo, useState, useRef, useEffect } from 'react'
import Button from './Button'

const SUGGESTION_DICTIONARY = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
  'schedule', 'lecture', 'lectures', 'class', 'classes', 'today', 'next', 
  'current', 'teacher', 'timetable', 'upcoming', 'ongoing',
  'tell', 'show', 'what', 'when', 'who', 'time', 'morning', 
  'afternoon', 'evening', 'tomorrow', 'hello', 'about'
]

function InputBox({ onSend, loading }) {
  const [message, setMessage] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0)
  const textareaRef = useRef(null)

  const speechRecognition = useMemo(
    () => window.SpeechRecognition || window.webkitSpeechRecognition,
    [],
  )

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }

  useEffect(() => {
    adjustTextareaHeight()
    const lastWord = message.split(' ').pop()
    if (lastWord.length >= 2) {
      const matched = SUGGESTION_DICTIONARY.filter(word => 
        word.toLowerCase().startsWith(lastWord.toLowerCase()) && 
        word.toLowerCase() !== lastWord.toLowerCase()
      )
      setSuggestions(matched)
      setActiveSuggestionIndex(0)
    } else {
      setSuggestions([])
    }
  }, [message])

  const insertSuggestion = (word) => {
    const words = message.split(' ')
    words.pop()
    words.push(word)
    setMessage(words.join(' ') + ' ')
    setSuggestions([])
    textareaRef.current?.focus()
  }

  const handleSend = () => {
    const trimmed = message.trim()
    if (!trimmed) return
    onSend(trimmed)
    setMessage('')
    setSuggestions([])
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKeyDown = (event) => {
    if (suggestions.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActiveSuggestionIndex(prev => (prev + 1) % suggestions.length)
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveSuggestionIndex(prev => (prev - 1 + suggestions.length) % suggestions.length)
        return
      }
      if (event.key === 'Tab' || event.key === 'Enter') {
        event.preventDefault()
        insertSuggestion(suggestions[activeSuggestionIndex])
        return
      }
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  const handleVoiceInput = () => {
    if (!speechRecognition) return
    const recognition = new speechRecognition()
    recognition.lang = 'en-US'
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setMessage((prev) => (prev ? prev + ' ' + transcript : transcript))
    }
    recognition.start()
  }

  return (
    <div className="composer-shell">
      <div className="input-box-wrapper" style={{ position: 'relative' }}>
        {suggestions.length > 0 && (
          <ul className="suggestions-list glass-panel">
            {suggestions.map((suggestion, index) => (
              <li 
                key={suggestion} 
                className={`suggestion-item ${index === activeSuggestionIndex ? 'active' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault()
                  insertSuggestion(suggestion)
                }}
              >
                {suggestion}
              </li>
            ))}
          </ul>
        )}
        <textarea
          ref={textareaRef}
          className="text-input chat-input"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask for today's schedule, next lecture..."
          rows={1}
        />
        <div className="input-actions">
          <Button
            className="action-btn voice-button"
            variant="ghost"
            onClick={handleVoiceInput}
            disabled={!speechRecognition || loading}
            title={speechRecognition ? 'Voice input' : 'Voice input unavailable'}
          >
            🎤
          </Button>
          <Button
            className="action-btn send-button"
            variant="primary"
            onClick={handleSend}
            disabled={loading || !message.trim()}
            loading={loading}
          >
            ↑
          </Button>
        </div>
      </div>
      <div className="composer-meta">
        <span>Press Enter to send, Shift+Enter for new line.</span>
      </div>
    </div>
  )
}

export default InputBox
