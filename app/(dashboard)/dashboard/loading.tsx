export default function DashboardLoading() {
  return (
    <div className="container mx-auto py-8 space-y-8 animate-pulse">
      <div className="space-y-1.5">
        <div className="h-7 w-36 rounded-md bg-stone-200" />
        <div className="h-4 w-56 rounded-md bg-stone-100" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-[84px] rounded-xl border border-stone-200 bg-stone-100" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-48 rounded-xl border border-stone-200 bg-stone-100" />
        <div className="h-48 rounded-xl border border-stone-200 bg-stone-100" />
      </div>
      <div className="h-64 rounded-xl border border-stone-200 bg-stone-100" />
    </div>
  )
}
