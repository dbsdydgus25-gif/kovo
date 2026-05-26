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

export interface CommentRecord {
  id: string
  content: string
  vote_type: string | null
  likes: number
  created_at: string
  issue_id: string
  issues: {
    id: string
    title: string
    category: string
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
  myComments: CommentRecord[]
  displayName: string | null
  ageGroup: string | null
  gender: string | null
  region: string | null
  occupation: string | null
  savedTendency?: TendencyData | null
  tendencyUpdatedAt: string | null
}

const SPECTRUM_COLOR: Record<string, { bg: string; text: string; bar: string }> = {
  '진보':     { bg: '#EFF6FF', text: '#1D4ED8', bar: '#2563EB' },
  '중도진보': { bg: '#F0FDF4', text: '#15803D', bar: '#16A34A' },
  '중도':     { bg: '#F9FAFB', text: '#374151', bar: '#6B7280' },
  '중도보수': { bg: '#FFF7ED', text: '#C2410C', bar: '#EA580C' },
  '보수':     { bg: '#FFF1F2', text: '#BE123C', bar: '#E11D48' },
}

const AGE_OPTIONS = ['10대', '20대', '30대', '40대', '50대', '60대이상']
const GENDER_OPTIONS = ['남성', '여성', '기타', '응답거부']
const REGION_OPTIONS = ['서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주']
const OCCUPATION_OPTIONS = ['학생', '직장인', '자영업', '전문직', '공무원', '주부', '무직', '기타']

export default function ProfileClient({
  user, votes, myComments, displayName,
  ageGroup, gender, region, occupation,
  savedTendency, tendencyUpdatedAt
}: Props) {
  const router = useRouter()
  const supabase = createClient()

  // UI state
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showAllVotes, setShowAllVotes] = useState(false)
  const [showAllComments, setShowAllComments] = useState(false)

  // 성향 분석
  const [tendency, setTendency] = useState<TendencyData | null>(savedTendency ?? null)
  const [tendencyLoading, setTendencyLoading] = useState(false)
  const [tendencyError, setTendencyError] = useState<string | null>(null)

  // 프로필 수정 모달
  const [showEditModal, setShowEditModal] = useState(false)
  const [editName, setEditName] = useState(displayName ?? '')
  const [editAge, setEditAge] = useState(ageGroup ?? '')
  const [editGender, setEditGender] = useState(gender ?? '')
  const [editRegion, setEditRegion] = useState(region ?? '')
  const [editOccupation, setEditOccupation] = useState(occupation ?? '')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  const agreeCount    = votes.filter(v => v.vote_type === 'agree').length
  const disagreeCount = votes.filter(v => v.vote_type === 'disagree').length
  const displayVotes    = showAllVotes ? votes : votes.slice(0, 3)
  const displayComments = showAllComments ? myComments : myComments.slice(0, 3)

  const provider = user.app_metadata?.provider ?? 'email'
  const providerLabel = provider === 'kakao' ? '카카오' : provider === 'google' ? '구글' : provider

  // 마지막 분석 이후 새 투표 수
  const votesSinceAnalysis = tendencyUpdatedAt
    ? votes.filter(v => new Date(v.created_at) > new Date(tendencyUpdatedAt)).length
    : votes.length
  const canAnalyze = !tendency && votes.length >= 10
  const canReanalyze = !!tendency && votesSinceAnalysis >= 10

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
    if (tendency && !canReanalyze) return
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

  async function handleSaveProfile() {
    setEditSaving(true)
    setEditError('')
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: editName.trim() || null,
          age_group: editAge || null,
          gender: editGender || null,
          region: editRegion || null,
          occupation: editOccupation || null,
        })
        .eq('id', user.id)
      if (error) throw error
      setShowEditModal(false)
      router.refresh()
    } catch {
      setEditError('저장 중 오류가 발생했습니다.')
    } finally {
      setEditSaving(false)
    }
  }

  const specColor = tendency ? (SPECTRUM_COLOR[tendency.spectrum] ?? SPECTRUM_COLOR['중도']) : null

  return (
    <div className="px-4 space-y-3">
      {/* 프로필 카드 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
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
          {/* 프로필 수정 톱니바퀴 */}
          <button
            onClick={() => setShowEditModal(true)}
            className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center btn-press flex-shrink-0"
            aria-label="내 정보 수정"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="#6B7280" strokeWidth="2"/>
              <path d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.2579 9.77251 19.9887C9.5799 19.7194 9.31074 19.5143 9 19.4C8.69838 19.2669 8.36381 19.2272 8.03941 19.286C7.71502 19.3448 7.41568 19.4995 7.18 19.73L7.12 19.79C6.93425 19.976 6.71368 20.1235 6.47088 20.2241C6.22808 20.3248 5.96783 20.3766 5.705 20.3766C5.44217 20.3766 5.18192 20.3248 4.93912 20.2241C4.69632 20.1235 4.47575 19.976 4.29 19.79C4.10405 19.6043 3.95653 19.3837 3.85588 19.1409C3.75523 18.8981 3.70343 18.6378 3.70343 18.375C3.70343 18.1122 3.75523 17.8519 3.85588 17.6091C3.95653 17.3663 4.10405 17.1457 4.29 16.96L4.35 16.9C4.58054 16.6643 4.73519 16.365 4.794 16.0406C4.85282 15.7162 4.81312 15.3816 4.68 15.08C4.55324 14.7842 4.34276 14.532 4.07447 14.3543C3.80618 14.1766 3.49179 14.0813 3.17 14.08H3C2.46957 14.08 1.96086 13.8693 1.58579 13.4942C1.21071 13.1191 1 12.6104 1 12.08C1 11.5496 1.21071 11.0409 1.58579 10.6658C1.96086 10.2907 2.46957 10.08 3 10.08H3.09C3.42099 10.0723 3.742 9.96512 4.01128 9.77251C4.28056 9.5799 4.48572 9.31074 4.6 9C4.73312 8.69838 4.77282 8.36381 4.714 8.03941C4.65519 7.71502 4.50054 7.41568 4.27 7.18L4.21 7.12C4.02405 6.93425 3.87653 6.71368 3.77588 6.47088C3.67523 6.22808 3.62343 5.96783 3.62343 5.705C3.62343 5.44217 3.67523 5.18192 3.77588 4.93912C3.87653 4.69632 4.02405 4.47575 4.21 4.29C4.39575 4.10405 4.61632 3.95653 4.85912 3.85588C5.10192 3.75523 5.36217 3.70343 5.625 3.70343C5.88783 3.70343 6.14808 3.75523 6.39088 3.85588C6.63368 3.95653 6.85425 4.10405 7.04 4.29L7.1 4.35C7.33568 4.58054 7.63502 4.73519 7.95941 4.794C8.28381 4.85282 8.61838 4.81312 8.92 4.68H9C9.29577 4.55324 9.54802 4.34276 9.72569 4.07447C9.90337 3.80618 9.99872 3.49179 10 3.17V3C10 2.46957 10.2107 1.96086 10.5858 1.58579C10.9609 1.21071 11.4696 1 12 1C12.5304 1 13.0391 1.21071 13.4142 1.58579C13.7893 1.96086 14 2.46957 14 3V3.09C14.0013 3.41179 14.0966 3.72618 14.2743 3.99447C14.452 4.26276 14.7042 4.47324 15 4.6C15.3016 4.73312 15.6362 4.77282 15.9606 4.714C16.285 4.65519 16.5843 4.50054 16.82 4.27L16.88 4.21C17.0657 4.02405 17.2863 3.87653 17.5291 3.77588C17.7719 3.67523 18.0322 3.62343 18.295 3.62343C18.5578 3.62343 18.8181 3.67523 19.0609 3.77588C19.3037 3.87653 19.5243 4.02405 19.71 4.21C19.896 4.39575 20.0435 4.61632 20.1441 4.85912C20.2448 5.10192 20.2966 5.36217 20.2966 5.625C20.2966 5.88783 20.2448 6.14808 20.1441 6.39088C20.0435 6.63368 19.896 6.85425 19.71 7.04L19.65 7.1C19.4195 7.33568 19.2648 7.63502 19.206 7.95941C19.1472 8.28381 19.1869 8.61838 19.32 8.92V9C19.4468 9.29577 19.6572 9.54802 19.9255 9.72569C20.1938 9.90337 20.5082 9.99872 20.83 10H21C21.5304 10 22.0391 10.2107 22.4142 10.5858C22.7893 10.9609 23 11.4696 23 12C23 12.5304 22.7893 13.0391 22.4142 13.4142C22.0391 13.7893 21.5304 14 21 14H20.91C20.5882 14.0013 20.2738 14.0966 20.0055 14.2743C19.7372 14.452 19.5268 14.7042 19.4 15Z" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* 프로필 정보 태그 */}
        {(ageGroup || gender || region || occupation) && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {ageGroup && <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-[#0038A8] font-medium">{ageGroup}</span>}
            {gender && <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">{gender}</span>}
            {region && <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">{region}</span>}
            {occupation && <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">{occupation}</span>}
          </div>
        )}

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
              <div className="rounded-xl p-3.5 mb-3" style={{ background: specColor?.bg }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[18px] font-black" style={{ color: specColor?.text }}>
                    {tendency.spectrum}
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: specColor?.text + '20', color: specColor?.text }}>
                    {tendency.spectrum_score > 0 ? `+${tendency.spectrum_score}` : tendency.spectrum_score}
                  </span>
                </div>
                <div className="relative h-2 rounded-full bg-gradient-to-r from-[#2563EB] via-gray-200 to-[#E11D48] mb-1">
                  <div
                    className="absolute top-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 shadow-sm transition-all"
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

              {/* 재분석 버튼 — 10개 새 투표 필요 */}
              <button
                onClick={analyzeTendency}
                disabled={tendencyLoading || !canReanalyze}
                className="w-full py-2.5 rounded-xl border border-gray-200 text-[13px] font-semibold btn-press disabled:opacity-40"
                style={{ color: canReanalyze ? '#0038A8' : '#9CA3AF' }}
              >
                {tendencyLoading
                  ? '분석 중...'
                  : canReanalyze
                    ? '다시 분석하기'
                    : `다시 분석하기 (추가 투표 ${votesSinceAnalysis}/10)`}
              </button>
              <p className="text-[10px] text-gray-300 text-center mt-2">
                {tendency.total_votes}개 투표 기준 · AI 분석 결과는 참고용입니다
              </p>
            </div>
          ) : (
            /* 분석 전 (10개 이상) */
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
                disabled={tendencyLoading || !canAnalyze}
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
                  <Link key={v.issue_id} href={`/issue/${v.issues.id}`} className="flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 transition-colors">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-[16px]"
                      style={{ background: v.vote_type === 'agree' ? '#0038A810' : '#C60C3010' }}>
                      {v.vote_type === 'agree' ? '👍' : '👎'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: `${catColor}18`, color: catColor }}>{v.issues.category}</span>
                        <span className="text-[10px] text-gray-400">{new Date(v.created_at).toLocaleDateString('ko-KR')}</span>
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
              <button onClick={() => setShowAllVotes(v => !v)} className="w-full py-3 text-[13px] font-semibold text-[#0038A8] border-t border-gray-50 active:bg-gray-50">
                {showAllVotes ? '접기' : `모두 보기 (${votes.length}건)`}
              </button>
            )}
          </>
        )}
      </div>

      {/* 댓글 기록 */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3.5 border-b border-gray-50 flex items-center justify-between">
          <h3 className="text-[14px] font-bold text-[#1C1917]">내 댓글</h3>
          <span className="text-[12px] text-gray-400">{myComments.length}건</span>
        </div>
        {myComments.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-[13px] text-gray-400">아직 남긴 댓글이 없어요</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-50">
              {displayComments.map((c) => {
                if (!c.issues) return null
                const catColor = CATEGORY_COLORS[c.issues.category] ?? '#6B7280'
                return (
                  <Link key={c.id} href={`/issue/${c.issues.id}`} className="flex items-start gap-3 px-4 py-3.5 active:bg-gray-50">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[10px] font-bold mt-0.5"
                      style={{ background: c.vote_type === 'agree' ? '#0038A8' : c.vote_type === 'disagree' ? '#C60C30' : '#9CA3AF' }}>
                      {c.vote_type === 'agree' ? '찬' : c.vote_type === 'disagree' ? '반' : '–'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: `${catColor}18`, color: catColor }}>{c.issues.category}</span>
                        <span className="text-[10px] text-gray-400">{new Date(c.created_at).toLocaleDateString('ko-KR')}</span>
                        {c.likes > 0 && <span className="text-[10px] text-[#C60C30] font-semibold">❤️ {c.likes}</span>}
                      </div>
                      <p className="text-[12px] text-gray-500 truncate">{c.issues.title}</p>
                      <p className="text-[13px] font-medium text-[#1C1917] mt-0.5 line-clamp-2 leading-snug">{c.content}</p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 mt-1">
                      <path d="M9 18L15 12L9 6" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </Link>
                )
              })}
            </div>
            {myComments.length > 3 && (
              <button onClick={() => setShowAllComments(v => !v)} className="w-full py-3 text-[13px] font-semibold text-[#0038A8] border-t border-gray-50 active:bg-gray-50">
                {showAllComments ? '접기' : `모두 보기 (${myComments.length}건)`}
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
        <button onClick={handleLogout} className="w-full flex items-center justify-between px-4 py-4 border-b border-gray-50 active:bg-gray-50">
          <span className="text-[14px] font-semibold text-[#1C1917]">로그아웃</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M9 21H5C4.47 21 3.96 20.79 3.59 20.41C3.21 20.04 3 19.53 3 19V5C3 4.47 3.21 3.96 3.59 3.59C3.96 3.21 4.47 3 5 3H9M16 17L21 12L16 7M21 12H9" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button onClick={() => setShowDeleteConfirm(true)} className="w-full flex items-center justify-between px-4 py-4 active:bg-red-50">
          <span className="text-[14px] font-semibold text-[#C60C30]">회원 탈퇴</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M3 6H5H21M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6L18.12 19.12C18.0878 19.6032 17.8745 20.0557 17.5238 20.3929C17.1732 20.7301 16.7115 20.9277 16.227 20.9476L7.773 20.9476C7.28851 20.9277 6.82683 20.7301 6.47617 20.3929C6.12551 20.0557 5.91218 19.6032 5.88 19.12L5 6H19Z" stroke="#C60C30" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <p className="text-[11px] text-gray-400 text-center pb-2">Kovo v1.0 — 편향 없이, 내 시각으로</p>

      {/* 프로필 수정 모달 */}
      {showEditModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center" onClick={() => setShowEditModal(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-[480px] bg-white rounded-t-3xl pb-safe fade-in-up overflow-y-auto"
            style={{ maxHeight: '90dvh' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white px-5 pt-4 pb-3 border-b border-gray-50 flex items-center justify-between">
              <div>
                <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-3" />
                <h3 className="text-[17px] font-black text-[#1C1917]">내 정보 수정</h3>
              </div>
              <button onClick={() => setShowEditModal(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6L18 18" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* 닉네임 */}
              <div>
                <label className="text-[12px] font-semibold text-gray-500 mb-1.5 block">닉네임</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="닉네임 입력 (선택)"
                  maxLength={20}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-[14px] outline-none focus:border-[#0038A8] transition-colors"
                />
              </div>

              {/* 연령대 */}
              <div>
                <label className="text-[12px] font-semibold text-gray-500 mb-1.5 block">연령대</label>
                <div className="flex flex-wrap gap-2">
                  {AGE_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      onClick={() => setEditAge(editAge === opt ? '' : opt)}
                      className="px-3 py-1.5 rounded-full text-[12px] font-semibold btn-press transition-all"
                      style={{
                        background: editAge === opt ? '#0038A8' : '#F3F4F6',
                        color: editAge === opt ? 'white' : '#6B7280',
                      }}
                    >{opt}</button>
                  ))}
                </div>
              </div>

              {/* 성별 */}
              <div>
                <label className="text-[12px] font-semibold text-gray-500 mb-1.5 block">성별</label>
                <div className="flex flex-wrap gap-2">
                  {GENDER_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      onClick={() => setEditGender(editGender === opt ? '' : opt)}
                      className="px-3 py-1.5 rounded-full text-[12px] font-semibold btn-press transition-all"
                      style={{
                        background: editGender === opt ? '#0038A8' : '#F3F4F6',
                        color: editGender === opt ? 'white' : '#6B7280',
                      }}
                    >{opt}</button>
                  ))}
                </div>
              </div>

              {/* 지역 */}
              <div>
                <label className="text-[12px] font-semibold text-gray-500 mb-1.5 block">지역</label>
                <div className="flex flex-wrap gap-2">
                  {REGION_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      onClick={() => setEditRegion(editRegion === opt ? '' : opt)}
                      className="px-3 py-1.5 rounded-full text-[12px] font-semibold btn-press transition-all"
                      style={{
                        background: editRegion === opt ? '#0038A8' : '#F3F4F6',
                        color: editRegion === opt ? 'white' : '#6B7280',
                      }}
                    >{opt}</button>
                  ))}
                </div>
              </div>

              {/* 직업 */}
              <div>
                <label className="text-[12px] font-semibold text-gray-500 mb-1.5 block">직업</label>
                <div className="flex flex-wrap gap-2">
                  {OCCUPATION_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      onClick={() => setEditOccupation(editOccupation === opt ? '' : opt)}
                      className="px-3 py-1.5 rounded-full text-[12px] font-semibold btn-press transition-all"
                      style={{
                        background: editOccupation === opt ? '#0038A8' : '#F3F4F6',
                        color: editOccupation === opt ? 'white' : '#6B7280',
                      }}
                    >{opt}</button>
                  ))}
                </div>
              </div>

              {editError && <p className="text-[12px] text-red-500">{editError}</p>}

              <button
                onClick={handleSaveProfile}
                disabled={editSaving}
                className="w-full py-3.5 rounded-2xl font-bold text-[15px] btn-press disabled:opacity-50 mb-2"
                style={{ background: '#0038A8', color: 'white' }}
              >
                {editSaving ? '저장 중...' : '저장하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 탈퇴 확인 모달 */}
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
