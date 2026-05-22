'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatRelativeTime } from '@/lib/utils'

interface Notification {
  id: string
  type: string
  issue_id: string | null
  comment_id: string | null
  read: boolean
  created_at: string
  issues?: { title: string } | null
}

export default function NotificationBell({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const supabase = createClient()

  const loadNotifications = useCallback(async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*, issues(title)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)

    if (data) {
      setNotifications(data as Notification[])
      setUnread(data.filter((n) => !n.read).length)
    }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadNotifications() }, [loadNotifications])

  async function markAllRead() {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnread(0)
  }

  function handleOpen() {
    setOpen(true)
    if (unread > 0) {
      // 약간의 딜레이 후 읽음 처리 (화면 보여준 뒤)
      setTimeout(markAllRead, 800)
    }
  }

  function getNotificationText(n: Notification): string {
    switch (n.type) {
      case 'comment_like': return '내 댓글에 좋아요를 눌렀어요 ❤️'
      case 'comment_reply': return '내 댓글에 답글이 달렸어요 💬'
      default: return '새로운 알림이 있어요'
    }
  }

  function getNotificationIcon(type: string) {
    if (type === 'comment_like') {
      return (
        <div className="w-9 h-9 rounded-full bg-[#C60C30]/10 flex items-center justify-center flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#C60C30">
            <path d="M20.84 4.61A5.5 5.5 0 0 0 12 6.5 5.5 5.5 0 0 0 3.16 4.61C1.56 6.21 1.56 8.79 3.16 10.39L12 19.23L20.84 10.39C22.44 8.79 22.44 6.21 20.84 4.61Z" />
          </svg>
        </div>
      )
    }
    return (
      <div className="w-9 h-9 rounded-full bg-[#0038A8]/10 flex items-center justify-center flex-shrink-0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"
            stroke="#0038A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    )
  }

  return (
    <>
      {/* 벨 버튼 */}
      <button
        onClick={handleOpen}
        className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors btn-press"
        aria-label="알림"
      >
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
          <path d="M18 8A6 6 0 0 0 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z"
            stroke="#1C1917" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13.73 21C13.5543 21.3031 13.3008 21.5547 12.9979 21.7295C12.6951 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3049 21.9044 11.0021 21.7295C10.6992 21.5547 10.4457 21.3031 10.27 21H13.73Z"
            stroke="#1C1917" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {unread > 0 && (
          <span className="absolute top-0 right-0 min-w-[16px] h-4 rounded-full bg-[#C60C30] text-white text-[9px] font-black flex items-center justify-center px-0.5">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* 알림 시트 */}
      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-[480px] bg-white rounded-t-3xl max-h-[75dvh] flex flex-col fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-50 flex-shrink-0">
              <div>
                <h3 className="text-[17px] font-black text-[#1C1917]">알림</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {unread > 0 ? `읽지 않은 알림 ${unread}개` : '모두 읽었어요'}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 btn-press"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6L18 18" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* 알림 목록 */}
            <div className="overflow-y-auto flex-1 pb-8">
              {notifications.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="text-[42px] mb-3">🔔</div>
                  <p className="text-[14px] font-semibold text-gray-400">아직 알림이 없어요</p>
                  <p className="text-[12px] text-gray-300 mt-1">댓글에 좋아요를 받으면 알려드릴게요</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <Link
                    key={n.id}
                    href={n.issue_id ? `/issue/${n.issue_id}` : '#'}
                    onClick={() => setOpen(false)}
                    className={`flex items-start gap-3 px-5 py-3.5 border-b border-gray-50 active:bg-gray-50 transition-colors ${!n.read ? 'bg-[#0038A8]/[0.03]' : ''}`}
                  >
                    {getNotificationIcon(n.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#1C1917] leading-snug">
                        {getNotificationText(n)}
                      </p>
                      {n.issues?.title && (
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">{n.issues.title}</p>
                      )}
                      <p className="text-[11px] text-gray-300 mt-0.5">{formatRelativeTime(n.created_at)}</p>
                    </div>
                    {!n.read && (
                      <div className="w-2 h-2 rounded-full bg-[#0038A8] flex-shrink-0 mt-1.5" />
                    )}
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
