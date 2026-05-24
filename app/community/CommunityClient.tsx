'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatRelativeTime } from '@/lib/utils'
import AuthModal from '@/components/AuthModal'

interface NewsItem {
  id: string
  title: string
  link: string | null
  pub_date: string
  source: string
}

interface Post {
  id: string
  title: string
  content: string
  likes: number
  comment_count: number
  created_at: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profiles: any
}

interface Props {
  initialNews: NewsItem[]
  userId: string | null
}

export default function CommunityClient({ initialNews, userId }: Props) {
  const [tab, setTab] = useState<'news' | 'board'>('news')
  const [posts, setPosts] = useState<Post[]>([])
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [showWrite, setShowWrite] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [writeTitle, setWriteTitle] = useState('')
  const [writeContent, setWriteContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadPosts = useCallback(async () => {
    setLoadingPosts(true)
    const res = await fetch('/api/posts')
    if (res.ok) setPosts(await res.json())
    setLoadingPosts(false)
  }, [])

  useEffect(() => {
    if (tab === 'board' && posts.length === 0) loadPosts()
  }, [tab, posts.length, loadPosts])

  async function handleSubmitPost() {
    if (!writeTitle.trim() || !writeContent.trim()) return
    setSubmitting(true)
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: writeTitle, content: writeContent }),
    })
    if (res.ok) {
      const newPost = await res.json()
      setPosts(prev => [newPost, ...prev])
      setWriteTitle('')
      setWriteContent('')
      setShowWrite(false)
    }
    setSubmitting(false)
  }

  async function handleLike(postId: string) {
    if (!userId) { setShowAuth(true); return }
    await fetch('/api/posts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: postId }),
    })
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: p.likes + 1 } : p))
  }

  async function handleDelete(postId: string) {
    if (!confirm('게시글을 삭제하시겠습니까?')) return
    const res = await fetch(`/api/posts?id=${postId}`, { method: 'DELETE' })
    if (res.ok) setPosts(prev => prev.filter(p => p.id !== postId))
  }

  const getAuthorName = (post: Post) => {
    const name = post.profiles?.display_name
    return name || '익명'
  }

  return (
    <>
      {/* 탭 */}
      <div className="flex gap-1 bg-white rounded-2xl p-1 border border-gray-100">
        {(['news', 'board'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-xl text-[14px] font-bold transition-all"
            style={{
              background: tab === t ? '#0038A8' : 'transparent',
              color: tab === t ? 'white' : '#9CA3AF',
            }}
          >
            {t === 'news' ? '📰 뉴스' : '💬 게시판'}
          </button>
        ))}
      </div>

      {/* ── 뉴스 탭 ── */}
      {tab === 'news' && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-[#C60C30] animate-pulse" />
              <span className="text-[11px] font-semibold text-gray-400 tracking-widest uppercase">Live</span>
            </div>
            <h2 className="text-[16px] font-black text-[#1C1917]">오늘의 정치 뉴스</h2>
            <p className="text-[12px] text-gray-400 mt-0.5">주요 언론사 정치 섹션</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {initialNews.map((item, idx) => (
              <a
                key={item.id}
                href={item.link ?? undefined}
                target={item.link ? '_blank' : undefined}
                rel="noopener noreferrer"
                className="flex items-start gap-3 px-4 py-4 border-b border-gray-50 last:border-0 active:bg-gray-50 transition-colors"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                    <span className="text-[11px] font-black text-gray-500">{idx + 1}</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-[#1C1917] leading-snug mb-1.5">{item.title}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-[#0038A8] bg-blue-50 px-1.5 py-0.5 rounded">{item.source}</span>
                    <span className="text-[11px] text-gray-400">{formatRelativeTime(item.pub_date)}</span>
                  </div>
                </div>
                {item.link && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 mt-1">
                    <path d="M7 17L17 7M17 7H7M17 7V17" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── 게시판 탭 ── */}
      {tab === 'board' && (
        <div className="space-y-3">
          {/* 글쓰기 버튼 */}
          <button
            onClick={() => userId ? setShowWrite(true) : setShowAuth(true)}
            className="w-full h-12 rounded-2xl bg-[#0038A8] text-white text-[14px] font-bold btn-press flex items-center justify-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 5V19M5 12H19" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            글 쓰기
          </button>

          {loadingPosts ? (
            <div className="flex items-center justify-center py-16 text-[13px] text-gray-300">
              불러오는 중...
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <p className="text-[32px] mb-3">💬</p>
              <p className="text-[15px] font-bold text-gray-400">아직 게시글이 없어요</p>
              <p className="text-[12px] text-gray-300 mt-1">첫 번째 글을 남겨보세요!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {posts.map(post => (
                <div key={post.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-[14px] font-bold text-[#1C1917] leading-snug flex-1">{post.title}</h3>
                    {userId && post.profiles && (
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="text-gray-300 active:text-red-400 flex-shrink-0"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </button>
                    )}
                  </div>
                  <p className="text-[13px] text-gray-500 leading-relaxed line-clamp-3 mb-3">{post.content}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[11px] text-gray-400">
                      <span className="font-semibold">{getAuthorName(post)}</span>
                      <span>{formatRelativeTime(post.created_at)}</span>
                    </div>
                    <button
                      onClick={() => handleLike(post.id)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 active:text-[#C60C30] transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M20.84 4.61A5.5 5.5 0 0 0 12 6.5 5.5 5.5 0 0 0 3.16 4.61C1.56 6.21 1.56 8.79 3.16 10.39L12 19.23L20.84 10.39C22.44 8.79 22.44 6.21 20.84 4.61Z"
                          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {post.likes}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 글쓰기 모달 */}
      {showWrite && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40"
          onClick={() => setShowWrite(false)}>
          <div className="bg-white w-full max-w-[480px] rounded-t-3xl p-6 pb-10 max-h-[85dvh] flex flex-col"
            onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <h3 className="text-[17px] font-black text-[#1C1917] mb-4">게시글 작성</h3>

            <input
              value={writeTitle}
              onChange={e => setWriteTitle(e.target.value)}
              placeholder="제목 (최대 100자)"
              maxLength={100}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-[14px] font-semibold outline-none focus:border-[#0038A8] mb-3"
            />

            <textarea
              value={writeContent}
              onChange={e => setWriteContent(e.target.value)}
              placeholder="자유롭게 의견을 남겨주세요 (최대 2000자)"
              maxLength={2000}
              rows={6}
              className="flex-1 w-full px-4 py-3 border border-gray-200 rounded-2xl text-[13px] outline-none focus:border-[#0038A8] resize-none mb-1"
            />
            <div className="text-[11px] text-gray-400 text-right mb-4">
              {writeContent.length}/2000
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowWrite(false)}
                className="flex-1 py-3 rounded-2xl bg-gray-100 text-[14px] font-semibold text-gray-600"
              >
                취소
              </button>
              <button
                onClick={handleSubmitPost}
                disabled={submitting || !writeTitle.trim() || !writeContent.trim()}
                className="flex-1 py-3 rounded-2xl bg-[#0038A8] text-[14px] font-semibold text-white disabled:opacity-50"
              >
                {submitting ? '올리는 중...' : '게시하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  )
}
