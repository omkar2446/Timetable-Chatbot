import { useEffect, useRef } from 'react'

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
      {messages.map((message) => (
        <article key={message.id} className={`chat-bubble ${message.sender}`}>
          <p>{message.text}</p>
          <span>{message.time}</span>
        </article>
      ))}
      {loading && (
        <article className="chat-bubble bot pending">
          <p>Thinking about your timetable...</p>
        </article>
      )}
    </div>
  )
}

export default ChatBox
