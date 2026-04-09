import { useMemo, useState } from 'react'

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
    <div className="input-box">
      <button className="voice-button" onClick={handleVoiceInput} disabled={!speechRecognition || loading}>
        Mic
      </button>
      <input
        className="text-input chat-input"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        onKeyDown={(event) => event.key === 'Enter' && handleSend()}
        placeholder="Ask about lectures, teachers, or your next class..."
      />
      <button className="primary-button" onClick={handleSend} disabled={loading}>
        Send
      </button>
    </div>
  )
}

export default InputBox
