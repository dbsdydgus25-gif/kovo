'use client'

import { useState } from 'react'
import Portal from './Portal'

interface Props {
  title: string
  onClose: () => void
}

function cleanUrl() {
  if (typeof window === 'undefined') return ''
  const u = new URL(window.location.href)
  u.searchParams.delete('_dv')
  return u.toString()
}

export default function ShareSheet({ title, onClose }: Props) {
  const [copied, setCopied] = useState(false)
  const url = cleanUrl()

  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => { setCopied(false); onClose() }, 1200)
    } catch { /* blocked */ }
  }

  function shareKakao() {
    // KakaoTalk URL scheme (mobile) → web fallback
    const kakaoUrl = `https://story.kakao.com/share?url=${encodeURIComponent(url)}`
    window.open(kakaoUrl, '_blank', 'noopener,noreferrer')
    onClose()
  }

  async function shareInstagram() {
    // Instagram은 직접 URL 공유 미지원 → 링크 복사 후 앱으로 유도
    try {
      await navigator.clipboard.writeText(url)
    } catch { /* ignore */ }
    // 모바일에서 인스타 앱 열기 시도
    const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent)
    if (isMobile) {
      window.location.href = 'instagram://'
      // fallback: 바로 닫기
      setTimeout(onClose, 800)
    } else {
      window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer')
      onClose()
    }
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[100] flex items-end justify-center"
        style={{ background: 'rgba(0,0,0,0.45)' }}
        onClick={handleBackdrop}
      >
        <div
          className="w-full max-w-[480px] bg-white rounded-t-3xl"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom,0px),20px)' }}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
          </div>

          <div className="px-5 pt-4 pb-1 flex items-center justify-between">
            <div>
              <h3 className="text-[16px] font-black text-[#1C1917]">공유하기</h3>
              <p className="text-[12px] text-gray-400 mt-0.5 truncate max-w-[280px]">{title}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6L18 18" stroke="#374151" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* 3 platform buttons */}
          <div className="flex items-center justify-around px-8 py-5">
            {/* 링크 복사 */}
            <button onClick={copyLink} className="flex flex-col items-center gap-2 btn-press">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center transition-colors"
                style={{ background: copied ? '#D1FAE5' : '#F3F4F6' }}
              >
                {copied ? (
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17L4 12" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span className="text-[12px] font-medium text-[#1C1917]">
                {copied ? '복사됨!' : '링크 복사'}
              </span>
            </button>

            {/* 카카오톡 */}
            <button onClick={shareKakao} className="flex flex-col items-center gap-2 btn-press">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: '#FEE500' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="#191919">
                  <path d="M12 3C6.48 3 2 6.48 2 10.8C2 13.44 3.44 15.76 5.72 17.2L4.8 20.76C4.72 21.08 5.08 21.32 5.36 21.12L9.48 18.44C10.28 18.6 11.12 18.6 12 18.6C17.52 18.6 22 15.12 22 10.8C22 6.48 17.52 3 12 3Z"/>
                </svg>
              </div>
              <span className="text-[12px] font-medium text-[#1C1917]">카카오톡</span>
            </button>

            {/* 인스타그램 */}
            <button onClick={shareInstagram} className="flex flex-col items-center gap-2 btn-press">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
              </div>
              <span className="text-[12px] font-medium text-[#1C1917]">인스타그램</span>
            </button>
          </div>

          {/* 링크 미리보기 */}
          <div className="mx-5 mb-4 bg-gray-50 rounded-2xl px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#0038A8] flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="white"/>
              </svg>
            </div>
            <span className="text-[11px] text-gray-400 font-mono truncate">{url}</span>
          </div>
        </div>
      </div>
    </Portal>
  )
}
