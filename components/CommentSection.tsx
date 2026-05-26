'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Comment, VoteType } from '@/types'
import { formatRelativeTime } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import Portal from './Portal'
import AuthModal from './AuthModal'

interface CommentSectionProps {
  issueId: string
  userId: string | null
  userVote: VoteType | null
}

const VOTE_COLOR: Record<string, string> = {
  agree: '#0038A8',
  disagree: '#C60C30',
}

/* ── 개별 댓글 아이템 (인스타그램 스타일) ── */
function CommentItem({
  comment, number, onLike, onDelete, onEdit, userId,
}: {
  comment: Comment
  number: number
  onLike: (id: string) => void
  onDelete: (id: string) => void
  onEdit: (id: string, content: string) => void
  userId: string | null
}) {
  const [showMenu, setShowMenu] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(comment.content)
  const isOwn = userId === comment.user_id
  const avatarColor = VOTE_COLOR[comment.vote_type ?? ''] ?? '#9CA3AF'

  async function submitEdit() {
    if (!editText.trim()) return
    await onEdit(comment.id, editText.trim())
    setEditing(false)
  }

  return (
    <div className="flex gap-3 py-3">
      {/* 아바타 */}
      <div
        className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[11px] font-bold"
        style={{ background: avatarColor }}
      >
        {number}
      </div>

      {/* 내용 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold text-[#1C1917]">익명 {number}</span>
            {comment.vote_type && (
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: `${avatarColor}15`, color: avatarColor }}
              >
                {comment.vote_type === 'agree' ? '찬성' : '반대'}
              </span>
            )}
            <span className="text-[11px] text-gray-400">{formatRelativeTime(comment.created_at)}</span>
            {comment.is_edited && <span className="text-[10px] text-gray-300">수정됨</span>}
          </div>

          {isOwn && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(v => !v)}
                className="w-6 h-6 flex items-center justify-center rounded-full active:bg-gray-100"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="5" cy="12" r="1.5" fill="#9CA3AF"/>
                  <circle cx="12" cy="12" r="1.5" fill="#9CA3AF"/>
                  <circle cx="19" cy="12" r="1.5" fill="#9CA3AF"/>
                </svg>
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-7 z-20 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden min-w-[110px]">
                    <button
                      onClick={() => { setEditing(true); setShowMenu(false) }}
                      className="w-full px-4 py-3 text-left text-[13px] font-semibold text-[#1C1917] active:bg-gray-50"
                    >수정</button>
                    <div className="h-px bg-gray-50" />
                    <button
                      onClick={() => { onDelete(comment.id); setShowMenu(false) }}
                      className="w-full px-4 py-3 text-left text-[13px] font-semibold text-[#C60C30] active:bg-red-50"
                    >삭제</button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {editing ? (
          <div className="mt-1 space-y-2">
            <textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              className="w-full bg-gray-50 rounded-xl px-3 py-2 text-[14px] text-[#1C1917] resize-none outline-none border border-[#0038A8] min-h-[60px]"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="flex-1 py-1.5 rounded-xl bg-gray-100 text-[12px] font-semibold text-gray-500">취소</button>
              <button onClick={submitEdit} className="flex-1 py-1.5 rounded-xl bg-[#0038A8] text-[12px] font-semibold text-white">저장</button>
            </div>
          </div>
        ) : (
          <p className="text-[14px] text-[#1C1917] leading-relaxed break-words mt-0.5">{comment.content}</p>
        )}

        {/* 좋아요 */}
        <button
          onClick={() => userId && onLike(comment.id)}
          className="flex items-center gap-1 mt-2 btn-press"
        >
          <svg width="13" height="13" viewBox="0 0 24 24"
            fill={comment.has_liked ? '#C60C30' : 'none'}
            stroke={comment.has_liked ? '#C60C30' : '#D1D5DB'}
            strokeWidth="2"
          >
            <path d="M20.84 4.61A5.5 5.5 0 0 0 12 6.5 5.5 5.5 0 0 0 3.16 4.61C1.56 6.21 1.56 8.79 3.16 10.39L12 19.23L20.84 10.39C22.44 8.79 22.44 6.21 20.84 4.61Z"/>
          </svg>
          {comment.likes > 0 && (
            <span className="text-[11px]" style={{ color: comment.has_liked ? '#C60C30' : '#9CA3AF' }}>
              {comment.likes}
            </span>
          )}
        </button>
      </div>
    </div>
  )
}

/* ── 메인 컴포넌트 ── */
export default function CommentSection({ issueId, userId, userVote }: CommentSectionProps) {
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const supabase = createClient()

  const loadComments = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('issue_id', issueId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .limit(100)

    if (data) {
      let list = data as Comment[]
      if (userId) {
        const { data: likes } = await supabase
          .from('comment_likes').select('comment_id').eq('user_id', userId)
          .in('comment_id', data.map(c => c.id))
        const likedIds = new Set(likes?.map(l => l.comment_id) ?? [])
        list = data.map(c => ({ ...c, has_liked: likedIds.has(c.id) }))
      }
      setComments(list)
    }
    setLoading(false)
  }, [issueId, userId, supabase])

  // 시트 열기 — 애니메이션
  function openSheet() {
    setOpen(true)
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    loadComments()
  }

  function closeSheet() {
    setVisible(false)
    setTimeout(() => setOpen(false), 320)
  }

  // 배경 스크롤 잠금
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  // 새 댓글 달면 스크롤 맨 아래로
  useEffect(() => {
    if (listRef.current && open) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [comments.length, open])

  async function handleSubmit() {
    if (!userId) { setShowAuth(true); return }
    if (!newComment.trim() || submitting) return
    setSubmitting(true)
    const content = newComment.trim()
    setNewComment('')
    const { error } = await supabase.from('comments').insert({
      issue_id: issueId, user_id: userId, content, vote_type: userVote,
    })
    if (!error) await loadComments()
    setSubmitting(false)
    inputRef.current?.focus()
  }

  async function handleLike(commentId: string) {
    if (!userId) return
    const comment = comments.find(c => c.id === commentId)
    if (!comment) return
    setComments(prev => prev.map(c =>
      c.id === commentId ? { ...c, has_liked: !c.has_liked, likes: c.has_liked ? c.likes - 1 : c.likes + 1 } : c
    ))
    if (comment.has_liked) {
      await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', userId)
      await supabase.from('comments').update({ likes: comment.likes - 1 }).eq('id', commentId)
    } else {
      await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: userId })
      await supabase.from('comments').update({ likes: comment.likes + 1 }).eq('id', commentId)
      if (comment.user_id !== userId) {
        await supabase.from('notifications').insert({
          user_id: comment.user_id, type: 'comment_like', issue_id: issueId, comment_id: commentId,
        }).then(() => {})
      }
    }
  }

  async function handleDelete(commentId: string) {
    if (!userId) return
    setComments(prev => prev.filter(c => c.id !== commentId))
    await supabase.from('comments').update({ is_deleted: true }).eq('id', commentId).eq('user_id', userId)
  }

  async function handleEdit(commentId: string, content: string) {
    if (!userId) return
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, content, is_edited: true } : c))
    await supabase.from('comments').update({ content, is_edited: true }).eq('id', commentId).eq('user_id', userId)
  }

  const numMap = new Map(comments.map((c, i) => [c.id, i + 1]))

  return (
    <>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      {/* ── 트리거 버튼 ── */}
      <button
        onClick={openSheet}
        className="w-full bg-white rounded-2xl border border-gray-100 px-4 py-3.5 flex items-center gap-3 active:bg-gray-50 transition-colors btn-press"
      >
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"
              stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="flex-1 text-left">
          <p className="text-[14px] font-bold text-[#1C1917]">댓글</p>
          <p className="text-[12px] text-gray-400 mt-0.5">의견을 남겨보세요</p>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M9 18L15 12L9 6" stroke="#D1D5DB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* ── 바텀시트 (인스타그램 스타일) ── */}
      {open && (
        <Portal>
          {/* 딤 오버레이 */}
          <div
            className="fixed inset-0 z-[200] transition-opacity duration-300"
            style={{ background: 'rgba(0,0,0,0.5)', opacity: visible ? 1 : 0 }}
            onClick={closeSheet}
          />

          {/* 시트 */}
          <div
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-[201] flex flex-col bg-white rounded-t-[28px] transition-transform duration-300 ease-out"
            style={{
              transform: visible ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(100%)',
              maxHeight: '85dvh',
            }}
          >
            {/* 드래그 핸들 */}
            <div className="flex-shrink-0 flex flex-col items-center pt-3 pb-2 px-4">
              <div className="w-10 h-1 bg-gray-200 rounded-full mb-3" />
              <div className="w-full flex items-center justify-between">
                <h3 className="text-[16px] font-black text-[#1C1917]">
                  댓글
                  <span className="text-gray-400 font-normal text-[14px] ml-1.5">{comments.length}</span>
                </h3>
                <button
                  onClick={closeSheet}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6L18 18" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            </div>

            <div className="h-px bg-gray-100 flex-shrink-0" />

            {/* 댓글 목록 */}
            <div ref={listRef} className="flex-1 overflow-y-auto px-4 overscroll-contain">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-5 h-5 border-2 border-gray-200 border-t-[#0038A8] rounded-full animate-spin" />
                </div>
              ) : comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"
                        stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <p className="text-[14px] font-bold text-gray-400">첫 댓글을 남겨보세요</p>
                  <p className="text-[12px] text-gray-300 mt-1">익명으로 의견을 공유해요</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {comments.map(comment => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      number={numMap.get(comment.id) ?? 1}
                      onLike={handleLike}
                      onDelete={handleDelete}
                      onEdit={handleEdit}
                      userId={userId}
                    />
                  ))}
                </div>
              )}
              {/* 입력창 공간 확보 */}
              <div className="h-4" />
            </div>

            {/* ── 입력 영역 ── */}
            <div
              className="flex-shrink-0 border-t border-gray-100 px-4 py-3 flex items-end gap-3"
              style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
            >
              {/* 내 아바타 */}
              <div
                className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[12px] font-bold mb-0.5"
                style={{ background: userVote ? VOTE_COLOR[userVote] : '#D1D5DB' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="4" fill="white"/>
                  <path d="M4 20C4 17 7.6 14 12 14C16.4 14 20 17 20 20" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>

              {/* 텍스트 입력 */}
              <div className="flex-1 flex items-end gap-2 bg-gray-50 rounded-2xl px-3 py-2 border border-gray-100 focus-within:border-[#0038A8] transition-colors">
                <textarea
                  ref={inputRef}
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder={userId ? '댓글 달기... (익명)' : '로그인 후 댓글을 달 수 있어요'}
                  readOnly={!userId}
                  onClick={() => !userId && setShowAuth(true)}
                  className="flex-1 bg-transparent text-[14px] text-[#1C1917] placeholder:text-gray-400 resize-none outline-none leading-relaxed"
                  rows={1}
                  style={{ maxHeight: '80px' }}
                  onInput={e => {
                    const el = e.currentTarget
                    el.style.height = 'auto'
                    el.style.height = `${Math.min(el.scrollHeight, 80)}px`
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
                  }}
                />
                <button
                  onClick={handleSubmit}
                  disabled={!newComment.trim() || submitting}
                  className="flex-shrink-0 mb-0.5 btn-press disabled:opacity-40 transition-opacity"
                >
                  <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                    <circle cx="16" cy="16" r="16" fill={newComment.trim() ? '#0038A8' : '#E5E7EB'}/>
                    <path d="M22 16L13 11L14.5 15.5L13 21L22 16Z" fill="white"/>
                    <line x1="14.5" y1="15.8" x2="21" y2="15.8" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  )
}
