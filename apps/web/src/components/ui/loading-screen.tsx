type LoadingScreenProps = {
  text?: string;
};

export function LoadingScreen({ text = 'Yükleniyor...' }: LoadingScreenProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-2 border-slate-800" />
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-cyan-400" />
        </div>
        <p className="text-sm text-slate-400">{text}</p>
      </div>
    </main>
  );
}
