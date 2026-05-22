'use client'

import Link from 'next/link'
import { Issue } from '@/types'
import { formatNumber, CATEGORY_COLORS } from '@/lib/utils'

interface IssueCardProps {
  issue: Issue
  userVote?: 'agree' | 'disagree' | null
  isClosed?: boolean
}

export default function IssueCard({ issue, userVote, isClosed }: IssueCardProps) {
  const catColor = CATEGORY_COLORS[issue.category] ?? '#6B7280'
  const hasVoted = !!userVote
  const total = issue.agree_count + issue.disagree_count
  const agreePct = total > 0 ? Math.round((issue.agree_count / total) * 100) : 0

  return (
    <Link href={`/issue/${issue.id}`} className="block">
      <article className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm active:scale-[0.99] transition-transform duration-100">
        <div className="px-4 pt-4 pb-4">
          {/* Category + badges */}
          <div className="flex items-center gap-2 mb-2.5">
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: `${catColor}15`, color: catColor }}
            >
              {issue.category}
            </span>
            {issue.featured && !isClosed && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
                🔥 주목
              </span>
            )}
            {isClosed && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                투표 마감
              </span>
            )}
          </div>

          {/* Title */}
          <h2 className="text-[16px] font-bold text-[#1C1917] leading-snug mb-2 line-clamp-2">
            {issue.title}
          </h2>

          {/* Summary */}
          <p className="text-[13px] text-[#78716C] leading-relaxed line-clamp-2 mb-3">
            {issue.summary}
          </p>

          {/* 완료됨: 결과 바 표시 */}
          {isClosed && total > 0 && (
            <div className="mb-3">
              <div className="flex justify-between text-[11px] font-bold mb-1">
                <span style={{ color: '#0038A8' }}>찬성 {agreePct}%</span>
                <span className="text-gray-400 font-normal">{formatNumber(total)}명 참여</span>
                <span style={{ color: '#C60C30' }}>반대 {100 - agreePct}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden flex bg-gray-100">
                <div className="h-full bg-[#0038A8] rounded-l-full" style={{ width: `${agreePct}%` }} />
                <div className="h-full bg-[#C60C30] rounded-r-full" style={{ width: `${100 - agreePct}%` }} />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-[12px] text-gray-400">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M21 15C21 16.1 20.1 17 19 17H7L3 21V5C3 3.9 3.9 3 5 3H19C20.1 3 21 3.9 21 5V15Z"
                  stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{formatNumber(issue.comment_count)}</span>
              <span className="mx-1.5 text-gray-200">·</span>
              <span>{formatNumber(total)}명 참여</span>
            </div>

            {isClosed ? (
              <span className="text-[12px] font-semibold text-gray-400 flex items-center gap-0.5">
                결과 보기
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M9 18L15 12L9 6" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            ) : hasVoted ? (
              <span
                className="text-[12px] font-bold px-3 py-1 rounded-full"
                style={{
                  background: userVote === 'agree' ? '#0038A810' : '#C60C3010',
                  color: userVote === 'agree' ? '#0038A8' : '#C60C30',
                }}
              >
                {userVote === 'agree' ? '👍 찬성' : '👎 반대'}
              </span>
            ) : (
              <span className="text-[12px] font-semibold text-[#0038A8] flex items-center gap-0.5">
                투표하기
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M9 18L15 12L9 6" stroke="#0038A8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            )}
          </div>
        </div>

        {hasVoted && !isClosed && (
          <div className="h-1 w-full" style={{ background: userVote === 'agree' ? '#0038A8' : '#C60C30' }} />
        )}
      </article>
    </Link>
  )
}
