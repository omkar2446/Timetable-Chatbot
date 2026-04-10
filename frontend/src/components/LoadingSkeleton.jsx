function LoadingSkeleton({ lines = 3, className = '', compact = false }) {
  return (
    <div className={`skeleton-stack ${compact ? 'is-compact' : ''} ${className}`.trim()}>
      {Array.from({ length: lines }).map((_, index) => (
        <span
          key={`skeleton-${index + 1}`}
          className="skeleton-line"
          style={{ width: `${100 - index * 9}%` }}
        />
      ))}
    </div>
  )
}

export default LoadingSkeleton
