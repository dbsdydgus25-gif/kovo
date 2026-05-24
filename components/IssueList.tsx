'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import IssueCard from './IssueCard'
import { Issue } from '@/types'
import { MOCK_ISSUES } from '@/lib/mock-data'

const IS_DEMO = !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('supabase.co') ||
  process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')

const CATEGORIES = ['전체', '경제', '안보', '복지', '교육', '의료', '정치']
const PAGE_SIZE = 10

type StatusTab = 'active' | 'closed'

function Skeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex gap-2 mb-3"><div className="skeleton h-5 w-12 rounded-full" /></div>
          <div className="skeleton h-5 w-4/5 rounded-lg mb-2" />
          <div className="skeleton h-4 w-full rounded-lg mb-1" />
          <div className="skeleton h-4 w-3/4 rounded-lg mb-4" />
          <div className="flex justify-between">
            <div className="skeleton h-4 w-20 rounded-lg" />
            <div className="skeleton h-6 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

interface Props {
  initialIssues: Issue[]
  initialUserVotes: Record<string, 'agree' | 'disagree'>
  userId: string | null
}

export default function IssueList({ initialIssues, initialUserVotes, userId }: Props) {
  const [statusTab, setStatusTab] = useState<StatusTab>('active')
  const [category, setCategory] = useState('전체')
  const [issues, setIssues] = useState<Issue[]>(initialIssues)
  const [userVotes, setUserVotes] = useState(initialUserVotes)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(initialIssues.length)
  const abortRef = useRef<AbortController | null>(null)

  const fetchIssues = useCallback(async (status: StatusTab, cat: string, pg: number) => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setLoading(true)

    if (IS_DEMO) {
      await new Promise(r => setTimeout(r, 60))
      if (ctrl.signal.aborted) return
      let list = MOCK_ISSUES
      if (cat !== '전체') list = list.filter(i => i.category === cat)
      const start = pg * PAGE_SIZE
      setIssues(list.slice(start, start + PAGE_SIZE))
      setTotalCount(list.length)
      setUserVotes({})
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query: any = supabase
        .from('issues')
        .select('*', { count: 'exact' })
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false })

      if (status === 'active') {
        query = query.eq('status', 'active')
      } else {
        query = query.eq('status', 'closed')
      }

      if (cat !== '전체') query = query.eq('category', cat)

      query = query.range(pg * PAGE_SIZE, (pg + 1) * PAGE_SIZE - 1)

      const { data: newIssues, count } = await query
      if (ctrl.signal.aborted) return

      const list = (newIssues ?? []) as Issue[]
      setIssues(list)
      setTotalCount(count ?? 0)

      if (userId && list.length > 0) {
        const { data: votes } = await supabase
          .from('votes').select('issue_id, vote_type')
          .eq('user_id', userId)
          .in('issue_id', list.map(i => i.id))
        if (!ctrl.signal.aborted) {
          setUserVotes(Object.fromEntries((votes ?? []).map(v => [v.issue_id, v.vote_type])))
        }
      }
    } catch { /* ignore aborts */ }

    if (!ctrl.signal.aborted) setLoading(false)
  }, [userId])

  function handleStatusTab(s: StatusTab) {
    setStatusTab(s)
    setCategory('전체')
    setPage(0)
    fetchIssues(s, '전체', 0)
  }

  function handleCategory(cat: string) {
    setCategory(cat)
    setPage(0)
    fetchIssues(statusTab, cat, 0)
  }

  function handlePage(pg: number) {
    setPage(pg)
    fetchIssues(statusTab, category, pg)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => { fetchIssues('active', '전체', 0) }, []) // eslint-disable-line

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  function getPageNumbers(): number[] {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i)
    let start = Math.max(0, page - 2)
    const end = Math.min(totalPages - 1, start + 4)
    start = Math.max(0, end - 4)
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }

  return (
    <>
      {/* 고정 헤더: 상태 탭 + 카테고리 필터 */}
      <div className="fixed top-[56px] left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-[#F5F5F7] z-30">
        <div className="flex px-4 pt-2.5 gap-2">
          {(['active', 'closed'] as StatusTab[]).map(s => (
            <button
              key={s}
              onClick={() => handleStatusTab(s)}
              className="flex-1 py-2 rounded-xl text-[14px] font-bold transition-all btn-press"
              style={{
                background: statusTab === s ? '#0038A8' : 'white',
                color: statusTab === s ? 'white' : '#9CA3AF',
                border: statusTab === s ? 'none' : '1px solid #E5E7EB',
              }}
            >
              {s === 'active' ? '🗳️ 진행중' : '✅ 완료됨'}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 py-2.5">
          {CATEGORIES.map(cat => {
            const isActive = category === cat
            return (
              <button
                key={cat}
                onClick={() => handleCategory(cat)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold btn-press whitespace-nowrap"
                style={{
                  background: isActive ? '#1C1917' : 'white',
                  color: isActive ? 'white' : '#78716C',
                  border: isActive ? 'none' : '1px solid #E5E7EB',
                }}
              >
                {cat}
              </button>
            )
          })}
        </div>
      </div>

      {loading ? <Skeleton /> : (
        issues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-4xl mb-4">{statusTab === 'active' ? '🗳️' : '✅'}</span>
            <p className="text-[15px] font-medium text-gray-500">
              {statusTab === 'active' ? '진행중인 논제가 없습니다' : '완료된 논제가 없습니다'}
            </p>
            <p className="text-[13px] text-gray-400 mt-1">
              {statusTab === 'active' ? '곧 새로운 안건이 등록됩니다' : '국회 심의가 완료되면 여기에 표시됩니다'}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {issues.map(issue => (
                <div key={issue.id} className="fade-in-up">
                  <IssueCard
                    issue={issue}
                    userVote={userVotes[issue.id] ?? null}
                    isClosed={statusTab === 'closed'}
                  />
                </div>
              ))}
            </div>

            {/* 페이지 네비게이션 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1.5 py-5">
                <button
                  onClick={() => handlePage(page - 1)}
                  disabled={page === 0}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[18px] leading-none text-gray-400 disabled:opacity-30 active:bg-gray-100 transition-colors"
                >
                  ‹
                </button>
                {getPageNumbers().map(pg => (
                  <button
                    key={pg}
                    onClick={() => handlePage(pg)}
                    className="w-8 h-8 rounded-full text-[13px] font-bold transition-all btn-press flex items-center justify-center"
                    style={{
                      background: pg === page ? '#0038A8' : 'white',
                      color: pg === page ? 'white' : '#6B7280',
                      border: pg === page ? 'none' : '1px solid #E5E7EB',
                    }}
                  >
                    {pg + 1}
                  </button>
                ))}
                <button
                  onClick={() => handlePage(page + 1)}
                  disabled={page >= totalPages - 1}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[18px] leading-none text-gray-400 disabled:opacity-30 active:bg-gray-100 transition-colors"
                >
                  ›
                </button>
              </div>
            )}
          </>
        )
      )}
    </>
  )
}
