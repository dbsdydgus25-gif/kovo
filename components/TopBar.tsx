'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface TopBarProps {
  title?: string
  showBack?: boolean
  showLogo?: boolean
  rightAction?: React.ReactNode
}

export default function TopBar({ title, showBack, showLogo = false, rightAction }: TopBarProps) {
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
        ) : (
          <div className="w-9" />
        )}

        <div className="flex-1 flex justify-center">
          {showLogo ? (
            <Link href="/" className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <div className="w-6 h-6 rounded-md bg-[#0038A8] flex items-center justify-center">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="white" />
                    </svg>
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#C60C30] border-2 border-white" />
                </div>
                <span className="text-[19px] font-black text-[#1C1917] tracking-tight">Kovo</span>
              </div>
            </Link>
          ) : (
            <h1 className="text-[17px] font-bold text-[#1C1917] truncate max-w-[220px]">{title}</h1>
          )}
        </div>

        <div className="w-9 flex justify-end">
          {rightAction}
        </div>
      </div>
    </header>
  )
}
