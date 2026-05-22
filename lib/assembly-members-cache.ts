/**
 * 22대 국회의원 전원 bulk fetch + 메모리 캐시
 *
 * 이름 필터 API는 불안정 — pSize=300 으로 전원 한 번에 가져온 뒤 로컬 검색.
 * Next.js 서버 재시작 전까지 유지, revalidate 24h.
 */

import { AssemblyMember } from './assembly-member-api'

const ENDPOINT = 'nprlapfmkoflxwwj'
const BASE_URL  = 'https://open.assembly.go.kr/portal/openapi'

let _cache: AssemblyMember[] | null = null
let _fetchedAt = 0
const TTL = 24 * 60 * 60 * 1000  // 24h

function calcAge(d: string): number | undefined {
  if (!d || d.length < 4) return undefined
  const y = parseInt(d.slice(0, 4))
  return isNaN(y) ? undefined : new Date().getFullYear() - y
}

function parseSessionsFromBio(bio: string): string | null {
  // 약력에서 "제XX대 국회의원" 패턴 추출
  const matches = [...bio.matchAll(/제\s*(\d+)\s*대/g)]
  if (!matches.length) return null
  const nums = [...new Set(matches.map(m => parseInt(m[1])))]
    .filter(n => n >= 17 && n <= 22)
    .sort((a, b) => a - b)
  return nums.length ? nums.map(n => `${n}대`).join(', ') : null
}

function mapRow(row: Record<string, string>): AssemblyMember {
  // nprlapfmkoflxwwj 는 HG_NM, nwvrqwavdgbnynftam 은 HMG_NM — 둘 다 지원
  const name     = (row.HG_NM ?? row.HMG_NM ?? '').trim()
  const birthDate = (row.BTH_DATE ?? '').replace(/-/g, '')
  const monaCd   = row.MONA_CD ?? ''
  const bio      = row.MEM_TITLE ?? ''

  return {
    name,
    engName:      row.ENG_NM ?? '',
    birthDate,
    age:          calcAge(birthDate),
    party:        row.POLY_NM ?? '',
    constituency: row.ORIG_NM ?? '',
    electionType: row.ELECT_GBN_NM ?? '',
    committee:    row.CMIT_NM ?? '',
    committees:   row.CMITS ?? '',
    billCount:    row.BILLS ?? '0',
    sex:          row.SEX ?? '',
    bio,
    photoUrl:     monaCd ? `https://open.assembly.go.kr/portal/img/naas/${monaCd}.jpg` : '',
    sessions:     parseSessionsFromBio(bio) ?? '22대',
    monaCd,
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
      pSize:  '300',       // 22대 전원 한 번에
    })

    const res = await fetch(`${BASE_URL}/${ENDPOINT}?${params}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal:  AbortSignal.timeout(10000),
    })
    if (!res.ok) break

    const data   = await res.json()
    const root   = data?.[ENDPOINT]
    const code   = root?.[0]?.head?.[1]?.RESULT?.CODE
    const total  = root?.[0]?.head?.[0]?.list_total_count ?? 0
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
  // 1. 완전 일치
  const exact = members.find(m => m.name === name)
  if (exact) return exact

  // 2. 포함 일치 (같은 이름 의원이 여럿일 때 대비해 첫 번째 반환)
  return members.find(m => m.name.includes(name) || name.includes(m.name)) ?? null
}

/** 이전 대수 조회 (병렬) — bio에서 못 찾은 경우에만 호출 */
export async function fetchPrevSessions(name: string, apiKey: string): Promise<string> {
  const prevAges = ['20', '21']
  const results = await Promise.all(prevAges.map(async (age) => {
    try {
      const p = new URLSearchParams({
        KEY: apiKey, Type: 'json', pIndex: '1', pSize: '1',
        HG_NM: name, AGE: age,
      })
      const r = await fetch(`${BASE_URL}/${ENDPOINT}?${p}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(4000),
      })
      if (!r.ok) return null
      const d    = await r.json()
      const code = d?.[ENDPOINT]?.[0]?.head?.[1]?.RESULT?.CODE
      const cnt  = d?.[ENDPOINT]?.[0]?.head?.[0]?.list_total_count ?? 0
      return (code === 'INFO-000' && cnt > 0) ? `${age}대` : null
    } catch { return null }
  }))

  const prev = results.filter(Boolean) as string[]
  return [...prev, '22대'].join(', ')
}
