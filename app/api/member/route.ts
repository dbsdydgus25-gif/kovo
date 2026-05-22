import { NextRequest, NextResponse } from 'next/server'
import { getAllMembers, findByName, fetchPrevSessions } from '@/lib/assembly-members-cache'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const name   = request.nextUrl.searchParams.get('name')
  const debug  = request.nextUrl.searchParams.get('debug') === '1'
  const apiKey = process.env.ASSEMBLY_API_KEY

  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
  if (!apiKey) return NextResponse.json({ error: 'ASSEMBLY_API_KEY not configured' }, { status: 503 })

  const all    = await getAllMembers(apiKey)
  const member = findByName(all, name)

  if (debug) {
    return NextResponse.json({
      total_cached:   all.length,
      searched_name:  name,
      found:          !!member,
      first_5_names:  all.slice(0, 5).map(m => m.name),
    })
  }

  if (!member) {
    return NextResponse.json({
      error:        'not found',
      total_cached: all.length,
      searched:     name,
    }, { status: 404 })
  }

  // bio에서 이전 대수 못 찾으면 API 보완
  if (member.sessions === '22대') {
    const sessions = await fetchPrevSessions(name, apiKey)
    return NextResponse.json({ ...member, sessions })
  }

  return NextResponse.json(member)
}
