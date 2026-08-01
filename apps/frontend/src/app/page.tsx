export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-5xl font-bold tracking-tight text-white">BeatForge</h1>
      <p className="text-neutral-400 text-lg">Electronic music production studio</p>
      <span className="mt-2 rounded-full border border-forge-border bg-forge-surface px-3 py-1 text-xs text-neutral-500">
        v0.1.0 — skeleton
      </span>
    </main>
  );
}
