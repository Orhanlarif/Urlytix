import Link from 'next/link';

const features = [
  {
    title: 'Kısa Link Oluştur',
    description:
      'Custom alias desteği, QR kod üretimi ve anında paylaşım için hazır kısa URL\'ler.',
    icon: '🔗',
  },
  {
    title: 'Detaylı Analytics',
    description:
      'Cihaz, tarayıcı, referrer, UTM parametreleri ve günlük tıklama trendleri.',
    icon: '📊',
  },
  {
    title: 'Benzersiz Ziyaretçi',
    description:
      'Cookie tabanlı tekil ziyaretçi sayımı ile gerçek trafik performansını ölç.',
    icon: '👤',
  },
  {
    title: 'Gizlilik Odaklı',
    description:
      'IP adresleri hash\'lenir, bot trafiği ayrılır. Minimum veri, maksimum içgörü.',
    icon: '🔒',
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <header className="relative border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400 font-black text-slate-950">
              U
            </div>
            <span className="text-xl font-bold tracking-tight">Urlytics</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-900"
            >
              Giriş Yap
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Ücretsiz Başla
            </Link>
          </div>
        </div>
      </header>

      <section className="relative mx-auto max-w-6xl px-6 pb-24 pt-20 text-center">
        <div className="mb-6 inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200">
          Privacy-first · Ücretsiz · Analytics dahil
        </div>

        <h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-tight md:text-7xl">
          Kısa linkler.
          <span className="block text-cyan-300">Güçlü analytics.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">
          Urlytics ile linklerini kısalt, paylaş ve tıklamaların hangi cihazdan,
          hangi kaynaktan geldiğini tek dashboard&apos;dan takip et. Tamamen ücretsiz.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/register"
            className="rounded-xl bg-cyan-400 px-8 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Hemen Başla — Ücretsiz
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-slate-700 px-8 py-3 font-semibold text-slate-200 transition hover:bg-slate-900"
          >
            Giriş Yap
          </Link>
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-black/10"
            >
              <div className="text-3xl">{feature.icon}</div>
              <h2 className="mt-4 text-lg font-semibold">{feature.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-6 pb-24">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-10 text-center shadow-2xl shadow-black/20 md:p-16">
          <h2 className="text-3xl font-bold md:text-4xl">
            Bitly alternatifi değil — kendi analytics aracın.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-400">
            Urlytics, basit ve şeffaf bir link analytics deneyimi sunar. Gizlilik
            odaklı tasarım, süre sınırı, QR kod ve detaylı dashboard — hepsi
            tek platformda.
          </p>
          <Link
            href="/register"
            className="mt-8 inline-flex rounded-xl bg-cyan-400 px-8 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Ücretsiz Hesap Oluştur
          </Link>
        </div>
      </section>

      <footer className="relative border-t border-slate-800/80 py-8 text-center text-sm text-slate-500">
        <p>© {new Date().getFullYear()} Urlytics — Privacy-first link analytics</p>
      </footer>
    </main>
  );
}
