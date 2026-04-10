function LoadingSkeleton({ lines = 3, className = '', compact = false, type = 'stack' }) {
  if (type === 'typing') {
    return (
      <div className={`typing-indicator ${className}`}>
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    )
  }

  return (
    <div className={`skeleton-stack ${compact ? 'is-compact' : ''} ${className}`.trim()}>
      {Array.from({ length: lines }).map((_, index) => (
        <span
          key={`skeleton-${index + 1}`}
          className="skeleton-line"
          style={{ width: `${100 - index * 9}%`, animationDelay: `${index * 150}ms` }}
        />
      ))}
    </div>
  )
}

export default LoadingSkeleton
