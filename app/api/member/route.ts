import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAllMembers, findByName } from '@/lib/assembly-members-cache'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const name   = request.nextUrl.searchParams.get('name')
  const debug  = request.nextUrl.searchParams.get('debug') === '1'
  const apiKey = process.env.ASSEMBLY_API_KEY

  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  // 1. Supabase 캐시에서 먼저 조회 (즉시 반환)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: cached } = await supabase
    .from('assembly_members')
    .select('*')
    .or(`name.eq.${name},name.ilike.%${name}%`)
    .limit(1)
    .maybeSingle()

  if (cached) {
    return NextResponse.json({
      name:         cached.name,
      engName:      cached.eng_name,
      birthDate:    cached.birth_date,
      age:          cached.birth_date ? new Date().getFullYear() - parseInt(cached.birth_date.slice(0, 4)) : undefined,
      party:        cached.party,
      constituency: cached.constituency,
      electionType: cached.election_type,
      committee:    cached.committee,
      committees:   cached.committees,
      sex:          cached.sex,
      bio:          cached.bio,
      photoUrl:     cached.photo_url,
      sessions:     cached.sessions,
      monaCd:       cached.naas_cd,
    })
  }

  // 2. Supabase에 없으면 Assembly API 직접 호출 (초기 미싱 케이스)
  if (!apiKey) return NextResponse.json({ error: 'ASSEMBLY_API_KEY not configured' }, { status: 503 })

  const all    = await getAllMembers(apiKey)
  const member = findByName(all, name)

  if (debug) {
    return NextResponse.json({
      total_cached:  all.length,
      searched_name: name,
      found:         !!member,
      first_5_names: all.slice(0, 5).map(m => m.name),
      source:        'assembly_api',
    })
  }

  if (!member) {
    return NextResponse.json({ error: 'not found', searched: name }, { status: 404 })
  }

  return NextResponse.json(member)
}
