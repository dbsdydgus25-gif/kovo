'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

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
    href: '/news',
    label: '뉴스',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="4" width="20" height="16" rx="2" fill={active ? '#0038A8' : 'none'} stroke={active ? '#0038A8' : '#9CA3AF'} strokeWidth="2" />
        <path d="M6 9H12M6 13H18M6 17H14" stroke={active ? 'white' : '#9CA3AF'} strokeWidth="1.8" strokeLinecap="round" />
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

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-100 z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around h-[60px]">
        {navItems.map(({ href, label, icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-0.5 flex-1 py-2 btn-press"
            >
              {icon(active)}
              <span
                className="text-[10px] font-medium"
                style={{ color: active ? '#0038A8' : '#9CA3AF' }}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
