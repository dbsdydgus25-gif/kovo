'use client'

import { useState } from 'react'
import ShareSheet from './ShareSheet'

export default function ShareButton({ title }: { title: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-9 h-9 flex items-center justify-center btn-press"
        aria-label="공유"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="18" cy="5" r="3" stroke="#1C1917" strokeWidth="2"/>
          <circle cx="6" cy="12" r="3" stroke="#1C1917" strokeWidth="2"/>
          <circle cx="18" cy="19" r="3" stroke="#1C1917" strokeWidth="2"/>
          <path d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49" stroke="#1C1917" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
      {open && <ShareSheet title={title} onClose={() => setOpen(false)} />}
    </>
  )
}
