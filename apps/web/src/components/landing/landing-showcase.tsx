'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/i18n/language-provider';
import { Reveal, fadeUp, useIsDesktop, viewportOnce } from './motion';

/** 14 daily click values — rising trend toward the end */
const TREND = [38, 44, 41, 52, 48, 61, 58, 72, 68, 81, 76, 90, 86, 98];
const DAY_LABELS = [1, 4, 7, 10, 14];
const TOTAL_CLICKS = '2.4K';
const PEAK_CLICKS = '312';

export function LandingShowcase() {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const isDesktop = useIsDesktop();

  const devices = [
    { label: t.landing.showcaseDesktop, value: 52 },
    { label: t.landing.showcaseMobile, value: 38 },
    { label: t.landing.showcaseTablet, value: 10 },
  ];

  const referrers = [
    { label: t.landing.showcaseDirect, value: 44 },
    { label: t.landing.showcaseSocial, value: 31 },
    { label: t.landing.showcaseSearch, value: 25 },
  ];

  return (
    <section className="relative mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24 lg:pb-28">
      <div className="mb-10 text-center sm:mb-14">
        <Reveal>
          <h2 className="text-heading-lg">{t.landing.showcaseTitle}</h2>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-[var(--muted-foreground)] sm:text-base">
            {t.landing.showcaseSubtitle}
          </p>
        </Reveal>
      </div>

      <Reveal variants={fadeUp}>
        <div className="relative">
          <div className="pointer-events-none absolute -inset-2 rounded-[2rem] bg-gradient-to-br from-[var(--accent)]/15 via-transparent to-blue-500/10 blur-2xl sm:-inset-4" />

          <Card className="relative overflow-hidden border-[var(--border-strong)] p-0 shadow-[var(--shadow-lg)]">
            <div className="border-b border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3 sm:px-5 sm:py-3.5">
              <div className="flex min-w-0 items-center gap-2">
                <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-400/80" />
                <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400/80" />
                <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400/80" />
                <span className="ml-1 truncate text-xs text-[var(--muted-foreground)] sm:ml-2">
                  {t.landing.previewUrl}
                </span>
              </div>
            </div>

            <div className="grid gap-4 p-4 sm:gap-6 sm:p-5 lg:grid-cols-[1.35fr_1fr] lg:p-7">
              <div className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                  <div>
                    <p className="text-caption">{t.landing.previewLast14}</p>
                    <p className="mt-1.5 text-2xl font-bold tracking-tight text-[var(--foreground)]">
                      {TOTAL_CLICKS}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      {t.landing.showcaseTotalClicks}
                    </p>
                  </div>

                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <div className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[var(--success-border)] bg-[var(--success-muted)] px-2.5 py-1 text-xs font-medium leading-snug text-[var(--success)]">
                      <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                      <span className="min-w-0">{t.landing.showcaseTrendUp}</span>
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {t.landing.showcasePeakDay}:{' '}
                      <span className="font-medium text-[var(--foreground)]">
                        {PEAK_CLICKS}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="relative mt-5 flex-1 sm:mt-6">
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-36 sm:h-44"
                    aria-hidden
                  >
                    {[0, 25, 50, 75, 100].map((line) => (
                      <div
                        key={line}
                        className="absolute inset-x-0 border-t border-[var(--border)]/60"
                        style={{ top: `${line}%` }}
                      />
                    ))}
                  </div>

                  <div className="relative flex h-36 items-end gap-1 sm:h-44 sm:gap-1.5">
                    {TREND.map((height, index) => {
                      const isPeak = height === Math.max(...TREND);
                      const bar = (
                        <div
                          className={`w-full rounded-t-md ${
                            isPeak
                              ? 'bg-gradient-to-t from-[var(--accent-active)] via-[var(--accent)] to-[var(--accent-hover)] shadow-[0_0_16px_-4px_var(--accent-glow)]'
                              : 'bg-gradient-to-t from-[var(--accent-active)]/80 to-[var(--accent-hover)]/90'
                          }`}
                          style={{ height: `${height}%` }}
                        />
                      );

                      if (reduceMotion) {
                        return (
                          <div key={index} className="flex h-full flex-1 items-end">
                            {bar}
                          </div>
                        );
                      }

                      if (!isDesktop) {
                        return (
                          <div key={index} className="flex h-full flex-1 items-end">
                            <motion.div
                              className={`w-full origin-bottom rounded-t-md ${
                                isPeak
                                  ? 'bg-gradient-to-t from-[var(--accent-active)] via-[var(--accent)] to-[var(--accent-hover)] shadow-[0_0_16px_-4px_var(--accent-glow)]'
                                  : 'bg-gradient-to-t from-[var(--accent-active)]/80 to-[var(--accent-hover)]/90'
                              }`}
                              initial={{ opacity: 0.35, scaleY: 0 }}
                              whileInView={{ opacity: 1, scaleY: 1 }}
                              viewport={viewportOnce}
                              transition={{
                                duration: 0.5,
                                delay: 0.06 + index * 0.025,
                                ease: [0.16, 1, 0.3, 1],
                              }}
                              style={{ height: `${height}%` }}
                            />
                          </div>
                        );
                      }

                      return (
                        <motion.div
                          key={index}
                          className="flex h-full flex-1 items-end"
                          initial={{ opacity: 0.35 }}
                          whileInView={{ opacity: 1 }}
                          viewport={viewportOnce}
                          transition={{
                            duration: 0.35,
                            delay: 0.08 + index * 0.03,
                          }}
                        >
                          <motion.div
                            className={`w-full origin-bottom rounded-t-md ${
                              isPeak
                                ? 'bg-gradient-to-t from-[var(--accent-active)] via-[var(--accent)] to-[var(--accent-hover)] shadow-[0_0_16px_-4px_var(--accent-glow)]'
                                : 'bg-gradient-to-t from-[var(--accent-active)]/80 to-[var(--accent-hover)]/90'
                            }`}
                            initial={{ scaleY: 0 }}
                            whileInView={{ scaleY: 1 }}
                            viewport={viewportOnce}
                            transition={{
                              duration: 0.55,
                              delay: 0.1 + index * 0.035,
                              ease: [0.16, 1, 0.3, 1],
                            }}
                            style={{ height: `${height}%` }}
                          />
                        </motion.div>
                      );
                    })}
                  </div>

                  <div className="mt-3 flex justify-between px-0.5 text-[10px] tabular-nums text-[var(--muted-foreground)] sm:text-xs">
                    {DAY_LABELS.map((day) => (
                      <span key={day}>{day}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-1">
                <BreakdownCard
                  title={t.landing.showcaseDevices}
                  rows={devices}
                  reduceMotion={!!reduceMotion}
                  isDesktop={isDesktop}
                />
                <BreakdownCard
                  title={t.landing.showcaseReferrers}
                  rows={referrers}
                  reduceMotion={!!reduceMotion}
                  isDesktop={isDesktop}
                />
              </div>
            </div>
          </Card>
        </div>
      </Reveal>
    </section>
  );
}

function BreakdownCard({
  title,
  rows,
  reduceMotion,
  isDesktop,
}: {
  title: string;
  rows: { label: string; value: number }[];
  reduceMotion: boolean;
  isDesktop: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
      <p className="text-caption mb-4">{title}</p>
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={row.label}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span>{row.label}</span>
              <span className="text-[var(--muted-foreground)]">{row.value}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-raised)]">
              {reduceMotion ? (
                <div
                  className="h-full rounded-full bg-[var(--accent)]"
                  style={{ width: `${row.value}%` }}
                />
              ) : !isDesktop ? (
                <motion.div
                  className="h-full origin-left rounded-full bg-[var(--accent)]"
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={viewportOnce}
                  transition={{
                    duration: 0.6,
                    delay: 0.15 + index * 0.06,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  style={{ width: `${row.value}%` }}
                />
              ) : (
                <motion.div
                  className="h-full rounded-full bg-[var(--accent)]"
                  initial={{ width: 0 }}
                  whileInView={{ width: `${row.value}%` }}
                  viewport={viewportOnce}
                  transition={{
                    duration: 0.7,
                    delay: 0.2 + index * 0.08,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
