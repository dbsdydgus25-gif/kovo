'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import IssueCard from './IssueCard'
import CategoryFilter from './CategoryFilter'
import { Issue } from '@/types'
import { MOCK_ISSUES } from '@/lib/mock-data'

const IS_DEMO = !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('supabase.co') ||
  process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')

function Skeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex gap-2 mb-3">
            <div className="skeleton h-5 w-12 rounded-full" />
          </div>
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
  initialCategory: string
  initialIssues: Issue[]
  initialUserVotes: Record<string, 'agree' | 'disagree'>
  userId: string | null
}

export default function IssueList({ initialCategory, initialIssues, initialUserVotes, userId }: Props) {
  const [category, setCategory] = useState(initialCategory)
  const [issues, setIssues] = useState<Issue[]>(initialIssues)
  const [userVotes, setUserVotes] = useState(initialUserVotes)
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const fetchIssues = useCallback(async (cat: string) => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setLoading(true)

    if (IS_DEMO) {
      // tiny delay so skeleton flashes visibly
      await new Promise(r => setTimeout(r, 80))
      if (ctrl.signal.aborted) return
      setIssues(cat === '전체' ? MOCK_ISSUES : MOCK_ISSUES.filter(i => i.category === cat))
      setUserVotes({})
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      let query = supabase
        .from('issues')
        .select('*')
        .eq('status', 'active')
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(20)
      if (cat !== '전체') query = query.eq('category', cat)

      const { data: newIssues } = await query
      if (ctrl.signal.aborted) return

      const list = (newIssues ?? []) as Issue[]
      setIssues(list)

      // fetch user votes if logged in
      if (userId && list.length > 0) {
        const { data: votes } = await supabase
          .from('votes')
          .select('issue_id, vote_type')
          .eq('user_id', userId)
          .in('issue_id', list.map(i => i.id))
        if (!ctrl.signal.aborted) {
          setUserVotes(Object.fromEntries((votes ?? []).map(v => [v.issue_id, v.vote_type])))
        }
      }
    } catch { /* ignore aborts */ }

    if (!ctrl.signal.aborted) setLoading(false)
  }, [userId])

  function handleCategoryChange(cat: string) {
    setCategory(cat)
    fetchIssues(cat)
  }

  // Sync if initialCategory changes (e.g. direct URL navigation)
  useEffect(() => {
    if (category !== initialCategory) {
      setCategory(initialCategory)
      fetchIssues(initialCategory)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCategory])

  return (
    <>
      {/* Category filter — instant, no navigation */}
      <div className="fixed top-[56px] left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-[#F5F5F7] z-30 px-4 py-2.5">
        <CategoryFilter active={category} onChangeDirect={handleCategoryChange} />
      </div>

      {loading ? <Skeleton /> : (
        issues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <span className="text-3xl">🗳️</span>
            </div>
            <p className="text-[15px] font-medium text-gray-500">아직 논제가 없습니다</p>
            <p className="text-[13px] text-gray-400 mt-1">곧 새로운 안건이 등록됩니다</p>
          </div>
        ) : (
          issues.map(issue => (
            <div key={issue.id} className="fade-in-up">
              <IssueCard issue={issue} userVote={userVotes[issue.id] ?? null} />
            </div>
          ))
        )
      )}
    </>
  )
}
