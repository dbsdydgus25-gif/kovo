/**
 * 22대 국회의원 전원 bulk fetch + 메모리 캐시
 * ALLNAMEMBER 엔드포인트 (국회의원 정보 통합 API)
 */

import { AssemblyMember } from './assembly-member-api'

const ENDPOINT = 'ALLNAMEMBER'
const BASE_URL  = 'https://open.assembly.go.kr/portal/openapi'

let _cache: AssemblyMember[] | null = null
let _fetchedAt = 0
const TTL = 24 * 60 * 60 * 1000  // 24h

function calcAge(d: string): number | undefined {
  if (!d || d.length < 4) return undefined
  const y = parseInt(d.replace(/-/g, '').slice(0, 4))
  return isNaN(y) ? undefined : new Date().getFullYear() - y
}

function mapRow(row: Record<string, string>): AssemblyMember {
  const birthDate = (row.BIRDY_DT ?? '').replace(/-/g, '')

  // 사진: NAAS_PIC가 URL이면 그대로, 코드면 조합
  const pic = row.NAAS_PIC ?? ''
  const photoUrl = pic.startsWith('http') ? pic
    : pic ? `https://open.assembly.go.kr/portal/img/naas/${pic}.jpg`
    : ''

  // 당선대수: RLCT_DIV_NM(초선/재선/3선) 또는 GTELT_ERACO(숫자)
  const rlct = row.RLCT_DIV_NM ?? ''
  const eraco = row.GTELT_ERACO ?? ''
  const sessions = rlct || (eraco ? `${eraco}선` : '22대')

  return {
    name:         (row.NAAS_NM ?? '').trim(),
    engName:      row.NAAS_EN_NM ?? '',
    birthDate,
    age:          calcAge(birthDate),
    party:        row.PLPT_NM ?? '',
    constituency: row.ELECD_NM ?? '',
    electionType: row.ELECD_DIV_NM ?? '',
    committee:    row.CMIT_NM ?? '',
    committees:   row.BLNG_CMIT_NM ?? '',
    billCount:    '',   // ALLNAMEMBER에 없음
    sex:          row.NTR_DIV ?? '',
    bio:          row.BRF_HST ?? '',
    photoUrl,
    sessions,
    monaCd:       row.NAAS_CD ?? '',
  }
}

export async function getAllMembers(apiKey: string): Promise<AssemblyMember[]> {
  if (_cache && Date.now() - _fetchedAt < TTL) return _cache

  const members: AssemblyMember[] = []
  let page = 1

  while (true) {
    const params = new URLSearchParams({
      KEY:    apiKey,
      Type:   'json',
      pIndex: String(page),
      pSize:  '300',
    })

    const res = await fetch(`${BASE_URL}/${ENDPOINT}?${params}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal:  AbortSignal.timeout(10000),
    })
    if (!res.ok) break

    const data  = await res.json()
    const root  = data?.[ENDPOINT]
    const code  = root?.[0]?.head?.[1]?.RESULT?.CODE
    const total = root?.[0]?.head?.[0]?.list_total_count ?? 0
    const rows: Record<string, string>[] = root?.[1]?.row ?? []

    if (code !== 'INFO-000' || !rows.length) break

    members.push(...rows.map(mapRow))

    if (members.length >= total || rows.length < 300) break
    page++
  }

  if (members.length > 0) {
    _cache     = members
    _fetchedAt = Date.now()
  }

  return members
}

export function findByName(members: AssemblyMember[], name: string): AssemblyMember | null {
  const exact = members.find(m => m.name === name)
  if (exact) return exact
  return members.find(m => m.name.includes(name) || name.includes(m.name)) ?? null
}
