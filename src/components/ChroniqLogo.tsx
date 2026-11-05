import React from 'react'

interface ChroniqLogoProps {
  className?: string
  size?: number
  alt?: string
}

export const ChroniqLogo: React.FC<ChroniqLogoProps> = ({
  className = 'w-8 h-8',
  size,
  alt = 'Chroniq',
}) => {
  return (
    <img
      src="/logo.png"
      alt={alt}
      width={size}
      height={size}
      className={`object-contain ${className}`}
    />
  )
}

export default ChroniqLogo
