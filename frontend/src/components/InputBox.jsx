import { useMemo, useState } from 'react'
import Button from './Button'

function InputBox({ onSend, loading }) {
  const [message, setMessage] = useState('')

  const speechRecognition = useMemo(
    () => window.SpeechRecognition || window.webkitSpeechRecognition,
    [],
  )

  const handleSend = () => {
    const trimmed = message.trim()
    if (!trimmed) {
      return
    }
    onSend(trimmed)
    setMessage('')
  }

  const handleVoiceInput = () => {
    if (!speechRecognition) {
      return
    }
    const recognition = new speechRecognition()
    recognition.lang = 'en-US'
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setMessage(transcript)
    }
    recognition.start()
  }

  return (
    <div className="composer-shell">
      <div className="composer-meta">
        <span>Ask flexible questions like "monday 10 clock" or "next lecture"</span>
        <span>{speechRecognition ? 'Voice input ready' : 'Voice input unavailable'}</span>
      </div>
      <div className="input-box">
        <Button
          className="voice-button"
          variant="voice"
          onClick={handleVoiceInput}
          disabled={!speechRecognition || loading}
        >
          Mic
        </Button>
        <input
          className="text-input chat-input"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && handleSend()}
          placeholder="Ask about lectures, teachers, or your next class..."
        />
        <Button className="send-button" variant="primary" onClick={handleSend} disabled={loading} loading={loading}>
          Send
        </Button>
      </div>
    </div>
  )
}

export default InputBox
