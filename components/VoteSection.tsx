'use client'

import { useState } from 'react'
import { Issue, VoteType } from '@/types'
import { formatNumber, getVotePercentage } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import AuthModal from './AuthModal'

interface VoteSectionProps {
  issue: Issue
  userVote: VoteType | null
  userId: string | null
}

const PARTY_COLORS: Record<string, { bg: string; text: string }> = {
  '더불어민주당': { bg: '#003B93', text: 'white' },
  '국민의힘':     { bg: '#C9151E', text: 'white' },
  '정부':         { bg: '#374151', text: 'white' },
  '조국혁신당':   { bg: '#7C3AED', text: 'white' },
}

export default function VoteSection({ issue, userVote: initialVote, userId }: VoteSectionProps) {
  const [userVote, setUserVote] = useState<VoteType | null>(initialVote)
  const [agreeCnt, setAgreeCnt] = useState(issue.agree_count)
  const [disagreeCnt, setDisagreeCnt] = useState(issue.disagree_count)
  const [loading, setLoading] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const supabase = createClient()

  const hasVoted = !!userVote
  const { agree, disagree, total } = getVotePercentage(agreeCnt, disagreeCnt)

  async function handleVote(voteType: VoteType) {
    if (!userId) {
      setShowAuth(true)
      return
    }
    if (loading || hasVoted) return  // 투표 철회 불가

    setLoading(true)
    setUserVote(voteType)
    if (voteType === 'agree') setAgreeCnt(a => a + 1)
    else setDisagreeCnt(d => d + 1)

    try {
      await supabase.from('votes').insert({
        issue_id: issue.id,
        user_id: userId,
        vote_type: voteType,
      })
    } catch {
      setUserVote(null)
      if (voteType === 'agree') setAgreeCnt(a => a - 1)
      else setDisagreeCnt(d => d - 1)
    } finally {
      setLoading(false)
    }
  }

  const partyColor = PARTY_COLORS[issue.party] ?? { bg: '#374151', text: 'white' }

  return (
    <>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">

        {/* 투표 전: 찬반 논거 */}
        {!hasVoted && (issue.pro_summary || issue.con_summary) && (
          <div className="p-4 border-b border-gray-50">
            <p className="text-[12px] text-gray-400 font-medium mb-3 uppercase tracking-wide">주요 논점</p>
            <div className="grid grid-cols-2 gap-2.5">
              {issue.pro_summary && (
                <div className="bg-blue-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-4 h-4 rounded-full bg-[#0038A8] flex items-center justify-center flex-shrink-0">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="text-[11px] font-bold text-[#0038A8]">찬성 논거</span>
                  </div>
                  <p className="text-[12px] text-[#1C1917] leading-relaxed">{issue.pro_summary}</p>
                </div>
              )}
              {issue.con_summary && (
                <div className="bg-red-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-4 h-4 rounded-full bg-[#C60C30] flex items-center justify-center flex-shrink-0">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6L18 18" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="text-[11px] font-bold text-[#C60C30]">반대 논거</span>
                  </div>
                  <p className="text-[12px] text-[#1C1917] leading-relaxed">{issue.con_summary}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 투표 버튼 / 결과 영역 */}
        <div className="p-4">
          {!hasVoted ? (
            /* ── 투표 전 ── */
            <>
              <p className="text-[13px] text-[#78716C] text-center mb-4 font-medium">
                이 안건에 대한 당신의 생각은?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleVote('agree')}
                  disabled={loading}
                  className="flex-1 h-[54px] rounded-2xl font-bold text-[16px] btn-press flex items-center justify-center gap-2 border-2 border-[#0038A8] text-[#0038A8] hover:bg-[#0038A8] hover:text-white transition-colors duration-150"
                >
                  👍 찬성
                </button>
                <button
                  onClick={() => handleVote('disagree')}
                  disabled={loading}
                  className="flex-1 h-[54px] rounded-2xl font-bold text-[16px] btn-press flex items-center justify-center gap-2 border-2 border-[#C60C30] text-[#C60C30] hover:bg-[#C60C30] hover:text-white transition-colors duration-150"
                >
                  👎 반대
                </button>
              </div>
              {!userId && (
                <p className="text-[11px] text-gray-400 text-center mt-2.5">
                  투표하려면 로그인이 필요해요
                </p>
              )}
            </>
          ) : (
            /* ── 투표 후 ── */
            <div className="fade-in-up">
              {/* 내 선택 뱃지 */}
              <div className="flex justify-center mb-4">
                <div
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-[14px] font-bold"
                  style={{
                    background: userVote === 'agree' ? '#0038A810' : '#C60C3010',
                    color: userVote === 'agree' ? '#0038A8' : '#C60C30',
                  }}
                >
                  {userVote === 'agree' ? '👍 찬성으로 투표했습니다' : '👎 반대로 투표했습니다'}
                </div>
              </div>

              {/* 결과 바 */}
              <div className="mb-1">
                <div className="flex justify-between text-[13px] font-bold mb-2">
                  <span style={{ color: '#0038A8' }}>찬성 {agree}%</span>
                  <span className="text-gray-400 text-[12px] font-normal">{formatNumber(total)}명 참여</span>
                  <span style={{ color: '#C60C30' }}>반대 {disagree}%</span>
                </div>
                <div className="h-5 rounded-full overflow-hidden flex bg-gray-100">
                  <div
                    className="h-full rounded-l-full vote-bar flex items-center justify-end pr-2"
                    style={{ width: `${agree}%`, background: '#0038A8', minWidth: agree > 8 ? undefined : 0 }}
                  >
                    {agree > 15 && <span className="text-[11px] text-white font-bold">{agree}%</span>}
                  </div>
                  <div
                    className="h-full rounded-r-full flex items-center justify-start pl-2"
                    style={{ width: `${disagree}%`, background: '#C60C30', minWidth: disagree > 8 ? undefined : 0 }}
                  >
                    {disagree > 15 && <span className="text-[11px] text-white font-bold">{disagree}%</span>}
                  </div>
                </div>
              </div>

              {/* 발의자 공개 — 투표 후에만 */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-[11px] text-gray-400 mb-2 font-medium">이 안건을 발의한 사람</p>
                <div className="flex items-center gap-2.5">
                  <span
                    className="text-[12px] font-bold px-3 py-1.5 rounded-lg"
                    style={{ background: partyColor.bg, color: partyColor.text }}
                  >
                    {issue.party}
                  </span>
                  <span className="text-[14px] font-semibold text-[#1C1917]">
                    {issue.proposer === '정부' ? '정부 제출 법안' : `${issue.proposer} 의원 발의`}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-2.5 flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="11" width="18" height="11" rx="2" stroke="#9CA3AF" strokeWidth="2"/>
                    <path d="M7 11V7a5 5 0 0110 0v4" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  투표는 변경할 수 없습니다. 편향 없는 민심을 위해서예요.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
