import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { fetchRecentBills } from '@/lib/assembly-api'

export async function POST(request: NextRequest) {
  // Simple auth check for cron jobs
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const { bills } = await fetchRecentBills(1, 20)

    let inserted = 0
    for (const bill of bills) {
      const { data: existing } = await supabase
        .from('issues')
        .select('id')
        .eq('bill_no', bill.BILL_NO)
        .single()

      if (!existing) {
        const { error } = await supabase.from('issues').insert({
          title: bill.BILL_NAME,
          summary: `${bill.PROPOSER} 발의 | ${bill.PROC_RESULT}`,
          description: null,
          category: '정치',
          party: bill.PROPOSER.includes('정부') ? '정부' : '의원발의',
          bill_no: bill.BILL_NO,
          source_url: bill.LINK_URL,
          status: 'active',
          api_data: bill as unknown as Record<string, unknown>,
        })
        if (!error) inserted++
      }
    }

    return NextResponse.json({ success: true, inserted })
  } catch (err) {
    console.error('Assembly sync error:', err)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}
