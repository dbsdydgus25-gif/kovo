import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return '방금 전'
  if (diffMin < 60) return `${diffMin}분 전`
  if (diffHour < 24) return `${diffHour}시간 전`
  if (diffDay < 7) return `${diffDay}일 전`
  return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}

export function formatNumber(n: number): string {
  if (n >= 100000) return `${(n / 10000).toFixed(0)}만`
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}천`
  return n.toLocaleString('ko-KR')
}

export function getVotePercentage(agree: number, disagree: number) {
  const total = agree + disagree
  if (total === 0) return { agree: 50, disagree: 50, total: 0 }
  return {
    agree: Math.round((agree / total) * 100),
    disagree: Math.round((disagree / total) * 100),
    total,
  }
}

export const CATEGORY_COLORS: Record<string, string> = {
  경제: '#3B82F6',
  안보: '#EF4444',
  복지: '#10B981',
  교육: '#F59E0B',
  의료: '#8B5CF6',
  환경: '#14B8A6',
  정치: '#EC4899',
  공통: '#6B7280',
}

export const PARTY_LABELS: Record<string, string> = {
  '더불어민주당': '민주당',
  '국민의힘': '국힘',
  공통: '공통',
  정부: '정부',
  의원: '의원발의',
}

export const REGIONS = [
  '서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산', '세종',
  '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주',
]

export const OCCUPATIONS = [
  '학생', '직장인', '자영업', '전문직', '공무원', '주부', '농어업', '무직', '기타',
]
