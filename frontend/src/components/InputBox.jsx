import { useMemo, useState, useRef, useEffect } from 'react'
import Button from './Button'

function InputBox({ onSend, loading }) {
  const [message, setMessage] = useState('')
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
  }, [message])

  const handleSend = () => {
    const trimmed = message.trim()
    if (!trimmed) return
    onSend(trimmed)
    setMessage('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKeyDown = (event) => {
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
      <div className="input-box-wrapper">
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
