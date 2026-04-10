import { useEffect, useRef } from 'react'
import LoadingSkeleton from './LoadingSkeleton'

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
        <article key={message.id} className={`chat-bubble ${message.sender}`}>
          <p>{message.text}</p>
          <span>{message.time}</span>
        </article>
      ))}
      {loading && (
        <article className="chat-bubble bot pending">
          <div className="typing-indicator" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <LoadingSkeleton lines={2} compact className="chat-skeleton" />
        </article>
      )}
    </div>
  )
}

export default ChatBox
