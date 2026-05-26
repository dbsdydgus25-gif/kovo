'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Issue, VoteType } from '@/types'
import { formatNumber, getVotePercentage } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { getBillStageFromApiData } from '@/lib/assembly-stage'
import AuthModal from './AuthModal'
import BillStageProgress from './BillStageProgress'
import MemberProfileModal from './MemberProfileModal'

interface VoteSectionProps {
  issue: Issue
  userVote: VoteType | null
  userId: string | null
  isClosed?: boolean
}

const PARTY_COLORS: Record<string, { bg: string; text: string }> = {
  '더불어민주당': { bg: '#003B93', text: 'white' },
  '국민의힘':     { bg: '#C9151E', text: 'white' },
  '정부':         { bg: '#374151', text: 'white' },
  '조국혁신당':   { bg: '#7C3AED', text: 'white' },
}

const PASS_RESULTS = ['원안가결', '수정가결', '대안반영가결']

function getProcResult(apiData: Record<string, unknown> | null): string | null {
  if (!apiData) return null
  const r = apiData.PROC_RESULT as string | undefined
  return r && r.trim().length > 0 ? r.trim() : null
}

function isPass(result: string): boolean {
  return PASS_RESULTS.some(r => result.includes(r))
}

function getResultLabel(result: string): string {
  if (result.includes('원안가결')) return '원안가결'
  if (result.includes('수정가결')) return '수정가결'
  if (result.includes('대안반영가결')) return '대안반영'
  if (result.includes('부결')) return '부결'
  if (result.includes('폐기')) return '폐기'
  if (result.includes('철회')) return '철회'
  return result
}

export default function VoteSection({ issue, userVote: initialVote, userId, isClosed }: VoteSectionProps) {
  const [userVote, setUserVote] = useState<VoteType | null>(initialVote)
  const [agreeCnt, setAgreeCnt] = useState(issue.agree_count)
  const [disagreeCnt, setDisagreeCnt] = useState(issue.disagree_count)
  const [loading, setLoading] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [selectedMember, setSelectedMember] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  const { stageIdx, stageDate } = getBillStageFromApiData(issue.api_data)
  const procResult = getProcResult(issue.api_data)

  const hasVoted = !!userVote
  const showResults = hasVoted || isClosed
  const { agree, disagree, total } = getVotePercentage(agreeCnt, disagreeCnt)

  async function handleVote(voteType: VoteType) {
    if (!userId) {
      setShowAuth(true)
      return
    }
    if (loading || hasVoted) return

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

      router.refresh()
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
      {selectedMember && (
        <MemberProfileModal
          name={selectedMember}
          onClose={() => setSelectedMember(null)}
        />
      )}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">

        {/* 찬반 논거 — 진행중이고 아직 투표 안 했을 때만 */}
        {!showResults && (issue.pro_summary || issue.con_summary) && (
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

        <div className="p-4">
          {!showResults ? (
            /* ── 투표 전 (진행중 논재) ── */
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
            /* ── 결과 (투표 후 or 완료됨) ── */
            <div className="fade-in-up">
              {/* 상단 뱃지 */}
              <div className="flex justify-center mb-4">
                {isClosed ? (
                  /* 완료된 논재: 국회 결과 뱃지 */
                  procResult ? (
                    <div
                      className="flex items-center gap-2 px-4 py-2 rounded-full text-[14px] font-bold"
                      style={{
                        background: isPass(procResult) ? '#DCFCE7' : '#FEE2E2',
                        color: isPass(procResult) ? '#16A34A' : '#DC2626',
                      }}
                    >
                      {isPass(procResult) ? '✅' : '❌'} 국회 {getResultLabel(procResult)}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full text-[14px] font-bold bg-gray-100 text-gray-500">
                      ✅ 완료된 안건
                    </div>
                  )
                ) : (
                  /* 투표 후 내 선택 뱃지 */
                  <div
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-[14px] font-bold"
                    style={{
                      background: userVote === 'agree' ? '#0038A810' : '#C60C3010',
                      color: userVote === 'agree' ? '#0038A8' : '#C60C30',
                    }}
                  >
                    {userVote === 'agree' ? '👍 찬성으로 투표했습니다' : '👎 반대로 투표했습니다'}
                  </div>
                )}
              </div>

              {/* 민심 투표 결과 바 */}
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

                {/* 완료됨: 민심 vs 국회 결과 비교 인사이트 */}
                {isClosed && procResult && total > 0 && (
                  <div
                    className="mt-2.5 px-3 py-2 rounded-xl flex items-center gap-2"
                    style={{ background: (agree >= 50) === isPass(procResult) ? '#F0FDF4' : '#FFF7ED' }}
                  >
                    <span className="text-[15px]">{(agree >= 50) === isPass(procResult) ? '🎯' : '⚡'}</span>
                    <div>
                      <p
                        className="text-[11px] font-bold"
                        style={{ color: (agree >= 50) === isPass(procResult) ? '#16A34A' : '#EA580C' }}
                      >
                        {(agree >= 50) === isPass(procResult) ? '코보 민심 예측 적중!' : '민심과 국회 결과 불일치'}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        코보 {agree >= 50 ? '찬성' : '반대'} {agree}% → 국회 {getResultLabel(procResult)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* 심사진행단계 */}
              <div className="mt-4">
                <BillStageProgress currentStage={stageIdx} stageDate={stageDate} />
              </div>

              {/* 발의자 정보 */}
              <div className="mt-3 pt-4 border-t border-gray-100">
                <p className="text-[11px] text-gray-400 mb-2 font-medium">이 안건을 발의한 사람</p>
                <div className="flex items-center gap-2.5">
                  <span
                    className="text-[12px] font-bold px-3 py-1.5 rounded-lg"
                    style={{ background: partyColor.bg, color: partyColor.text }}
                  >
                    {issue.party}
                  </span>
                  {issue.proposer && issue.proposer !== '정부' ? (
                    <button
                      onClick={() => setSelectedMember(issue.proposer)}
                      className="flex items-center gap-1 text-[14px] font-bold text-[#0038A8] underline underline-offset-2 active:opacity-70"
                    >
                      {issue.proposer} 의원
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <path d="M9 18L15 12L9 6" stroke="#0038A8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  ) : (
                    <span className="text-[14px] font-semibold text-[#1C1917]">정부 제출 법안</span>
                  )}
                </div>
                {!isClosed && (
                  <p className="text-[11px] text-gray-400 mt-2.5 flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="11" width="18" height="11" rx="2" stroke="#9CA3AF" strokeWidth="2"/>
                      <path d="M7 11V7a5 5 0 0110 0v4" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    투표는 변경할 수 없습니다. 편향 없는 민심을 위해서예요.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
