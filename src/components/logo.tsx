export function LifeOSLogo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <div className={`${className} flex items-center justify-center`}>
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Outer rounded square */}
        <rect x="2" y="2" width="28" height="28" rx="8" fill="#111827" />
        {/* Inner orbit circle */}
        <circle cx="16" cy="16" r="8" stroke="#059669" strokeWidth="1.5" fill="none" opacity="0.6" />
        {/* Center dot - the "O" */}
        <circle cx="16" cy="16" r="3.5" fill="#059669" />
        {/* Orbital dot */}
        <circle cx="16" cy="8" r="2" fill="white" opacity="0.9" />
      </svg>
    </div>
  )
}

export function LifeOSLogoSmall({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <div className={`${className} flex items-center justify-center`}>
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect x="1.5" y="1.5" width="21" height="21" rx="6" fill="#111827" />
        <circle cx="12" cy="12" r="5.5" stroke="#059669" strokeWidth="1.2" fill="none" opacity="0.6" />
        <circle cx="12" cy="12" r="2.5" fill="#059669" />
        <circle cx="12" cy="6.5" r="1.5" fill="white" opacity="0.9" />
      </svg>
    </div>
  )
}

export function LifeOSLogoFull({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LifeOSLogo className="w-7 h-7" />
      <div className="flex items-baseline">
        <span className="font-bold text-sm tracking-tight">Life</span>
        <span className="font-bold text-sm tracking-tight text-secondary">OS</span>
      </div>
    </div>
  )
}

export function LifeOSLogoFullSmall({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <LifeOSLogoSmall className="w-5 h-5" />
      <div className="flex items-baseline">
        <span className="font-semibold text-xs tracking-tight">Life</span>
        <span className="font-semibold text-xs tracking-tight text-secondary">OS</span>
      </div>
    </div>
  )
}
