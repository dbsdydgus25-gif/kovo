/**
 * POST /api/member/sync
 *
 * 국회의원 전원을 Assembly API에서 가져와 Supabase assembly_members 테이블에 저장.
 * 이후 의원 프로필 조회는 Supabase에서 즉시 반환 (API 재호출 없음).
 * 또한 issues.party가 '기타'인 항목을 올바른 정당으로 업데이트.
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

  // 2. Supabase upsert
  const rows = members.map(m => ({
    naas_cd:      m.monaCd,
    name:         m.name,
    eng_name:     m.engName,
    birth_date:   m.birthDate,
    party:        m.party,
    constituency: m.constituency,
    election_type:m.electionType,
    committee:    m.committee,
    committees:   m.committees,
    sex:          m.sex,
    bio:          m.bio,
    photo_url:    m.photoUrl,
    sessions:     m.sessions,
    synced_at:    new Date().toISOString(),
  }))

  const { error: upsertErr } = await supabase
    .from('assembly_members')
    .upsert(rows, { onConflict: 'naas_cd' })

  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 })
  }

  // 3. issues.party 업데이트 — '기타'로 저장된 것만
  const { data: badIssues } = await supabase
    .from('issues')
    .select('id, proposer, party')
    .or('party.eq.기타,party.is.null')

  let fixed = 0
  for (const issue of (badIssues ?? [])) {
    if (!issue.proposer) continue
    const member = members.find(m =>
      m.name === issue.proposer ||
      m.name.includes(issue.proposer) ||
      issue.proposer.includes(m.name)
    )
    if (member?.party) {
      await supabase
        .from('issues')
        .update({ party: member.party })
        .eq('id', issue.id)
      fixed++
    }
  }

  return NextResponse.json({
    success: true,
    synced:  rows.length,
    party_fixed: fixed,
  })
}
