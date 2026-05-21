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

interface Props {
  user: User
  votes: VoteRecord[]
}

export default function ProfileClient({ user, votes }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

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
      router.refresh()
    } catch {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const provider = user.app_metadata?.provider ?? 'email'
  const providerLabel = provider === 'kakao' ? '카카오' : provider === 'google' ? '구글' : provider

  const agreeCount = votes.filter(v => v.vote_type === 'agree').length
  const disagreeCount = votes.filter(v => v.vote_type === 'disagree').length

  return (
    <div className="px-4 space-y-3">
      {/* 프로필 카드 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#0038A8] to-[#1a56d6] flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xl font-black">나</span>
          </div>
          <div>
            <p className="text-[16px] font-bold text-[#1C1917]">익명 시민</p>
            <p className="text-[12px] text-gray-400">{user.email}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                {providerLabel} 로그인
              </span>
            </div>
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
          <div className="divide-y divide-gray-50">
            {votes.map((v) => {
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
                  {/* 내 투표 */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-[16px]"
                    style={{
                      background: v.vote_type === 'agree' ? '#0038A810' : '#C60C3010',
                    }}
                  >
                    {v.vote_type === 'agree' ? '👍' : '👎'}
                  </div>

                  {/* 안건 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ background: `${catColor}18`, color: catColor }}
                      >
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
        )}
      </div>

      {/* 계정 설정 */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3.5 border-b border-gray-50">
          <h3 className="text-[14px] font-bold text-[#1C1917]">계정</h3>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-between px-4 py-4 border-b border-gray-50 active:bg-gray-50 transition-colors"
        >
          <span className="text-[14px] font-semibold text-[#1C1917]">로그아웃</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M9 21H5C4.47 21 3.96 20.79 3.59 20.41C3.21 20.04 3 19.53 3 19V5C3 4.47 3.21 3.96 3.59 3.59C3.96 3.21 4.47 3 5 3H9M16 17L21 12L16 7M21 12H9" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full flex items-center justify-between px-4 py-4 active:bg-red-50 transition-colors"
        >
          <span className="text-[14px] font-semibold text-[#C60C30]">회원 탈퇴</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M3 6H5H21M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6L18.12 19.12C18.0878 19.6032 17.8745 20.0557 17.5238 20.3929C17.1732 20.7301 16.7115 20.9277 16.227 20.9476L7.773 20.9476C7.28851 20.9277 6.82683 20.7301 6.47617 20.3929C6.12551 20.0557 5.91218 19.6032 5.88 19.12L5 6H19Z" stroke="#C60C30" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <p className="text-[11px] text-gray-400 text-center pb-2">
        Kovo v1.0 — 편향 없이, 내 시각으로
      </p>

      {/* 탈퇴 확인 바텀시트 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center" onClick={() => setShowDeleteConfirm(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-[480px] bg-white rounded-t-3xl p-6 pb-10 fade-in-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-6" />
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18C1.64 18.3 1.55 18.64 1.55 18.99C1.55 19.34 1.64 19.68 1.82 19.98C2 20.28 2.25 20.53 2.55 20.71C2.85 20.89 3.19 20.99 3.54 21H20.46C20.81 20.99 21.15 20.89 21.45 20.71C21.75 20.53 22 20.28 22.18 19.98C22.36 19.68 22.45 19.34 22.45 18.99C22.45 18.64 22.36 18.3 22.18 18L13.71 3.86C13.53 3.56 13.28 3.31 12.98 3.13C12.68 2.95 12.34 2.86 12 2.86C11.66 2.86 11.32 2.95 11.02 3.13C10.72 3.31 10.47 3.56 10.29 3.86Z" stroke="#C60C30" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="text-[18px] font-black text-[#1C1917] text-center mb-2">정말 탈퇴하시겠어요?</h3>
            <p className="text-[13px] text-gray-500 text-center leading-relaxed mb-6">
              모든 투표 기록과 댓글이 삭제되며<br/>이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 h-12 rounded-2xl bg-gray-100 text-[14px] font-semibold text-gray-600 btn-press"
              >
                취소
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 h-12 rounded-2xl bg-[#C60C30] text-[14px] font-semibold text-white btn-press disabled:opacity-60"
              >
                {deleting ? '처리 중...' : '탈퇴하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
