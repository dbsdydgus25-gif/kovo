'use client'

import { useState, useEffect, useCallback } from 'react'

interface HomeBannerProps {
  announcement?: string | null
}

export default function HomeBanner({ announcement }: HomeBannerProps) {
  const [current, setCurrent] = useState(0)
  const TOTAL = 2

  const next = useCallback(() => setCurrent(p => (p + 1) % TOTAL), [])

  useEffect(() => {
    const t = setInterval(next, 5000)
    return () => clearInterval(t)
  }, [next])

  return (
    <div className="rounded-2xl overflow-hidden relative">
      <div
        className="flex transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {/* ── 슬라이드 1: Kovo 소개 ── */}
        <div className="w-full flex-shrink-0" style={{ background: 'linear-gradient(135deg, #0038A8 0%, #1a56d6 60%, #003b93 100%)' }}>
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="white" />
                </svg>
              </div>
              <div>
                <p className="text-[11px] text-white/60 font-semibold tracking-widest uppercase mb-0.5">KOVO</p>
                <h2 className="text-[16px] font-black text-white leading-tight">편향 없이, 내 시각으로</h2>
                <p className="text-[12px] text-white/75 mt-1 leading-relaxed">
                  논제만 보고 투표하세요. 투표 후에야<br />발의 정당과 인구통계 인사이트가 공개됩니다.
                </p>
              </div>
            </div>
          </div>
          <div className="h-0.5 bg-white/10" />
          {announcement ? (
            <div className="px-4 py-2.5 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
              <span className="text-[11px] text-white/80 leading-relaxed">{announcement}</span>
            </div>
          ) : (
            <div className="px-4 py-2.5 flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#C60C30]" />
              <span className="text-[11px] text-white/60">투표는 한 번만 가능하며 철회할 수 없습니다</span>
            </div>
          )}
          {/* 도트 영역 높이 확보 */}
          <div className="h-6" />
        </div>

        {/* ── 슬라이드 2: 제 9회 전국동시지방선거 ── */}
        <div
          className="w-full flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #0a1628 0%, #003087 50%, #0038A8 100%)' }}
        >
          <div className="p-4">
            <div className="flex items-start gap-4">
              {/* 투표 마크 */}
              <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
                <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
                  {/* 투표함 */}
                  <rect x="5" y="18" width="30" height="18" rx="2.5" stroke="white" strokeWidth="2.5" />
                  {/* 투표용지 슬롯 */}
                  <rect x="15" y="18" width="10" height="3" rx="1.5" fill="white" />
                  {/* 투표용지 */}
                  <rect x="14" y="4" width="12" height="16" rx="2" fill="white" opacity="0.92" />
                  {/* 체크마크 */}
                  <path d="M17.5 12.5L19.5 14.5L23 10" stroke="#0038A8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              <div className="flex-1">
                <div className="inline-flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full mb-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#C60C30]" />
                  <span className="text-[9px] font-bold text-white/70 tracking-widest">전국동시지방선거</span>
                </div>
                <h2 className="text-[17px] font-black text-white leading-tight mb-1">
                  제 9회<br />전국동시지방선거
                </h2>
                <p className="text-[13px] font-bold text-white/90">
                  여러분은 정하셨습니까?
                </p>
              </div>
            </div>
          </div>
          <div className="h-0.5 bg-white/10" />
          <div className="px-4 py-2.5 flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="white" opacity="0.6"/>
            </svg>
            <span className="text-[11px] text-white/60 font-medium">투표는 국민의 권리입니다</span>
          </div>
          {/* 도트 영역 높이 확보 */}
          <div className="h-6" />
        </div>
      </div>

      {/* 도트 인디케이터 */}
      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5">
        {Array.from({ length: TOTAL }).map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className="transition-all duration-300"
            style={{
              width: i === current ? '18px' : '6px',
              height: '6px',
              borderRadius: '3px',
              background: i === current ? 'white' : 'rgba(255,255,255,0.35)',
            }}
          />
        ))}
      </div>
    </div>
  )
}
