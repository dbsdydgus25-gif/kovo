'use client'

import { useTransition, useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AuthModal from './AuthModal'

const navItems = [
  {
    href: '/',
    label: '홈',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M3 9.5L12 3L21 9.5V20C21 20.6 20.6 21 20 21H15V15H9V21H4C3.4 21 3 20.6 3 20V9.5Z"
          fill={active ? '#0038A8' : 'none'}
          stroke={active ? '#0038A8' : '#9CA3AF'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: '/insights',
    label: '인사이트',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="12" width="4" height="9" rx="1" fill={active ? '#0038A8' : 'none'} stroke={active ? '#0038A8' : '#9CA3AF'} strokeWidth="2" />
        <rect x="10" y="7" width="4" height="14" rx="1" fill={active ? '#0038A8' : 'none'} stroke={active ? '#0038A8' : '#9CA3AF'} strokeWidth="2" />
        <rect x="17" y="3" width="4" height="18" rx="1" fill={active ? '#0038A8' : 'none'} stroke={active ? '#0038A8' : '#9CA3AF'} strokeWidth="2" />
      </svg>
    ),
  },
  {
    href: '/community',
    label: '커뮤니티',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"
          fill={active ? '#0038A8' : 'none'} stroke={active ? '#0038A8' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: '/profile',
    label: '내정보',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" fill={active ? '#0038A8' : 'none'} stroke={active ? '#0038A8' : '#9CA3AF'} strokeWidth="2" />
        <path d="M4 20C4 17 7.6 14 12 14C16.4 14 20 17 20 20" stroke={active ? '#0038A8' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [showAuth, setShowAuth] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data.session?.user)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsLoggedIn(!!session?.user)
    })
    return () => subscription.unsubscribe()
  }, [])

  function handleNavClick(href: string) {
    if (href === '/profile' && !isLoggedIn) {
      setShowAuth(true)
      return
    }
    startTransition(() => router.push(href))
  }

  return (
    <>
      <nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-100 z-50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-around h-[60px]">
          {navItems.map(({ href, label, icon }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href))
            return (
              <button
                key={href}
                onClick={() => handleNavClick(href)}
                className="flex flex-col items-center gap-0.5 flex-1 py-2 btn-press"
              >
                {icon(active)}
                <span
                  className="text-[10px] font-medium"
                  style={{ color: active ? '#0038A8' : '#9CA3AF' }}
                >
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  )
}
