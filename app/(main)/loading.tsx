export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse space-y-8 px-4 py-8 md:px-6">
      {/* Hero */}
      <div className="h-48 border-[3px] border-(--ink)/30 bg-(--card) shadow-[6px_6px_0_var(--ink)] opacity-60" />
      {/* Two-col cards */}
      <div className="grid grid-cols-1 gap-8 pt-4 md:grid-cols-2">
        <div className="h-56 border-[3px] border-(--ink)/30 bg-(--card) shadow-[6px_6px_0_var(--ink)] opacity-60" />
        <div className="h-56 border-[3px] border-(--ink)/30 bg-(--card) shadow-[6px_6px_0_var(--ink)] opacity-60" />
      </div>
      {/* Trend */}
      <div className="h-64 border-[3px] border-(--ink)/30 bg-(--card) shadow-[6px_6px_0_var(--ink)] opacity-60" />
    </div>
  );
}
