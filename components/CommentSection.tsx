'use client'

import { useState, useEffect, useCallback } from 'react'
import { Comment, VoteType } from '@/types'
import { formatRelativeTime } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface CommentSectionProps {
  issueId: string
  userId: string | null
  userVote: VoteType | null
}

function CommentBubble({
  comment, number, onLike, onDelete, onEdit, userId,
}: {
  comment: Comment
  number: number
  onLike: (id: string) => void
  onDelete: (id: string) => void
  onEdit: (id: string, content: string) => void
  userId: string | null
}) {
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(comment.content)
  const [showMenu, setShowMenu] = useState(false)
  const isOwn = userId === comment.user_id
  const dotColor = comment.vote_type === 'agree' ? '#0038A8' : comment.vote_type === 'disagree' ? '#C60C30' : '#9CA3AF'

  async function submitEdit() {
    if (!editText.trim()) return
    await onEdit(comment.id, editText.trim())
    setEditing(false)
  }

  return (
    <div className="flex gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[11px] font-bold" style={{ background: dotColor }}>
        {number}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold text-[#1C1917]">익명 {number}</span>
            <span className="text-[11px] text-gray-400">{formatRelativeTime(comment.created_at)}</span>
            {comment.is_edited && <span className="text-[10px] text-gray-300">(수정됨)</span>}
          </div>
          {isOwn && (
            <div className="relative">
              <button onClick={() => setShowMenu(v => !v)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="5" r="1.5" fill="#9CA3AF"/>
                  <circle cx="12" cy="12" r="1.5" fill="#9CA3AF"/>
                  <circle cx="12" cy="19" r="1.5" fill="#9CA3AF"/>
                </svg>
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-7 z-20 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden min-w-[100px]">
                    <button
                      onClick={() => { setEditing(true); setShowMenu(false) }}
                      className="w-full px-4 py-2.5 text-left text-[13px] font-medium text-[#1C1917] hover:bg-gray-50 flex items-center gap-2"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      수정
                    </button>
                    <button
                      onClick={() => { onDelete(comment.id); setShowMenu(false) }}
                      className="w-full px-4 py-2.5 text-left text-[13px] font-medium text-[#C60C30] hover:bg-red-50 flex items-center gap-2"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <path d="M3 6H5H21M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6L18.12 19.12C18.0878 19.6032 17.8745 20.0557 17.5238 20.3929C17.1732 20.7301 16.7115 20.9277 16.227 20.9476L7.773 20.9476C7.28851 20.9277 6.82683 20.7301 6.47617 20.3929C6.12551 20.0557 5.91218 19.6032 5.88 19.12L5 6H19Z" stroke="#C60C30" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      삭제
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {editing ? (
          <div className="space-y-2">
            <textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              className="w-full bg-gray-50 rounded-xl px-3 py-2 text-[14px] text-[#1C1917] resize-none outline-none border border-[#0038A8] min-h-[60px]"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="flex-1 py-1.5 rounded-lg bg-gray-100 text-[12px] font-semibold text-gray-500">취소</button>
              <button onClick={submitEdit} className="flex-1 py-1.5 rounded-lg bg-[#0038A8] text-[12px] font-semibold text-white">저장</button>
            </div>
          </div>
        ) : (
          <p className="text-[14px] text-[#1C1917] leading-relaxed break-words">{comment.content}</p>
        )}

        <button onClick={() => userId && onLike(comment.id)} className="flex items-center gap-1 mt-1.5 btn-press">
          <svg width="14" height="14" viewBox="0 0 24 24" fill={comment.has_liked ? '#C60C30' : 'none'}>
            <path d="M20.84 4.61A5.5 5.5 0 0 0 12 6.5 5.5 5.5 0 0 0 3.16 4.61C1.56 6.21 1.56 8.79 3.16 10.39L12 19.23L20.84 10.39C22.44 8.79 22.44 6.21 20.84 4.61Z"
              stroke={comment.has_liked ? '#C60C30' : '#9CA3AF'} strokeWidth="2" />
          </svg>
          <span className="text-[12px]" style={{ color: comment.has_liked ? '#C60C30' : '#9CA3AF' }}>
            {comment.likes > 0 ? comment.likes : ''}
          </span>
        </button>
      </div>
    </div>
  )
}

export default function CommentSection({ issueId, userId, userVote }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()

  const loadComments = useCallback(async () => {
    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('issue_id', issueId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(50)

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

  useEffect(() => { loadComments() }, [loadComments])

  async function handleSubmit() {
    if (!userId || !newComment.trim() || submitting) return
    setSubmitting(true)
    const content = newComment.trim()
    setNewComment('')
    const { error } = await supabase.from('comments').insert({
      issue_id: issueId, user_id: userId, content, vote_type: userVote,
    })
    if (!error) await loadComments()
    setSubmitting(false)
  }

  async function handleLike(commentId: string) {
    if (!userId) return
    const comment = comments.find(c => c.id === commentId)
    if (!comment) return

    // 낙관적 업데이트
    setComments(prev => prev.map(c =>
      c.id === commentId ? { ...c, has_liked: !c.has_liked, likes: c.has_liked ? c.likes - 1 : c.likes + 1 } : c
    ))

    if (comment.has_liked) {
      await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', userId)
      await supabase.from('comments').update({ likes: comment.likes - 1 }).eq('id', commentId)
    } else {
      await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: userId })
      await supabase.from('comments').update({ likes: comment.likes + 1 }).eq('id', commentId)
      // 알림 생성 (본인 댓글이 아닌 경우)
      if (comment.user_id !== userId) {
        await supabase.from('notifications').insert({
          user_id: comment.user_id,
          type: 'comment_like',
          issue_id: issueId,
          comment_id: commentId,
        }).then(() => {}) // 알림 실패해도 무시
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
    await supabase.from('comments')
      .update({ content, is_edited: true })
      .eq('id', commentId).eq('user_id', userId)
  }

  const sorted = [...comments].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  const numMap = new Map(sorted.map((c, i) => [c.id, i + 1]))

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-gray-50">
        <h3 className="text-[15px] font-bold text-[#1C1917]">
          댓글 <span className="text-gray-400 font-normal text-[14px]">{comments.length}</span>
        </h3>
      </div>

      {userId ? (
        <div className="px-4 py-3 border-b border-gray-50">
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[12px] font-bold"
              style={{ background: userVote === 'agree' ? '#0038A8' : userVote === 'disagree' ? '#C60C30' : '#9CA3AF' }}>
              나
            </div>
            <div className="flex-1 flex gap-2">
              <textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="자유롭게 의견을 남겨보세요 (익명)"
                className="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-[14px] text-[#1C1917] placeholder:text-gray-400 resize-none outline-none border border-gray-100 focus:border-[#0038A8] transition-colors min-h-[44px] max-h-[100px]"
                rows={1}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
              />
              <button onClick={handleSubmit} disabled={!newComment.trim() || submitting}
                className="w-10 h-10 rounded-xl bg-[#0038A8] flex items-center justify-center flex-shrink-0 btn-press disabled:opacity-40 self-end">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                  <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" fill="white" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-4 py-4 border-b border-gray-50 text-center">
          <p className="text-[13px] text-gray-400">투표 후 댓글을 남길 수 있어요</p>
        </div>
      )}

      <div className="px-4">
        {loading ? (
          <div className="py-6 text-center text-[13px] text-gray-400">불러오는 중...</div>
        ) : comments.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-[14px] text-gray-400">아직 댓글이 없어요</p>
            <p className="text-[12px] text-gray-300 mt-1">첫 번째 의견을 남겨보세요</p>
          </div>
        ) : (
          comments.map(comment => (
            <CommentBubble
              key={comment.id}
              comment={comment}
              number={numMap.get(comment.id) ?? 1}
              onLike={handleLike}
              onDelete={handleDelete}
              onEdit={handleEdit}
              userId={userId}
            />
          ))
        )}
      </div>
    </div>
  )
}
