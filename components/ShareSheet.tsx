'use client'

import { useState } from 'react'

interface Props {
  title: string
  onClose: () => void
}

export default function ShareSheet({ title, onClose }: Props) {
  const [copied, setCopied] = useState(false)
  const url = typeof window !== 'undefined' ? (() => {
    const u = new URL(window.location.href)
    u.searchParams.delete('_dv')
    return u.toString()
  })() : ''

  async function handleNativeShare() {
    try {
      await navigator.share({ title, url })
      onClose()
    } catch {
      // user cancelled or not supported — fall through
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => { setCopied(false); onClose() }, 1200)
    } catch {
      // clipboard blocked
    }
  }

  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={handleBackdrop}
    >
      <div className="w-full max-w-[480px] bg-white rounded-t-3xl overflow-hidden">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="px-5 pt-4 pb-2">
          <h3 className="text-[16px] font-black text-[#1C1917] mb-1">공유하기</h3>
          <p className="text-[12px] text-gray-400 truncate">{title}</p>
        </div>

        {/* Link preview box */}
        <div className="mx-5 my-3 bg-gray-50 rounded-2xl px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#0038A8] flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-[12px] text-gray-500 font-mono truncate flex-1">{url}</span>
        </div>

        {/* Action buttons */}
        <div className="px-5 pb-2 flex flex-col gap-2.5">
          <button
            onClick={handleCopy}
            className="w-full h-[52px] rounded-2xl font-bold text-[15px] btn-press flex items-center justify-center gap-2.5 transition-colors"
            style={{
              background: copied ? '#D1FAE5' : '#F3F4F6',
              color: copied ? '#059669' : '#1C1917',
            }}
          >
            {copied ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17L4 12" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                복사됨!
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="9" y="9" width="13" height="13" rx="2" stroke="#374151" strokeWidth="2"/>
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="#374151" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                링크 복사
              </>
            )}
          </button>

          {canNativeShare && (
            <button
              onClick={handleNativeShare}
              className="w-full h-[52px] rounded-2xl font-bold text-[15px] btn-press flex items-center justify-center gap-2.5"
              style={{ background: '#0038A8', color: 'white' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="18" cy="5" r="3" stroke="white" strokeWidth="2"/>
                <circle cx="6" cy="12" r="3" stroke="white" strokeWidth="2"/>
                <circle cx="18" cy="19" r="3" stroke="white" strokeWidth="2"/>
                <path d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              더 보내기
            </button>
          )}
        </div>

        <div style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 20px)' }} />
      </div>
    </div>
  )
}
