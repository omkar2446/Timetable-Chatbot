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
    <button {...props} type={props.type || 'button'} className={classes} onMouseDown={handleMouseDown}>
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
