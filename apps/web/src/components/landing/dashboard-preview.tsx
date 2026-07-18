'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/i18n/language-provider';
import { Floating, fadeUp, useIsDesktop, viewportOnce } from './motion';

const BAR_HEIGHTS = [40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88, 72, 100];

export function DashboardPreview() {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const isDesktop = useIsDesktop();

  const previewMetrics = [
    { label: t.landing.previewLinks, value: '24' },
    { label: t.landing.previewClicks, value: '1.2K' },
    { label: t.landing.previewToday, value: '89' },
  ];

  const card = (
    <Card className="relative overflow-hidden border-[var(--border-strong)] p-0 shadow-[var(--shadow-glow)]">
      <div className="border-b border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-400/80" />
          <div className="h-3 w-3 rounded-full bg-amber-400/80" />
          <div className="h-3 w-3 rounded-full bg-emerald-400/80" />
          <span className="ml-2 text-xs text-[var(--muted-foreground)]">
            {t.landing.previewUrl}
          </span>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="grid grid-cols-3 gap-3">
          {previewMetrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3"
            >
              <p className="text-caption">{metric.label}</p>
              <p className="mt-1 text-xl font-bold text-[var(--accent)]">
                {metric.value}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
          <p className="text-caption">{t.landing.previewLast14}</p>
          <div className="mt-4 flex h-24 items-end gap-1.5">
            {reduceMotion ? (
              BAR_HEIGHTS.map((height, index) => (
                <div
                  key={index}
                  className="flex-1 rounded-t bg-gradient-to-t from-[var(--accent-active)] to-[var(--accent-hover)]"
                  style={{ height: `${height}%` }}
                />
              ))
            ) : isDesktop ? (
              BAR_HEIGHTS.map((height, index) => (
                <motion.div
                  key={index}
                  className="flex-1 origin-bottom rounded-t bg-gradient-to-t from-[var(--accent-active)] to-[var(--accent-hover)]"
                  initial={{ scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={viewportOnce}
                  transition={{
                    duration: 0.55,
                    delay: 0.15 + index * 0.035,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  style={{ height: `${height}%` }}
                />
              ))
            ) : (
              <motion.div
                className="flex h-full w-full origin-bottom items-end gap-1.5"
                initial={{ opacity: 0.45, scaleY: 0 }}
                whileInView={{ opacity: 1, scaleY: 1 }}
                viewport={viewportOnce}
                transition={{
                  duration: 0.55,
                  delay: 0.15,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                {BAR_HEIGHTS.map((height, index) => (
                  <div
                    key={index}
                    className="flex-1 rounded-t bg-gradient-to-t from-[var(--accent-active)] to-[var(--accent-hover)]"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </motion.div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {['Portfolio', 'Blog post', 'Campaign'].map((title, index) => (
            <div
              key={title}
              className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="text-xs text-[var(--accent)]/80">
                  urlytix.com/{title.toLowerCase().replace(' ', '-')}
                </p>
              </div>
              <span className="text-sm text-[var(--muted-foreground)]">
                {[312, 189, 94][index]} {t.common.clicks}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );

  if (reduceMotion) {
    return (
      <div className="relative">
        <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-[var(--accent)]/25 via-blue-500/10 to-transparent blur-2xl sm:-inset-6" />
        {card}
      </div>
    );
  }

  return (
    <motion.div
      className="relative"
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      transition={{ delay: 0.2 }}
    >
      <motion.div
        aria-hidden
        className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-[var(--accent)]/25 via-blue-500/10 to-transparent blur-2xl sm:-inset-6"
        style={isDesktop ? { willChange: 'transform, opacity' } : undefined}
        animate={
          isDesktop
            ? {
                scale: [1, 1.06, 0.98, 1.04, 1],
                opacity: [0.7, 0.95, 0.75, 0.9, 0.7],
              }
            : undefined
        }
        transition={
          isDesktop
            ? {
                duration: 9,
                repeat: Infinity,
                ease: 'easeInOut',
                times: [0, 0.28, 0.52, 0.78, 1],
              }
            : undefined
        }
      />
      <Floating>{card}</Floating>
    </motion.div>
  );
}
