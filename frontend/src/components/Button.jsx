import { useState } from 'react'

function Button({
  children,
  className = '',
  variant = 'ghost',
  active = false,
  loading = false,
  onMouseDown,
  ...props
}) {
  const [ripples, setRipples] = useState([])

  const handleMouseDown = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height) * 1.2
    const ripple = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      size,
    }

    setRipples((current) => [...current, ripple])
    window.setTimeout(() => {
      setRipples((current) => current.filter((item) => item.id !== ripple.id))
    }, 650)

    if (onMouseDown) {
      onMouseDown(event)
    }
  }

  const handleMouseMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    // Calculate relative mouse position
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    event.currentTarget.style.setProperty('--mouse-x', `${x}px`)
    event.currentTarget.style.setProperty('--mouse-y', `${y}px`)

    if (props.onMouseMove) {
      props.onMouseMove(event)
    }
  }

  const classes = [
    'ui-button',
    `ui-button--${variant}`,
    active ? 'is-active' : '',
    loading ? 'is-loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button 
      {...props} 
      type={props.type || 'button'} 
      className={classes} 
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
    >
      <span className="ui-button__spotlight" aria-hidden="true" />
      <span className="ui-button__content">
        {loading && <span className="button-spinner" aria-hidden="true" />}
        {children}
      </span>
      <span className="ui-button__ripple-layer" aria-hidden="true">
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="ui-button__ripple"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: ripple.size,
              height: ripple.size,
            }}
          />
        ))}
      </span>
    </button>
  )
}

export default Button
