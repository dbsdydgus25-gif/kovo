'use client'

import { useState, useEffect } from 'react'
import AuthModal from '@/components/AuthModal'

export default function ProfileLoginPrompt() {
  const [showModal, setShowModal] = useState(false)

  // 페이지 로드 직후 자동으로 모달 열기
  useEffect(() => {
    const t = setTimeout(() => setShowModal(true), 150)
    return () => clearTimeout(t)
  }, [])

  return (
    <>
      <div className="text-center px-8">
        <div className="w-20 h-20 rounded-full bg-white border border-gray-100 flex items-center justify-center mx-auto mb-5 shadow-sm">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" stroke="#9CA3AF" strokeWidth="2"/>
            <path d="M4 20C4 17 7.6 14 12 14C16.4 14 20 17 20 20" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <h2 className="text-[20px] font-black text-[#1C1917] mb-2">로그인이 필요해요</h2>
        <p className="text-[13px] text-gray-400 leading-relaxed mb-7">
          투표 기록, 성향 분석 등<br/>
          다양한 정보를 확인하려면<br/>
          로그인해주세요
        </p>
        <button
          onClick={() => setShowModal(true)}
          className="px-6 py-3 bg-[#0038A8] text-white rounded-2xl font-bold text-[15px] btn-press"
        >
          로그인 하기
        </button>
      </div>

      {showModal && <AuthModal onClose={() => setShowModal(false)} />}
    </>
  )
}
