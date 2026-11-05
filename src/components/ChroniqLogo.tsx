import React from 'react'
import logoUrl from '@/assets/logo.png'

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
  const base = import.meta.env.BASE_URL || './'
  const fallback = base.endsWith('/') ? `${base}logo.png` : `${base}/logo.png`

  return (
    <img
      src={logoUrl || fallback}
      alt={alt}
      width={size}
      height={size}
      className={`object-contain ${className}`}
      onError={(e) => {
        const target = e.currentTarget
        if (target.src !== fallback && !target.src.endsWith(fallback)) {
          target.src = fallback
        } else if (!target.src.endsWith('logo.png')) {
          target.src = './logo.png'
        }
      }}
    />
  )
}

export default ChroniqLogo
