'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { CATEGORY_COLORS } from '@/lib/utils'

export interface VoteRecord {
  vote_type: string
  created_at: string
  issue_id: string
  issues: {
    id: string
    title: string
    category: string
    agree_count: number
    disagree_count: number
  } | null
}

interface TendencyData {
  spectrum: string
  spectrum_score: number
  interest_areas: string[]
  tendency_tags: string[]
  summary: string
  agree_ratio: number
  total_votes: number
}

interface Props {
  user: User
  votes: VoteRecord[]
  displayName: string | null
  savedTendency?: TendencyData | null
}

const SPECTRUM_COLOR: Record<string, { bg: string; text: string; bar: string }> = {
  '진보':     { bg: '#EFF6FF', text: '#1D4ED8', bar: '#2563EB' },
  '중도진보': { bg: '#F0FDF4', text: '#15803D', bar: '#16A34A' },
  '중도':     { bg: '#F9FAFB', text: '#374151', bar: '#6B7280' },
  '중도보수': { bg: '#FFF7ED', text: '#C2410C', bar: '#EA580C' },
  '보수':     { bg: '#FFF1F2', text: '#BE123C', bar: '#E11D48' },
}

export default function ProfileClient({ user, votes, displayName, savedTendency }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showAllVotes, setShowAllVotes] = useState(false)
  const [tendency, setTendency] = useState<TendencyData | null>(savedTendency ?? null)
  const [tendencyLoading, setTendencyLoading] = useState(false)
  const [tendencyError, setTendencyError] = useState<string | null>(null)

  const agreeCount    = votes.filter(v => v.vote_type === 'agree').length
  const disagreeCount = votes.filter(v => v.vote_type === 'disagree').length
  const displayVotes  = showAllVotes ? votes : votes.slice(0, 3)

  const provider = user.app_metadata?.provider ?? 'email'
  const providerLabel = provider === 'kakao' ? '카카오' : provider === 'google' ? '구글' : provider

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  async function handleDeleteAccount() {
    setDeleting(true)
    try {
      await supabase.from('votes').delete().eq('user_id', user.id)
      await supabase.from('comments').update({ is_deleted: true }).eq('user_id', user.id)
      await supabase.from('profiles').delete().eq('id', user.id)
      await supabase.auth.signOut()
      router.push('/')
    } catch {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  async function analyzeTendency() {
    setTendencyLoading(true)
    setTendencyError(null)
    try {
      const res = await fetch('/api/tendency', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === 'need_more_votes') {
          setTendencyError(`투표 ${data.count}개 완료. 10개 이상 투표해야 분석할 수 있어요.`)
        } else {
          setTendencyError('분석 중 오류가 발생했습니다.')
        }
        return
      }
      setTendency(data)
    } catch {
      setTendencyError('네트워크 오류가 발생했습니다.')
    } finally {
      setTendencyLoading(false)
    }
  }

  const specColor = tendency ? (SPECTRUM_COLOR[tendency.spectrum] ?? SPECTRUM_COLOR['중도']) : null

  return (
    <div className="px-4 space-y-3">
      {/* 프로필 카드 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#0038A8] to-[#1a56d6] flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xl font-black">
              {displayName ? displayName.slice(0, 1).toUpperCase() : '나'}
            </span>
          </div>
          <div>
            <p className="text-[16px] font-bold text-[#1C1917]">{displayName ?? '익명 시민'}</p>
            <p className="text-[12px] text-gray-400">{user.email}</p>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium mt-1 inline-block">
              {providerLabel} 로그인
            </span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-50">
          <div className="text-center">
            <p className="text-[20px] font-black text-[#1C1917]">{votes.length}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">총 투표</p>
          </div>
          <div className="text-center border-x border-gray-100">
            <p className="text-[20px] font-black text-[#0038A8]">{agreeCount}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">찬성</p>
          </div>
          <div className="text-center">
            <p className="text-[20px] font-black text-[#C60C30]">{disagreeCount}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">반대</p>
          </div>
        </div>
      </div>

      {/* 나의 성향 분석 */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3.5 border-b border-gray-50">
          <h3 className="text-[14px] font-bold text-[#1C1917]">나의 정치 성향</h3>
          <p className="text-[11px] text-gray-400 mt-0.5">투표 기록 기반 AI 분석</p>
        </div>

        <div className="p-4">
          {votes.length < 10 ? (
            /* 투표 10개 미만 */
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🔒</span>
              </div>
              <p className="text-[13px] font-bold text-[#1C1917] mb-1">아직 투표수가 적습니다</p>
              <p className="text-[12px] text-gray-400 leading-relaxed">
                성향 파악을 위해 투표에 참여해보세요<br/>
                <span className="font-semibold text-[#0038A8]">{votes.length}/10개</span> 완료
              </p>
              <div className="mt-3 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full bg-[#0038A8] rounded-full transition-all"
                  style={{ width: `${(votes.length / 10) * 100}%` }}
                />
              </div>
            </div>
          ) : tendency ? (
            /* 분석 결과 */
            <div>
              <div
                className="rounded-xl p-3.5 mb-3"
                style={{ background: specColor?.bg }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[18px] font-black" style={{ color: specColor?.text }}>
                    {tendency.spectrum}
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: specColor?.text + '20', color: specColor?.text }}>
                    {tendency.spectrum_score > 0 ? `+${tendency.spectrum_score}` : tendency.spectrum_score}
                  </span>
                </div>
                {/* 성향 스펙트럼 바 */}
                <div className="relative h-2 rounded-full bg-gradient-to-r from-[#2563EB] via-gray-200 to-[#E11D48] mb-1">
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 shadow-sm transition-all"
                    style={{
                      left: `${((tendency.spectrum_score + 100) / 200) * 100}%`,
                      transform: 'translate(-50%, -50%)',
                      borderColor: specColor?.bar,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-gray-400 mt-1">
                  <span>진보</span><span>중도</span><span>보수</span>
                </div>
              </div>

              <p className="text-[13px] text-[#1C1917] leading-relaxed mb-3">{tendency.summary}</p>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {tendency.tendency_tags.map(tag => (
                  <span key={tag} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                    #{tag}
                  </span>
                ))}
              </div>

              <div className="flex gap-2 mb-3">
                {tendency.interest_areas.map((area, i) => (
                  <span key={i} className="text-[11px] font-bold px-2.5 py-1 rounded-lg" style={{ background: `${CATEGORY_COLORS[area] ?? '#6B7280'}18`, color: CATEGORY_COLORS[area] ?? '#6B7280' }}>
                    {area}
                  </span>
                ))}
              </div>

              <button
                onClick={analyzeTendency}
                disabled={tendencyLoading}
                className="w-full py-2.5 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-500 btn-press disabled:opacity-50"
              >
                {tendencyLoading ? '분석 중...' : '다시 분석하기'}
              </button>
              <p className="text-[10px] text-gray-300 text-center mt-2">
                {tendency.total_votes}개 투표 기준 · AI 분석 결과는 참고용입니다
              </p>
            </div>
          ) : (
            /* 분석 전 */
            <div className="text-center py-2">
              {tendencyError && (
                <p className="text-[12px] text-red-400 mb-3">{tendencyError}</p>
              )}
              <p className="text-[13px] text-gray-500 mb-4 leading-relaxed">
                {votes.length}개의 투표를 바탕으로<br/>
                나의 정치 성향을 분석해볼까요?
              </p>
              <button
                onClick={analyzeTendency}
                disabled={tendencyLoading}
                className="w-full py-3 rounded-xl font-bold text-[14px] btn-press disabled:opacity-50"
                style={{ background: '#0038A8', color: 'white' }}
              >
                {tendencyLoading ? '✨ 분석 중...' : '✨ 성향 분석 시작'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 투표 기록 */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3.5 border-b border-gray-50 flex items-center justify-between">
          <h3 className="text-[14px] font-bold text-[#1C1917]">내 투표 기록</h3>
          <span className="text-[12px] text-gray-400">{votes.length}건</span>
        </div>

        {votes.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-[13px] text-gray-400">아직 투표한 안건이 없어요</p>
            <p className="text-[12px] text-gray-300 mt-1">홈에서 안건에 투표해보세요</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-50">
              {displayVotes.map((v) => {
                if (!v.issues) return null
                const catColor = CATEGORY_COLORS[v.issues.category] ?? '#6B7280'
                const total = v.issues.agree_count + v.issues.disagree_count
                const agreePct = total > 0 ? Math.round((v.issues.agree_count / total) * 100) : 0
                return (
                  <Link
                    key={v.issue_id}
                    href={`/issue/${v.issues.id}`}
                    className="flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 transition-colors"
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-[16px]"
                      style={{ background: v.vote_type === 'agree' ? '#0038A810' : '#C60C3010' }}
                    >
                      {v.vote_type === 'agree' ? '👍' : '👎'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: `${catColor}18`, color: catColor }}>
                          {v.issues.category}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(v.created_at).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                      <p className="text-[13px] font-semibold text-[#1C1917] truncate">{v.issues.title}</p>
                      {total > 0 && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-gray-100 flex">
                            <div className="h-full bg-[#0038A8] rounded-l-full" style={{ width: `${agreePct}%` }} />
                            <div className="h-full bg-[#C60C30] rounded-r-full" style={{ width: `${100 - agreePct}%` }} />
                          </div>
                          <span className="text-[10px] text-gray-400">{total.toLocaleString()}명</span>
                        </div>
                      )}
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
                      <path d="M9 18L15 12L9 6" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </Link>
                )
              })}
            </div>

            {votes.length > 3 && (
              <button
                onClick={() => setShowAllVotes(v => !v)}
                className="w-full py-3 text-[13px] font-semibold text-[#0038A8] border-t border-gray-50 active:bg-gray-50 transition-colors"
              >
                {showAllVotes ? '접기' : `모두 보기 (${votes.length}건)`}
              </button>
            )}
          </>
        )}
      </div>

      {/* 계정 */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3.5 border-b border-gray-50">
          <h3 className="text-[14px] font-bold text-[#1C1917]">계정</h3>
        </div>
        <button onClick={handleLogout} className="w-full flex items-center justify-between px-4 py-4 border-b border-gray-50 active:bg-gray-50 transition-colors">
          <span className="text-[14px] font-semibold text-[#1C1917]">로그아웃</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M9 21H5C4.47 21 3.96 20.79 3.59 20.41C3.21 20.04 3 19.53 3 19V5C3 4.47 3.21 3.96 3.59 3.59C3.96 3.21 4.47 3 5 3H9M16 17L21 12L16 7M21 12H9" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button onClick={() => setShowDeleteConfirm(true)} className="w-full flex items-center justify-between px-4 py-4 active:bg-red-50 transition-colors">
          <span className="text-[14px] font-semibold text-[#C60C30]">회원 탈퇴</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M3 6H5H21M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6L18.12 19.12C18.0878 19.6032 17.8745 20.0557 17.5238 20.3929C17.1732 20.7301 16.7115 20.9277 16.227 20.9476L7.773 20.9476C7.28851 20.9277 6.82683 20.7301 6.47617 20.3929C6.12551 20.0557 5.91218 19.6032 5.88 19.12L5 6H19Z" stroke="#C60C30" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <p className="text-[11px] text-gray-400 text-center pb-2">Kovo v1.0 — 편향 없이, 내 시각으로</p>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center" onClick={() => setShowDeleteConfirm(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-[480px] bg-white rounded-t-3xl p-6 pb-10 fade-in-up" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-6" />
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h3 className="text-[18px] font-black text-center mb-2">정말 탈퇴하시겠어요?</h3>
            <p className="text-[13px] text-gray-500 text-center leading-relaxed mb-6">모든 투표 기록과 댓글이 삭제되며<br/>이 작업은 되돌릴 수 없습니다.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 h-12 rounded-2xl bg-gray-100 text-[14px] font-semibold text-gray-600 btn-press">취소</button>
              <button onClick={handleDeleteAccount} disabled={deleting} className="flex-1 h-12 rounded-2xl bg-[#C60C30] text-[14px] font-semibold text-white btn-press disabled:opacity-60">
                {deleting ? '처리 중...' : '탈퇴하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
