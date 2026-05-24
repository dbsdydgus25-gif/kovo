/**
 * POST /api/member/sync
 *
 * 국회의원 전원을 Assembly API에서 가져와 Supabase assembly_members 테이블에 저장.
 * 이후 의원 프로필 조회는 Supabase에서 즉시 반환 (API 재호출 없음).
 * 또한 issues.party를 assembly_members DB 기준으로 전수 재검증 + 수정.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAllMembers } from '@/lib/assembly-members-cache'

export const dynamic   = 'force-dynamic'
export const maxDuration = 60

export async function GET() { return run() }
export async function POST() { return run() }

async function run() {
  const apiKey = process.env.ASSEMBLY_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ASSEMBLY_API_KEY not set' }, { status: 503 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Assembly API에서 전원 로드
  const members = await getAllMembers(apiKey)
  if (!members.length) {
    return NextResponse.json({ error: 'No members fetched from API' }, { status: 502 })
  }

  // 2. Supabase upsert (assembly_members 테이블 최신화)
  const rows = members.map(m => ({
    naas_cd:       m.monaCd,
    name:          m.name,
    eng_name:      m.engName,
    birth_date:    m.birthDate,
    party:         m.party,
    constituency:  m.constituency,
    election_type: m.electionType,
    committee:     m.committee,
    committees:    m.committees,
    sex:           m.sex,
    bio:           m.bio,
    photo_url:     m.photoUrl,
    sessions:      m.sessions,
    synced_at:     new Date().toISOString(),
  }))

  const { error: upsertErr } = await supabase
    .from('assembly_members')
    .upsert(rows, { onConflict: 'naas_cd' })

  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 })
  }

  // 3. issues.party 전수 재검증 — proposer 기준으로 assembly_members DB와 교차 검증
  //    '기타'/null뿐 아니라 잘못 저장된 실제 정당명도 수정
  const { data: allIssues } = await supabase
    .from('issues')
    .select('id, proposer, party')
    .not('proposer', 'is', null)

  // 빠른 이름 조회를 위한 Map 생성
  const memberByName = new Map<string, string>() // name → party
  for (const m of members) {
    if (m.name && m.party) {
      memberByName.set(m.name, m.party)
    }
  }

  function findParty(proposer: string): string | null {
    if (!proposer) return null
    // 1. 정확히 일치
    if (memberByName.has(proposer)) return memberByName.get(proposer)!
    // 2. 부분 일치 (이름이 포함되는 경우)
    for (const [name, party] of memberByName) {
      if (name.includes(proposer) || proposer.includes(name)) return party
    }
    return null
  }

  let fixed = 0
  const updates: { id: string; party: string }[] = []

  for (const issue of (allIssues ?? [])) {
    if (!issue.proposer) continue
    // 정부 발의는 건드리지 않음
    if (issue.party === '정부') continue

    const correctParty = findParty(issue.proposer)
    if (!correctParty) continue

    // 이미 올바른 정당이면 skip
    if (issue.party === correctParty) continue

    updates.push({ id: issue.id, party: correctParty })
  }

  // 배치 업데이트
  for (const u of updates) {
    await supabase.from('issues').update({ party: u.party }).eq('id', u.id)
    fixed++
  }

  return NextResponse.json({
    success:     true,
    synced:      rows.length,
    party_fixed: fixed,
    details:     updates.slice(0, 20).map(u => `${u.id} → ${u.party}`),
  })
}
