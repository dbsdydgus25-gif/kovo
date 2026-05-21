import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'

export default function IssueLoading() {
  return (
    <div className="min-h-dvh bg-[#F5F5F7]">
      <TopBar showBack title="" />
      <div className="pt-[72px] pb-[84px] px-4 space-y-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="skeleton h-6 w-14 rounded-full" />
            <div className="skeleton h-4 w-20 rounded ml-auto" />
          </div>
          <div className="skeleton h-6 w-4/5 rounded mb-2" />
          <div className="skeleton h-6 w-3/5 rounded mb-3" />
          <div className="skeleton h-4 w-full rounded mb-1.5" />
          <div className="skeleton h-4 w-5/6 rounded" />
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="skeleton h-4 w-32 rounded mx-auto mb-4" />
          <div className="flex gap-3">
            <div className="skeleton h-14 flex-1 rounded-2xl" />
            <div className="skeleton h-14 flex-1 rounded-2xl" />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
          <div className="skeleton w-12 h-12 rounded-full mx-auto mb-3" />
          <div className="skeleton h-4 w-32 rounded mx-auto mb-2" />
          <div className="skeleton h-3 w-48 rounded mx-auto" />
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
