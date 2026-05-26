'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface TopBarProps {
  title?: string
  showBack?: boolean
  showLogo?: boolean
  leftAction?: React.ReactNode
  rightAction?: React.ReactNode
}

export default function TopBar({ title, showBack, showLogo = false, leftAction, rightAction }: TopBarProps) {
  const router = useRouter()

  return (
    <header className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white/95 backdrop-blur-md border-b border-gray-100 z-40 h-[56px] flex items-center px-4">
      <div className="flex items-center justify-between w-full">
        {showBack ? (
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center -ml-2 btn-press"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="#1C1917" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : leftAction ? (
          <div className="flex-shrink-0 flex items-center">{leftAction}</div>
        ) : (
          <div className="w-9" />
        )}

        <div className="flex-1 flex justify-center">
          {showLogo ? (
            <Link href="/" className="flex items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/kovo-logo.png" alt="Kovo" className="h-8 w-32 object-cover object-center" />
            </Link>
          ) : (
            <h1 className="text-[17px] font-bold text-[#1C1917] truncate max-w-[220px]">{title}</h1>
          )}
        </div>

        <div className="flex-shrink-0 flex justify-end items-center">
          {rightAction}
        </div>
      </div>
    </header>
  )
}
