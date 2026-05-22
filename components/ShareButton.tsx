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
        {/* paper airplane — like Instagram DM */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M22 2L11 13" stroke="#1C1917" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="#1C1917" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && <ShareSheet title={title} onClose={() => setOpen(false)} />}
    </>
  )
}
