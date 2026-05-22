'use client'

import { BILL_STAGES } from '@/lib/assembly-stage'

interface Props {
  currentStage: number   // 0–5
  stageDate?: string     // YYYYMMDD or YYYY-MM-DD
}

function formatStageDate(d?: string): string {
  if (!d) return ''
  const s = d.replace(/-/g, '')
  if (s.length === 8) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
  return d
}

export default function BillStageProgress({ currentStage, stageDate }: Props) {
  const dateStr = formatStageDate(stageDate)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-4 pt-3.5 pb-1">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[12px] font-bold text-[#1C1917]">심사진행단계</p>
        </div>
        <p className="text-[10px] text-gray-400 mb-3">
          ※ 접수는 제안일자, 심사단계는 처리일자, 본회의는 의결일자 기준
        </p>
      </div>

      {/* Horizontal scrollable stage track */}
      <div className="px-4 pb-4 overflow-x-auto no-scrollbar">
        <div className="flex items-center min-w-max gap-0">
          {BILL_STAGES.map((stage, idx) => {
            const isPast = idx < currentStage
            const isCurrent = idx === currentStage
            const isFuture = idx > currentStage

            return (
              <div key={stage} className="flex items-center">
                {/* Stage circle */}
                <div className="flex flex-col items-center gap-1.5" style={{ minWidth: 72 }}>
                  <div
                    className="w-14 h-14 rounded-full flex flex-col items-center justify-center transition-all"
                    style={{
                      background: isCurrent ? '#1B8B82' : isPast ? '#1B8B8222' : '#F3F4F6',
                      border: isCurrent ? '2px solid #1B8B82' : isPast ? '2px solid #1B8B8244' : '2px solid #E5E7EB',
                    }}
                  >
                    {isCurrent ? (
                      <>
                        <span className="text-white font-bold text-[10px] leading-tight text-center px-1">
                          {stage}
                        </span>
                        {dateStr && (
                          <span className="text-white/80 text-[8px] leading-none mt-0.5">{dateStr}</span>
                        )}
                      </>
                    ) : isPast ? (
                      <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M20 6L9 17L4 12" stroke="#1B8B82" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span className="text-[#1B8B82] text-[9px] font-semibold mt-0.5 text-center px-1 leading-tight">{stage}</span>
                      </>
                    ) : (
                      <span className="text-gray-400 text-[10px] font-medium text-center px-1 leading-tight">{stage}</span>
                    )}
                  </div>
                </div>

                {/* Arrow between stages */}
                {idx < BILL_STAGES.length - 1 && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 mx-0.5">
                    <path d="M9 18L15 12L9 6"
                      stroke={idx < currentStage ? '#1B8B82' : '#D1D5DB'}
                      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
