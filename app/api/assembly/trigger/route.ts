import { NextResponse } from 'next/server'

// Manual trigger endpoint (not protected by Vercel cron auth)
export async function GET() {
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'

    // Call the sync endpoint internally with the cron secret
    const res = await fetch(`${baseUrl}/api/assembly/sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET ?? ''}`,
      },
    })

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
