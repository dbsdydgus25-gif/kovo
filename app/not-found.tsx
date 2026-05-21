import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-dvh bg-[#F5F5F7] flex flex-col items-center justify-center px-6 text-center">
      <div className="text-5xl mb-4">🗳️</div>
      <h2 className="text-[22px] font-black text-[#1C1917] mb-2">페이지를 찾을 수 없어요</h2>
      <p className="text-[14px] text-gray-400 mb-6">요청하신 논제가 없거나 삭제되었습니다</p>
      <Link
        href="/"
        className="h-12 px-6 rounded-2xl bg-[#0038A8] text-white text-[15px] font-semibold flex items-center btn-press"
      >
        홈으로 돌아가기
      </Link>
    </div>
  )
}
