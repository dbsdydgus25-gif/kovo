import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdminAuthenticatedFromRequest } from '@/lib/admin-auth'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  if (!isAdminAuthenticatedFromRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = getSupabase()
  const { data } = await supabase
    .from('issues')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)
  return NextResponse.json(data ?? [])
}

export async function PUT(req: NextRequest) {
  if (!isAdminAuthenticatedFromRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = getSupabase()
  // closes_at 처리: 재개설 시 새로운 7일 세팅
  if (updates.status === 'active' && updates.closes_at === undefined) {
    updates.closes_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  }
  const { error } = await supabase.from('issues').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
