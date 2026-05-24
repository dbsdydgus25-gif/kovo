'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CATEGORY_COLORS } from '@/lib/utils'

const CATEGORIES = ['경제', '안보', '복지', '교육', '의료', '정치']

interface Stats {
  totalUsers: number
  totalVotes: number
  totalComments: number
  totalIssues: number
  activeIssues: number
  closedIssues: number
  todayVotes: number
  weekVotes: number
  todayComments: number
  weekComments: number
  chartData: { date: string; count: number }[]
}

interface EditForm {
  title: string
  summary: string
  pro_summary: string
  con_summary: string
  category: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function AdminDashboard({ stats, issues: initialIssues, comments: initialComments }: { stats: Stats; issues: any[]; comments: any[] }) {
  const router = useRouter()
  const [tab, setTab] = useState<'stats' | 'issues' | 'comments'>('stats')
  const [issues, setIssues] = useState(initialIssues)
  const [comments, setComments] = useState(initialComments)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [confirmIssueDelete, setConfirmIssueDelete] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editingIssue, setEditingIssue] = useState<any | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ title: '', summary: '', pro_summary: '', con_summary: '', category: '' })
  const [editSaving, setEditSaving] = useState(false)

  // 차트 최대값
  const maxChart = Math.max(...stats.chartData.map(d => d.count), 1)

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
    router.refresh()
  }

  async function toggleFeatured(issueId: string, current: boolean) {
    setLoadingId(issueId)
    const res = await fetch('/api/admin/issues', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: issueId, featured: !current }),
    })
    if (res.ok) {
      setIssues(prev => prev.map(i => i.id === issueId ? { ...i, featured: !current } : i))
    }
    setLoadingId(null)
  }

  async function closeIssue(issueId: string) {
    setLoadingId(issueId)
    const res = await fetch('/api/admin/issues', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: issueId, status: 'closed' }),
    })
    if (res.ok) {
      setIssues(prev => prev.map(i => i.id === issueId ? { ...i, status: 'closed' } : i))
    }
    setLoadingId(null)
  }

  async function reopenIssue(issueId: string) {
    setLoadingId(issueId)
    const res = await fetch('/api/admin/issues', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: issueId, status: 'active' }),
    })
    if (res.ok) {
      setIssues(prev => prev.map(i => i.id === issueId ? { ...i, status: 'active' } : i))
    }
    setLoadingId(null)
  }

  async function deleteComment(commentId: string) {
    setLoadingId(commentId)
    const res = await fetch(`/api/admin/comments?id=${commentId}`, { method: 'DELETE' })
    if (res.ok) {
      setComments(prev => prev.filter(c => c.id !== commentId))
    }
    setLoadingId(null)
    setConfirmDelete(null)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function openEdit(issue: any) {
    setEditingIssue(issue)
    setEditForm({
      title: issue.title ?? '',
      summary: issue.summary ?? '',
      pro_summary: issue.pro_summary ?? '',
      con_summary: issue.con_summary ?? '',
      category: issue.category ?? '',
    })
  }

  async function saveEdit() {
    if (!editingIssue) return
    setEditSaving(true)
    const res = await fetch('/api/admin/issues', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editingIssue.id, ...editForm }),
    })
    if (res.ok) {
      setIssues(prev => prev.map(i => i.id === editingIssue.id ? { ...i, ...editForm } : i))
      setEditingIssue(null)
    }
    setEditSaving(false)
  }

  async function hideIssue(issueId: string, currentStatus: string) {
    setLoadingId(issueId)
    const newStatus = currentStatus === 'hidden' ? 'active' : 'hidden'
    const res = await fetch('/api/admin/issues', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: issueId, status: newStatus }),
    })
    if (res.ok) {
      setIssues(prev => prev.map(i => i.id === issueId ? { ...i, status: newStatus } : i))
    }
    setLoadingId(null)
  }

  async function deleteIssue(issueId: string) {
    setLoadingId(issueId)
    const res = await fetch(`/api/admin/issues?id=${issueId}`, { method: 'DELETE' })
    if (res.ok) {
      setIssues(prev => prev.filter(i => i.id !== issueId))
    }
    setLoadingId(null)
    setConfirmIssueDelete(null)
  }

  const filteredIssues = issues.filter(i =>
    !search || i.title?.toLowerCase().includes(search.toLowerCase()) || i.category?.includes(search)
  )

  const formatDate = (d: string) => new Date(d).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
  const formatNum = (n: number) => n.toLocaleString()

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      {/* 헤더 */}
      <header className="bg-[#0038A8] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
            </svg>
          </div>
          <span className="text-white font-black text-[16px]">Kovo 관리자</span>
        </div>
        <button onClick={handleLogout} className="text-white/70 text-[12px] font-semibold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
          로그아웃
        </button>
      </header>

      {/* 통계 카드 */}
      <div className="px-4 py-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: '총 사용자', value: formatNum(stats.totalUsers), color: '#0038A8', sub: `오늘 +${formatNum(stats.todayVotes)}표` },
          { label: '총 투표수', value: formatNum(stats.totalVotes), color: '#0038A8', sub: `이번 주 ${formatNum(stats.weekVotes)}표` },
          { label: '총 댓글수', value: formatNum(stats.totalComments), color: '#C60C30', sub: `이번 주 ${formatNum(stats.weekComments)}개` },
          { label: '총 논제수', value: formatNum(stats.totalIssues), color: '#374151', sub: `진행중 ${stats.activeIssues} / 완료 ${stats.closedIssues}` },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-2xl p-4 border border-gray-100">
            <p className="text-[11px] text-gray-400 font-semibold mb-1">{card.label}</p>
            <p className="text-[22px] font-black" style={{ color: card.color }}>{card.value}</p>
            <p className="text-[10px] text-gray-300 mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* 탭 */}
      <div className="px-4 flex gap-2 mb-3">
        {[
          { key: 'stats', label: '📊 통계' },
          { key: 'issues', label: '📋 논제 관리' },
          { key: 'comments', label: '💬 댓글 관리' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className="px-4 py-2 rounded-xl text-[13px] font-bold transition-all"
            style={{
              background: tab === t.key ? '#0038A8' : 'white',
              color: tab === t.key ? 'white' : '#9CA3AF',
              border: tab === t.key ? 'none' : '1px solid #E5E7EB',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 pb-12">
        {/* ── 통계 탭 ── */}
        {tab === 'stats' && (
          <div className="space-y-3">
            {/* 14일 투표 추이 차트 */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <h3 className="text-[14px] font-bold text-[#1C1917] mb-4">📈 최근 14일 투표 추이</h3>
              <div className="flex items-end gap-1 h-24">
                {stats.chartData.map(d => {
                  const h = maxChart > 0 ? Math.max((d.count / maxChart) * 100, d.count > 0 ? 8 : 0) : 0
                  const isToday = d.date === new Date().toISOString().slice(0, 10)
                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[8px] text-gray-400">{d.count > 0 ? d.count : ''}</span>
                      <div
                        className="w-full rounded-t-sm transition-all"
                        style={{
                          height: `${h}%`,
                          minHeight: d.count > 0 ? '4px' : '0',
                          background: isToday ? '#C60C30' : '#0038A8',
                          opacity: isToday ? 1 : 0.7,
                        }}
                      />
                      <span className="text-[7px] text-gray-300 rotate-0 whitespace-nowrap">
                        {d.date.slice(5).replace('-', '/')}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 오늘 활동 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <p className="text-[11px] text-gray-400 font-semibold mb-2">오늘 활동</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[12px] text-gray-600">투표</span>
                    <span className="text-[14px] font-black text-[#0038A8]">{formatNum(stats.todayVotes)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[12px] text-gray-600">댓글</span>
                    <span className="text-[14px] font-black text-[#C60C30]">{formatNum(stats.todayComments)}</span>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <p className="text-[11px] text-gray-400 font-semibold mb-2">이번 주 활동</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[12px] text-gray-600">투표</span>
                    <span className="text-[14px] font-black text-[#0038A8]">{formatNum(stats.weekVotes)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[12px] text-gray-600">댓글</span>
                    <span className="text-[14px] font-black text-[#C60C30]">{formatNum(stats.weekComments)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 논제 현황 */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <h3 className="text-[14px] font-bold text-[#1C1917] mb-3">논제 현황</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-1 border-b border-gray-50">
                  <span className="text-[13px] text-gray-600">🟢 진행중</span>
                  <span className="text-[14px] font-bold text-[#0038A8]">{stats.activeIssues}개</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-gray-50">
                  <span className="text-[13px] text-gray-600">✅ 완료됨</span>
                  <span className="text-[14px] font-bold text-gray-500">{stats.closedIssues}개</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-[13px] text-gray-600">📊 전체</span>
                  <span className="text-[14px] font-bold text-[#1C1917]">{stats.totalIssues}개</span>
                </div>
              </div>
            </div>

            {/* 카테고리별 논제 */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <h3 className="text-[14px] font-bold text-[#1C1917] mb-3">카테고리별 논제</h3>
              <div className="space-y-2">
                {Object.entries(CATEGORY_COLORS).filter(([c]) => c !== '공통').map(([cat, color]) => {
                  const count = issues.filter(i => i.category === cat).length
                  if (count === 0) return null
                  const pct = issues.length > 0 ? Math.round((count / issues.length) * 100) : 0
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-[12px] mb-1">
                        <span style={{ color }} className="font-semibold">{cat}</span>
                        <span className="text-gray-400">{count}개 ({pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── 논제 관리 탭 ── */}
        {tab === 'issues' && (
          <div className="space-y-3">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="제목 또는 카테고리 검색..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-[13px] outline-none focus:border-[#0038A8] bg-white"
            />
            <div className="text-[12px] text-gray-400">{filteredIssues.length}개 논제</div>

            <div className="space-y-2">
              {filteredIssues.map(issue => {
                const catColor = CATEGORY_COLORS[issue.category] ?? '#6B7280'
                const total = (issue.agree_count ?? 0) + (issue.disagree_count ?? 0)
                const isClosed = issue.status === 'closed'
                const isLoading = loadingId === issue.id
                return (
                  <div key={issue.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                    <div className="flex items-start gap-2 mb-2 flex-wrap">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5"
                        style={{ background: `${catColor}18`, color: catColor }}>
                        {issue.category}
                      </span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 ${
                        issue.status === 'hidden' ? 'bg-gray-100 text-gray-400' :
                        isClosed ? 'bg-gray-100 text-gray-400' : 'bg-green-50 text-green-600'
                      }`}>
                        {issue.status === 'hidden' ? '🙈 숨김' : isClosed ? '완료' : '진행중'}
                      </span>
                      {issue.featured && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 bg-amber-50 text-amber-600">
                          ⭐ 추천
                        </span>
                      )}
                    </div>

                    <Link href={`/issue/${issue.id}`} target="_blank"
                      className="block text-[13px] font-semibold text-[#1C1917] leading-snug mb-2 hover:text-[#0038A8] transition-colors">
                      {issue.title}
                    </Link>

                    <div className="flex items-center gap-3 mb-3 text-[11px] text-gray-400">
                      <span>투표 {formatNum(total)}</span>
                      {issue.closes_at && (
                        <span>마감 {formatDate(issue.closes_at)}</span>
                      )}
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      {/* 수정 */}
                      <button
                        onClick={() => openEdit(issue)}
                        disabled={isLoading}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-blue-50 text-[#0038A8] disabled:opacity-50 transition-colors"
                      >
                        ✏️ 수정
                      </button>

                      {/* 추천 토글 */}
                      <button
                        onClick={() => toggleFeatured(issue.id, issue.featured)}
                        disabled={isLoading}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-50"
                        style={{
                          background: issue.featured ? '#FEF3C7' : '#F3F4F6',
                          color: issue.featured ? '#D97706' : '#6B7280',
                        }}
                      >
                        {issue.featured ? '⭐ 추천 해제' : '☆ 추천'}
                      </button>

                      {/* 숨기기 토글 */}
                      <button
                        onClick={() => hideIssue(issue.id, issue.status)}
                        disabled={isLoading}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-semibold disabled:opacity-50 transition-colors"
                        style={{
                          background: issue.status === 'hidden' ? '#ECFDF5' : '#F3F4F6',
                          color: issue.status === 'hidden' ? '#059669' : '#6B7280',
                        }}
                      >
                        {issue.status === 'hidden' ? '👁 표시' : '🙈 숨기기'}
                      </button>

                      {/* 마감/재개설 */}
                      {issue.status !== 'hidden' && (!isClosed ? (
                        <button
                          onClick={() => closeIssue(issue.id)}
                          disabled={isLoading}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-orange-50 text-orange-600 disabled:opacity-50 transition-colors"
                        >
                          마감
                        </button>
                      ) : (
                        <button
                          onClick={() => reopenIssue(issue.id)}
                          disabled={isLoading}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-green-50 text-green-600 disabled:opacity-50 transition-colors"
                        >
                          재개설
                        </button>
                      ))}

                      {/* 삭제 */}
                      <button
                        onClick={() => setConfirmIssueDelete(issue.id)}
                        disabled={isLoading}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-red-50 text-[#C60C30] disabled:opacity-50 transition-colors"
                      >
                        🗑 삭제
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── 댓글 관리 탭 ── */}
        {tab === 'comments' && (
          <div className="space-y-2">
            <div className="text-[12px] text-gray-400 mb-2">{comments.length}개 댓글</div>

            {comments.map(comment => {
              const voteColor = comment.vote_type === 'agree' ? '#0038A8' : comment.vote_type === 'disagree' ? '#C60C30' : '#9CA3AF'
              const voteLabel = comment.vote_type === 'agree' ? '찬' : comment.vote_type === 'disagree' ? '반' : '–'
              const isLoading = loadingId === comment.id
              return (
                <div key={comment.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[10px] font-bold mt-0.5"
                      style={{ background: voteColor }}>
                      {voteLabel}
                    </div>
                    <div className="flex-1 min-w-0">
                      {comment.issues && (
                        <Link href={`/issue/${comment.issues.id}`} target="_blank"
                          className="text-[10px] text-[#0038A8] font-semibold truncate block mb-1 hover:underline">
                          {comment.issues.title}
                        </Link>
                      )}
                      <p className="text-[13px] text-[#1C1917] leading-relaxed line-clamp-3">{comment.content}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-400">
                        <span>{new Date(comment.created_at).toLocaleDateString('ko-KR')}</span>
                        {comment.likes > 0 && <span>❤️ {comment.likes}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => setConfirmDelete(comment.id)}
                      disabled={isLoading}
                      className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0 disabled:opacity-50 hover:bg-red-100 transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M3 6H5H21M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6L18 20H6L5 6" stroke="#C60C30" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 댓글 삭제 확인 모달 */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40"
          onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-[16px] font-black text-center mb-2">댓글 삭제</h3>
            <p className="text-[13px] text-gray-500 text-center mb-5">이 댓글을 삭제하시겠습니까?<br/>복구할 수 없습니다.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-[13px] font-semibold text-gray-600">
                취소
              </button>
              <button onClick={() => deleteComment(confirmDelete)}
                disabled={loadingId === confirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-[#C60C30] text-[13px] font-semibold text-white disabled:opacity-60">
                {loadingId === confirmDelete ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 논제 삭제 확인 모달 */}
      {confirmIssueDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40"
          onClick={() => setConfirmIssueDelete(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-[16px] font-black text-center mb-2">논제 삭제</h3>
            <p className="text-[13px] text-gray-500 text-center mb-5">이 논제를 완전히 삭제합니다.<br/>관련 투표/댓글도 모두 삭제됩니다.<br/>복구할 수 없습니다.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmIssueDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-[13px] font-semibold text-gray-600">
                취소
              </button>
              <button onClick={() => deleteIssue(confirmIssueDelete)}
                disabled={loadingId === confirmIssueDelete}
                className="flex-1 py-2.5 rounded-xl bg-[#C60C30] text-[13px] font-semibold text-white disabled:opacity-60">
                {loadingId === confirmIssueDelete ? '삭제 중...' : '완전 삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 논제 수정 모달 */}
      {editingIssue && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setEditingIssue(null)}>
          <div className="bg-white w-full max-w-[480px] rounded-t-3xl p-6 pb-10 max-h-[90dvh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <h3 className="text-[17px] font-black text-[#1C1917] mb-4">논제 수정</h3>

            <div className="space-y-4">
              {/* 제목 */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 mb-1 block">제목</label>
                <input
                  value={editForm.title}
                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-[14px] outline-none focus:border-[#0038A8]"
                  placeholder="논제 제목"
                  maxLength={60}
                />
              </div>

              {/* 요약 */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 mb-1 block">요약</label>
                <textarea
                  value={editForm.summary}
                  onChange={e => setEditForm(f => ({ ...f, summary: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-[13px] outline-none focus:border-[#0038A8] resize-none"
                  rows={3}
                  placeholder="이 법안이 무엇을 바꾸려는지..."
                />
              </div>

              {/* 찬성 */}
              <div>
                <label className="text-[11px] font-bold text-[#0038A8] mb-1 block">찬성 측 주장</label>
                <textarea
                  value={editForm.pro_summary}
                  onChange={e => setEditForm(f => ({ ...f, pro_summary: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-[13px] outline-none focus:border-[#0038A8] resize-none"
                  rows={2}
                  placeholder="찬성 측 핵심 주장..."
                />
              </div>

              {/* 반대 */}
              <div>
                <label className="text-[11px] font-bold text-[#C60C30] mb-1 block">반대 측 주장</label>
                <textarea
                  value={editForm.con_summary}
                  onChange={e => setEditForm(f => ({ ...f, con_summary: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-[13px] outline-none focus:border-[#0038A8] resize-none"
                  rows={2}
                  placeholder="반대 측 핵심 주장..."
                />
              </div>

              {/* 카테고리 */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 mb-1 block">카테고리</label>
                <div className="flex gap-2 flex-wrap">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setEditForm(f => ({ ...f, category: cat }))}
                      className="px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all"
                      style={{
                        background: editForm.category === cat ? (CATEGORY_COLORS[cat] ?? '#0038A8') : '#F3F4F6',
                        color: editForm.category === cat ? 'white' : '#6B7280',
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingIssue(null)}
                className="flex-1 py-3 rounded-2xl bg-gray-100 text-[14px] font-semibold text-gray-600"
              >
                취소
              </button>
              <button
                onClick={saveEdit}
                disabled={editSaving}
                className="flex-1 py-3 rounded-2xl bg-[#0038A8] text-[14px] font-semibold text-white disabled:opacity-60"
              >
                {editSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
