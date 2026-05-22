export type VoteType = 'agree' | 'disagree'

export type AgeGroup = '10대' | '20대' | '30대' | '40대' | '50대' | '60대이상'
export type Gender = '남성' | '여성' | '기타' | '응답거부'
export type Region = string
export type Occupation = string

export interface Profile {
  id: string
  email: string | null
  display_name: string | null
  age_group: AgeGroup | null
  gender: Gender | null
  region: string | null
  occupation: string | null
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export interface Issue {
  id: string
  title: string
  summary: string
  description: string | null
  category: string
  party: string          // 투표 후에만 공개
  proposer: string | null // 발의 의원명 — 투표 후에만 공개
  bill_no: string | null
  assembly_session: number | null
  status: 'active' | 'closed' | 'pending'
  source_url: string | null
  pro_summary: string | null
  con_summary: string | null
  api_data: Record<string, unknown> | null
  agree_count: number
  disagree_count: number
  comment_count: number
  featured: boolean
  closes_at: string | null
  created_at: string
  updated_at: string
}

export interface Vote {
  id: string
  issue_id: string
  user_id: string
  vote_type: VoteType
  age_group: string | null
  gender: string | null
  region: string | null
  occupation: string | null
  created_at: string
}

export interface Comment {
  id: string
  issue_id: string
  user_id: string
  content: string
  vote_type: VoteType | null
  likes: number
  is_deleted: boolean
  created_at: string
  has_liked?: boolean
}

export interface DemographicInsight {
  label: string
  agree: number
  disagree: number
  total: number
}

export interface InsightData {
  byAge: DemographicInsight[]
  byGender: DemographicInsight[]
  byRegion: DemographicInsight[]
  byOccupation: DemographicInsight[]
}

export type Category = '전체' | '경제' | '안보' | '복지' | '교육' | '의료' | '환경' | '정치'
