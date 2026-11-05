import React from 'react'

interface ChroniqLogoProps {
  className?: string
  size?: number
}

export const ChroniqLogo: React.FC<ChroniqLogoProps> = ({ className = 'w-8 h-8', size }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={className}
      fill="none"
    >
      <defs>
        <linearGradient id="bgGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#221F1C" />
          <stop offset="100%" stopColor="#141211" />
        </linearGradient>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E5CA9E" />
          <stop offset="35%" stopColor="#C5A46E" />
          <stop offset="70%" stopColor="#D9BE8D" />
          <stop offset="100%" stopColor="#9C7944" />
        </linearGradient>
        <linearGradient id="ringGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#C5A46E" stopOpacity="0.2" />
          <stop offset="50%" stopColor="#E5CA9E" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#C5A46E" stopOpacity="0.2" />
        </linearGradient>
        <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <rect width="512" height="512" rx="128" fill="url(#bgGlow)" />
      <rect
        width="508"
        height="508"
        x="2"
        y="2"
        rx="126"
        fill="none"
        stroke="url(#goldGrad)"
        strokeWidth="1.5"
        strokeOpacity="0.4"
      />
      {/* Dial Calibration Marks */}
      <circle
        cx="256"
        cy="256"
        r="172"
        fill="none"
        stroke="url(#ringGrad)"
        strokeWidth="1.5"
        strokeDasharray="2 10"
      />
      <circle
        cx="256"
        cy="256"
        r="144"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.06"
        strokeWidth="1"
      />
      {/* Chroniq Dynamic 'C' & Hourglass Precision Glyph */}
      <path
        d="M 256 124 C 328.9 124 388 183.1 388 256 C 388 328.9 328.9 388 256 388 C 183.1 388 124 328.9 124 256 C 124 205.8 152 162.2 193 140"
        fill="none"
        stroke="url(#goldGrad)"
        strokeWidth="16"
        strokeLinecap="round"
      />
      {/* Precision Center Axis and Hands */}
      <circle cx="256" cy="256" r="14" fill="#141211" stroke="url(#goldGrad)" strokeWidth="4" />
      <circle cx="256" cy="256" r="5" fill="#E5CA9E" />
      <line
        x1="256"
        y1="242"
        x2="256"
        y2="170"
        stroke="url(#goldGrad)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <line
        x1="256"
        y1="256"
        x2="318"
        y2="280"
        stroke="url(#goldGrad)"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      {/* 12, 3, 6, 9 Diamond Indices */}
      <polygon points="256,104 259,112 256,120 253,112" fill="#E5CA9E" />
      <polygon points="408,256 400,259 392,256 400,253" fill="#E5CA9E" opacity="0.7" />
      <polygon points="256,408 259,400 256,392 253,400" fill="#E5CA9E" opacity="0.7" />
      <polygon points="104,256 112,259 120,256 112,253" fill="#E5CA9E" opacity="0.7" />
    </svg>
  )
}

