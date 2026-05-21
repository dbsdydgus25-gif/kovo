import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'

export default function HomeLoading() {
  return (
    <div className="min-h-dvh bg-[#F5F5F7]">
      <TopBar title="Kovo" />
      <div className="pt-[72px] pb-[84px]">
        {/* Category filter skeleton */}
        <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
          {[80, 48, 64, 56, 60, 56, 64].map((w, i) => (
            <div key={i} className="skeleton h-8 rounded-full flex-shrink-0" style={{ width: w }} />
          ))}
        </div>

        {/* Issue card skeletons */}
        <div className="px-4 space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="skeleton h-6 w-14 rounded-full" />
                <div className="skeleton h-4 w-16 rounded ml-auto" />
              </div>
              <div className="skeleton h-5 w-4/5 rounded mb-1.5" />
              <div className="skeleton h-5 w-3/5 rounded mb-3" />
              <div className="skeleton h-3 w-full rounded mb-1.5" />
              <div className="skeleton h-3 w-5/6 rounded mb-4" />
              <div className="skeleton h-10 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
