'use client'

import { useState } from 'react'
import { DemographicInsight } from '@/types'

interface InsightsChartProps {
  byAge: DemographicInsight[]
  byGender: DemographicInsight[]
  byRegion: DemographicInsight[]
  byOccupation: DemographicInsight[]
}

type Tab = 'age' | 'gender' | 'region' | 'occupation'

const tabs: { key: Tab; label: string }[] = [
  { key: 'age', label: '연령별' },
  { key: 'gender', label: '성별' },
  { key: 'region', label: '지역별' },
  { key: 'occupation', label: '직업별' },
]

function DemoBar({ item }: { item: DemographicInsight }) {
  const total = item.agree + item.disagree
  if (total === 0) return null
  const agreePct = Math.round((item.agree / total) * 100)
  const disagreePct = 100 - agreePct

  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-[12px] text-[#78716C] w-16 flex-shrink-0 text-right">{item.label}</span>
      <div className="flex-1 h-6 rounded-full overflow-hidden flex bg-gray-100 relative">
        <div
          className="h-full rounded-l-full vote-bar flex items-center justify-end pr-1.5"
          style={{ width: `${agreePct}%`, background: '#0038A8' }}
        >
          {agreePct > 20 && (
            <span className="text-[10px] text-white font-bold">{agreePct}%</span>
          )}
        </div>
        <div
          className="h-full rounded-r-full flex items-center justify-start pl-1.5"
          style={{ width: `${disagreePct}%`, background: '#C60C30' }}
        >
          {disagreePct > 20 && (
            <span className="text-[10px] text-white font-bold">{disagreePct}%</span>
          )}
        </div>
      </div>
      <span className="text-[11px] text-gray-400 w-10 flex-shrink-0">{total.toLocaleString()}</span>
    </div>
  )
}

export default function InsightsChart({ byAge, byGender, byRegion, byOccupation }: InsightsChartProps) {
  const [activeTab, setActiveTab] = useState<Tab>('age')

  const dataMap: Record<Tab, DemographicInsight[]> = {
    age: byAge,
    gender: byGender,
    region: byRegion,
    occupation: byOccupation,
  }

  const currentData = dataMap[activeTab].filter(d => d.total > 0)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-gray-50">
        <h3 className="text-[15px] font-bold text-[#1C1917]">인구통계 인사이트</h3>
        <p className="text-[12px] text-[#78716C] mt-0.5">투표자 분포를 확인하세요</p>
      </div>

      {/* Tab selector */}
      <div className="flex border-b border-gray-100">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex-1 py-2.5 text-[13px] font-medium transition-colors relative btn-press"
            style={{ color: activeTab === tab.key ? '#0038A8' : '#9CA3AF' }}
          >
            {tab.label}
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#0038A8] rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 pt-3 pb-1">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#0038A8]" />
          <span className="text-[11px] text-[#78716C]">찬성</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#C60C30]" />
          <span className="text-[11px] text-[#78716C]">반대</span>
        </div>
      </div>

      {/* Bars */}
      <div className="px-4 pb-4 pt-2">
        {currentData.length === 0 ? (
          <div className="py-8 text-center text-[13px] text-gray-400">
            인구통계 정보를 입력한 투표자가 없어요
          </div>
        ) : (
          currentData.map(item => <DemoBar key={item.label} item={item} />)
        )}
      </div>
    </div>
  )
}
