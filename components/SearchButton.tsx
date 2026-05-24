'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Portal from './Portal'
import { CATEGORY_COLORS } from '@/lib/utils'

// 초성 추출
const CHOSUNG_LIST = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']

function extractChosung(str: string): string {
  return str.split('').map(ch => {
    const code = ch.charCodeAt(0) - 0xAC00
    if (code < 0 || code > 11171) return ch
    return CHOSUNG_LIST[Math.floor(code / 588)]
  }).join('')
}

function matchQuery(query: string, target: string): boolean {
  if (!query.trim()) return false
  const q = query.trim()
  const isChosung = /^[ㄱ-ㅎ]+$/.test(q)
  if (isChosung) return extractChosung(target).includes(q)
  return target.toLowerCase().includes(q.toLowerCase())
}

interface IssueItem {
  id: string
  title: string
  category: string
  agree_count: number
  disagree_count: number
}

export default function SearchButton() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [allIssues, setAllIssues] = useState<IssueItem[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setLoading(true)
      setQuery('')
      const supabase = createClient()
      supabase
        .from('issues')
        .select('id, title, category, agree_count, disagree_count')
        .order('created_at', { ascending: false })
        .limit(200)
        .then(({ data }) => {
          setAllIssues((data ?? []) as IssueItem[])
          setLoading(false)
        })
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [open])

  const results = query.trim()
    ? allIssues.filter(i => matchQuery(query, i.title) || matchQuery(query, i.category)).slice(0, 12)
    : allIssues.slice(0, 6)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-9 h-9 flex items-center justify-center btn-press"
        aria-label="검색"
      >
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="8" stroke="#1C1917" strokeWidth="2.2"/>
          <path d="M21 21L16.65 16.65" stroke="#1C1917" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <Portal>
          <div
            className="fixed inset-0 z-[100] bg-white flex flex-col"
            style={{ maxWidth: '480px', left: '50%', transform: 'translateX(-50%)' }}
          >
            {/* 검색창 헤더 */}
            <div className="flex items-center gap-3 px-4 h-[56px] border-b border-gray-100 flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
                <circle cx="11" cy="11" r="8" stroke="#9CA3AF" strokeWidth="2"/>
                <path d="M21 21L16.65 16.65" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="논제 검색 (초성 가능: ㅎㄱ, ㄷㅅ...)"
                className="flex-1 text-[15px] font-medium text-[#1C1917] placeholder:text-gray-300 outline-none bg-transparent"
              />
              {query ? (
                <button
                  onClick={() => setQuery('')}
                  className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center btn-press"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6L18 18" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                </button>
              ) : null}
              <button
                onClick={() => setOpen(false)}
                className="text-[14px] font-semibold text-gray-400 px-1 py-1 btn-press flex-shrink-0"
              >
                취소
              </button>
            </div>

            {/* 결과 목록 */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-20 text-[13px] text-gray-300">
                  불러오는 중...
                </div>
              ) : results.length === 0 && query.trim() ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <p className="text-[32px] mb-3">🔍</p>
                  <p className="text-[15px] font-bold text-gray-400">검색 결과가 없어요</p>
                  <p className="text-[12px] text-gray-300 mt-1">다른 키워드로 검색해보세요</p>
                </div>
              ) : (
                <div className="px-4 pt-3 pb-10">
                  {!query.trim() && (
                    <p className="text-[11px] text-gray-400 font-semibold mb-2 tracking-wide">최근 논제</p>
                  )}
                  {query.trim() && (
                    <p className="text-[11px] text-gray-400 font-semibold mb-2">
                      검색 결과 {results.length}개
                    </p>
                  )}
                  <div className="space-y-2">
                    {results.map(issue => {
                      const catColor = CATEGORY_COLORS[issue.category] ?? '#6B7280'
                      const total = (issue.agree_count ?? 0) + (issue.disagree_count ?? 0)
                      return (
                        <Link
                          key={issue.id}
                          href={`/issue/${issue.id}`}
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#F5F5F7] active:bg-gray-200 transition-colors"
                        >
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap"
                            style={{ background: `${catColor}20`, color: catColor }}
                          >
                            {issue.category}
                          </span>
                          <span className="flex-1 text-[14px] font-semibold text-[#1C1917] leading-snug line-clamp-2">
                            {issue.title}
                          </span>
                          <span className="text-[11px] text-gray-400 flex-shrink-0">
                            {total.toLocaleString()}표
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Portal>
      )}
    </>
  )
}
