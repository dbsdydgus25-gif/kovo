import { NextRequest, NextResponse } from 'next/server'
import { fetchMemberProfile } from '@/lib/assembly-member-api'

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get('name')
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const member = await fetchMemberProfile(name)
  if (!member) return NextResponse.json({ error: 'not found' }, { status: 404 })

  return NextResponse.json(member)
}
