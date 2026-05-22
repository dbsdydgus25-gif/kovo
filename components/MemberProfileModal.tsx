'use client'

import { useEffect, useState, useCallback } from 'react'
import { AssemblyMember } from '@/lib/assembly-member-api'

interface Props {
  name: string
  onClose: () => void
}

const PARTY_COLORS: Record<string, { bg: string; text: string }> = {
  '더불어민주당': { bg: '#003B93', text: 'white' },
  '국민의힘':     { bg: '#C9151E', text: 'white' },
  '조국혁신당':   { bg: '#7C3AED', text: 'white' },
  '개혁신당':     { bg: '#F97316', text: 'white' },
  '정부':         { bg: '#374151', text: 'white' },
}

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-[12px] text-gray-400 w-24 flex-shrink-0">{label}</span>
      <span className="text-[13px] text-[#1C1917] font-medium flex-1 break-keep">{value}</span>
    </div>
  )
}

export default function MemberProfileModal({ name, onClose }: Props) {
  const [member, setMember] = useState<AssemblyMember | null>(null)
  const [loading, setLoading] = useState(true)
  const [imgError, setImgError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/member?name=${encodeURIComponent(name)}`)
      if (res.ok) setMember(await res.json())
    } catch { /* ignore */ }
    setLoading(false)
  }, [name])

  useEffect(() => { load() }, [load])

  // Close on backdrop click
  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  const partyColor = member ? (PARTY_COLORS[member.party] ?? { bg: '#6B7280', text: 'white' }) : null

  function formatBirth(d: string): string {
    if (!d || d.length < 8) return d
    const s = d.replace(/-/g, '')
    return `${s.slice(0, 4)}년 ${parseInt(s.slice(4, 6))}월 ${parseInt(s.slice(6, 8))}일`
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={handleBackdrop}
    >
      <div
        className="w-full max-w-[480px] bg-white rounded-t-3xl overflow-hidden"
        style={{ maxHeight: '90dvh' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Close button */}
        <div className="flex items-center justify-between px-5 pt-1 pb-3">
          <h2 className="text-[17px] font-black text-[#1C1917]">의원 정보</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="#374151" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90dvh - 80px)' }}>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-10 h-10 rounded-full border-4 border-gray-100 border-t-[#1B8B82] animate-spin mb-3" />
              <p className="text-[13px] text-gray-400">국회 API에서 불러오는 중...</p>
            </div>
          ) : !member ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <p className="text-[14px] font-medium text-gray-500">의원 정보를 찾을 수 없습니다</p>
              <p className="text-[12px] text-gray-400 mt-1">{name} 의원 정보를 조회하지 못했습니다</p>
            </div>
          ) : (
            <div className="px-5 pb-8">
              {/* Profile header */}
              <div className="flex items-center gap-4 mb-5">
                {/* Photo */}
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
                  {member.photoUrl && !imgError ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.photoUrl}
                      alt={member.name}
                      className="w-full h-full object-cover"
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <span className="text-3xl">👤</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-[22px] font-black text-[#1C1917] leading-tight">
                    {member.name}
                  </h3>
                  {member.engName && (
                    <p className="text-[12px] text-gray-400 mt-0.5">{member.engName}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    {partyColor && (
                      <span
                        className="text-[12px] font-bold px-2.5 py-1 rounded-lg"
                        style={{ background: partyColor.bg, color: partyColor.text }}
                      >
                        {member.party}
                      </span>
                    )}
                    {member.sessions && member.sessions !== '-' && (
                      <span className="text-[12px] text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg font-semibold">
                        {member.sessions}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="bg-gray-50 rounded-2xl px-4 py-1 mb-4">
                <Row label="선거구" value={member.constituency} />
                <Row label="선거구분" value={member.electionType} />
                <Row label="성별" value={member.sex === '남' ? '남성' : member.sex === '여' ? '여성' : member.sex} />
                {member.birthDate && (
                  <Row label="생년월일" value={`${formatBirth(member.birthDate)}${member.age ? ` (만 ${member.age}세)` : ''}`} />
                )}
                <Row label="소속위원회" value={member.committee} />
                {member.committees && member.committees !== member.committee && (
                  <Row label="전체 위원회" value={member.committees} />
                )}
                <Row label="대표발의 법안" value={member.billCount ? `${member.billCount}건` : ''} />
              </div>

              {/* Bio */}
              {member.bio && (
                <div className="mb-4">
                  <p className="text-[12px] font-bold text-gray-500 mb-2 uppercase tracking-wide">약력</p>
                  <p className="text-[13px] text-[#1C1917] leading-relaxed bg-gray-50 rounded-xl p-3">
                    {member.bio}
                  </p>
                </div>
              )}

              {/* Criminal record notice */}
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5">
                <div className="flex items-start gap-2.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="10" stroke="#D97706" strokeWidth="2"/>
                    <path d="M12 8v4M12 16h.01" stroke="#D97706" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <div>
                    <p className="text-[12px] font-bold text-amber-700 mb-1">전과 기록 안내</p>
                    <p className="text-[11px] text-amber-600 leading-relaxed">
                      선거 시 제출한 전과 기록은 중앙선거관리위원회에서 확인할 수 있습니다.
                      공직선거법 제49조에 따라 후보자가 직접 신고한 내용입니다.
                    </p>
                    <a
                      href="https://info.nec.go.kr"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-[11px] font-bold text-amber-700 underline underline-offset-2"
                    >
                      중앙선관위 후보자 정보 보기 →
                    </a>
                  </div>
                </div>
              </div>

              {/* Source note */}
              <p className="text-[10px] text-gray-300 text-center mt-4">
                출처: 국회 열린국회정보 API (open.assembly.go.kr)
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
