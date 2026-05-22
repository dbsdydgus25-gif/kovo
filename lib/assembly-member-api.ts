import { getAllMembers, findByName, fetchPrevSessions } from './assembly-members-cache'

export interface AssemblyMember {
  name: string
  engName: string
  birthDate: string
  age?: number
  party: string
  constituency: string
  electionType: string
  committee: string
  committees: string
  billCount: string
  sex: string
  bio: string
  photoUrl: string
  sessions: string
  monaCd: string
}

export async function fetchMemberProfile(name: string): Promise<AssemblyMember | null> {
  const apiKey = process.env.ASSEMBLY_API_KEY
  if (!apiKey) return null

  // 전원 bulk 캐시에서 검색
  const all    = await getAllMembers(apiKey)
  const member = findByName(all, name)
  if (!member) return null

  // bio에서 이전 대수를 못 찾았으면 API로 보완 (22대만 표시된 경우)
  if (member.sessions === '22대') {
    const sessions = await fetchPrevSessions(name, apiKey)
    return { ...member, sessions }
  }

  return member
}

export { BILL_STAGES, getBillStageFromApiData } from './assembly-stage'
