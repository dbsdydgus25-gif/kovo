'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'

const CATEGORIES = ['전체', '경제', '안보', '복지', '교육', '의료', '정치']

interface Props {
  active: string
  onChangeDirect?: (cat: string) => void
}

export default function CategoryFilter({ active, onChangeDirect }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleClick(cat: string) {
    if (onChangeDirect) {
      onChangeDirect(cat)
    } else {
      startTransition(() => {
        router.push(cat === '전체' ? '/' : `/?category=${encodeURIComponent(cat)}`)
      })
    }
  }

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar">
      {CATEGORIES.map(cat => {
        const isActive = active === cat
        return (
          <button
            key={cat}
            onClick={() => handleClick(cat)}
            className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-semibold btn-press whitespace-nowrap transition-opacity"
            style={{
              background: isActive ? '#0038A8' : 'white',
              color: isActive ? 'white' : '#78716C',
              border: isActive ? 'none' : '1px solid #E5E7EB',
              opacity: isPending && !isActive ? 0.6 : 1,
            }}
          >
            {cat}
          </button>
        )
      })}
    </div>
  )
}
