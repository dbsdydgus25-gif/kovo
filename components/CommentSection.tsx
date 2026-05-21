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

function CommentBubble({ comment, onLike, userId }: {
  comment: Comment
  onLike: (id: string) => void
  userId: string | null
}) {
  const isAgree = comment.vote_type === 'agree'

  return (
    <div className="flex gap-3 py-3 border-b border-gray-50 last:border-0 fade-in-up">
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[12px] font-bold"
        style={{ background: isAgree ? '#0038A8' : '#C60C30' }}
      >
        {isAgree ? '👍' : '👎'}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[12px] font-semibold" style={{ color: isAgree ? '#0038A8' : '#C60C30' }}>
            익명 {isAgree ? '찬성러' : '반대러'}
          </span>
          <span className="text-[11px] text-gray-400">{formatRelativeTime(comment.created_at)}</span>
        </div>

        <p className="text-[14px] text-[#1C1917] leading-relaxed break-words">{comment.content}</p>

        <button
          onClick={() => userId && onLike(comment.id)}
          className="flex items-center gap-1 mt-1.5 btn-press"
        >
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
      let commentsWithLikes = data as Comment[]
      if (userId) {
        const { data: likes } = await supabase
          .from('comment_likes')
          .select('comment_id')
          .eq('user_id', userId)
          .in('comment_id', data.map(c => c.id))

        const likedIds = new Set(likes?.map(l => l.comment_id) ?? [])
        commentsWithLikes = data.map(c => ({ ...c, has_liked: likedIds.has(c.id) }))
      }
      setComments(commentsWithLikes)
    }
    setLoading(false)
  }, [issueId, userId, supabase])

  useEffect(() => { loadComments() }, [loadComments])

  async function handleSubmit() {
    if (!userId) return
    if (!newComment.trim() || submitting) return

    setSubmitting(true)
    const content = newComment.trim()
    setNewComment('')

    const { error } = await supabase.from('comments').insert({
      issue_id: issueId,
      user_id: userId,
      content,
      vote_type: userVote,
    })

    if (!error) {
      await loadComments()
    }
    setSubmitting(false)
  }

  async function handleLike(commentId: string) {
    if (!userId) return
    const comment = comments.find(c => c.id === commentId)
    if (!comment) return

    setComments(prev => prev.map(c =>
      c.id === commentId
        ? { ...c, has_liked: !c.has_liked, likes: c.has_liked ? c.likes - 1 : c.likes + 1 }
        : c
    ))

    if (comment.has_liked) {
      await supabase.from('comment_likes').delete()
        .eq('comment_id', commentId).eq('user_id', userId)
      await supabase.from('comments').update({ likes: comment.likes - 1 }).eq('id', commentId)
    } else {
      await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: userId })
      await supabase.from('comments').update({ likes: comment.likes + 1 }).eq('id', commentId)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-gray-50">
        <h3 className="text-[15px] font-bold text-[#1C1917]">
          댓글 <span className="text-gray-400 font-normal text-[14px]">{comments.length}</span>
        </h3>
      </div>

      {/* Comment input */}
      {userId ? (
        <div className="px-4 py-3 border-b border-gray-50">
          <div className="flex gap-2">
            <div
              className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[12px] font-bold"
              style={{ background: userVote === 'agree' ? '#0038A8' : userVote === 'disagree' ? '#C60C30' : '#9CA3AF' }}
            >
              나
            </div>
            <div className="flex-1 flex gap-2">
              <textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="자유롭게 의견을 남겨보세요 (익명)"
                className="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-[14px] text-[#1C1917] placeholder:text-gray-400 resize-none outline-none border border-gray-100 focus:border-[#0038A8] transition-colors min-h-[44px] max-h-[100px]"
                rows={1}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit()
                  }
                }}
              />
              <button
                onClick={handleSubmit}
                disabled={!newComment.trim() || submitting}
                className="w-10 h-10 rounded-xl bg-[#0038A8] flex items-center justify-center flex-shrink-0 btn-press disabled:opacity-40 self-end"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                  <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" fill="white" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-4 py-4 border-b border-gray-50 text-center">
          <div className="flex flex-col items-center gap-1.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="11" width="18" height="11" rx="2" stroke="#D1D5DB" strokeWidth="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <p className="text-[13px] text-gray-400 font-medium">투표 후 댓글을 남길 수 있어요</p>
            <p className="text-[11px] text-gray-300">익명으로 자유롭게 의견을 공유하세요</p>
          </div>
        </div>
      )}

      {/* Comment list */}
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
              onLike={handleLike}
              userId={userId}
            />
          ))
        )}
      </div>
    </div>
  )
}
