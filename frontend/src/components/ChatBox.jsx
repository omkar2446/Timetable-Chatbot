import { useEffect, useRef } from 'react'
import LoadingSkeleton from './LoadingSkeleton'
import ReactMarkdown from 'react-markdown'

function ChatBox({ messages, loading }) {
  const viewportRef = useRef(null)

  useEffect(() => {
    viewportRef.current?.scrollTo({
      top: viewportRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, loading])

  return (
    <div className="chat-box" ref={viewportRef}>
      {!messages.length && !loading && (
        <div className="chat-empty">
          <strong>Start the conversation</strong>
          <p>Ask about class timing, teacher schedules, today's lectures, or the next upcoming session.</p>
        </div>
      )}
      {messages.map((message) => (
        <article key={message.id} className={`message-blob ${message.sender}`}>
          <div className="message-content">
            <ReactMarkdown>{message.text}</ReactMarkdown>
          </div>
          <span className="message-time">{message.time}</span>
        </article>
      ))}
      {loading && (
        <article className="message-blob bot pending">
          <LoadingSkeleton type="typing" className="chat-skeleton" />
        </article>
      )}
    </div>
  )
}

export default ChatBox
