type LoadingScreenProps = {
  text?: string;
};

export function LoadingScreen({ text = 'Yükleniyor...' }: LoadingScreenProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 px-6 py-4 text-sm text-slate-300">
        {text}
      </div>
    </main>
  );
}