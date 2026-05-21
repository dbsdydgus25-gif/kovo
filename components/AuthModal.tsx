'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AuthModalProps {
  onClose: () => void
}

export default function AuthModal({ onClose }: AuthModalProps) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleGoogleLogin() {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  async function handleKakaoLogin() {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-[480px] bg-white rounded-t-3xl p-6 pb-10 fade-in-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-6" />

        <div className="flex items-center gap-2 mb-2">
          <div className="relative">
            <div className="w-8 h-8 rounded-lg bg-[#0038A8] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="white" />
              </svg>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#C60C30] border-2 border-white" />
          </div>
          <h2 className="text-[20px] font-black text-[#1C1917]">VOICE 시작하기</h2>
        </div>
        <p className="text-[13px] text-[#78716C] mb-1.5">
          편향 없이, 내 시각으로.
        </p>
        <p className="text-[12px] text-gray-400 mb-6">
          로그인 후 투표하면 연령·성별·지역 인사이트와<br/>발의자 정보가 공개돼요
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleKakaoLogin}
            disabled={loading}
            className="h-[52px] rounded-2xl font-semibold text-[15px] btn-press flex items-center justify-center gap-3 disabled:opacity-60"
            style={{ background: '#FEE500', color: '#191919' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#191919">
              <path d="M12 3C6.48 3 2 6.48 2 10.8C2 13.44 3.44 15.76 5.72 17.2L4.8 20.76C4.72 21.08 5.08 21.32 5.36 21.12L9.48 18.44C10.28 18.6 11.12 18.6 12 18.6C17.52 18.6 22 15.12 22 10.8C22 6.48 17.52 3 12 3Z"/>
            </svg>
            카카오로 계속하기
          </button>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="h-[52px] rounded-2xl font-semibold text-[15px] btn-press flex items-center justify-center gap-3 bg-white border-2 border-gray-200 text-[#1C1917] disabled:opacity-60"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            구글로 계속하기
          </button>
        </div>

        <p className="text-[11px] text-gray-400 text-center mt-4">
          로그인 시 개인정보 처리방침에 동의하며, 익명으로 활동합니다
        </p>
      </div>
    </div>
  )
}
