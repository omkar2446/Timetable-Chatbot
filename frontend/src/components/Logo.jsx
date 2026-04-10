import React from 'react'

export default function Logo({ className = '' }) {
  return (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Col 1 - Blue (Left) */}
      <circle cx="15" cy="30" r="3.5" fill="#4285F4" />
      <circle cx="15" cy="50" r="3.5" fill="#4285F4" />
      <circle cx="15" cy="70" r="3.5" fill="#4285F4" />
      
      {/* Col 2 - Red */}
      <circle cx="32.5" cy="20" r="4.5" fill="#EA4335" />
      <circle cx="32.5" cy="40" r="4.5" fill="#EA4335" />
      <circle cx="32.5" cy="60" r="4.5" fill="#EA4335" />
      <circle cx="32.5" cy="80" r="4.5" fill="#EA4335" />
      
      {/* Col 3 - Yellow (Center) */}
      <circle cx="50" cy="10" r="5.5" fill="#FBBC05" />
      <circle cx="50" cy="30" r="5.5" fill="#FBBC05" />
      <circle cx="50" cy="50" r="5.5" fill="#FBBC05" />
      <circle cx="50" cy="70" r="5.5" fill="#FBBC05" />
      <circle cx="50" cy="90" r="5.5" fill="#FBBC05" />
      
      {/* Col 4 - Green */}
      <circle cx="67.5" cy="20" r="7" fill="#34A853" />
      <circle cx="67.5" cy="40" r="7" fill="#34A853" />
      <circle cx="67.5" cy="60" r="7" fill="#34A853" />
      <circle cx="67.5" cy="80" r="7" fill="#34A853" />
      
      {/* Col 5 - Blue (Right) */}
      <circle cx="85" cy="30" r="8.5" fill="#4285F4" />
      <circle cx="85" cy="50" r="8.5" fill="#4285F4" />
      <circle cx="85" cy="70" r="8.5" fill="#4285F4" />
    </svg>
  )
}
