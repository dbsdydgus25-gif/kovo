import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Kovo | 대한민국 정치 찬반 플랫폼',
  description: '편향 없이, 내 시각으로. 대한민국 정치 안건에 찬반 투표하고 인구통계 인사이트를 확인하세요.',
  keywords: ['정치', '찬반', '투표', '국회', 'Kovo', '민주주의', '깨어있는민주주의'],
  openGraph: {
    title: 'Kovo | 대한민국 정치 찬반 플랫폼',
    description: '편향 없이, 내 시각으로.',
    type: 'website',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Kovo',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#F5F5F7',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
