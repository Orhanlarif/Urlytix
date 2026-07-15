'use client';

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/language-provider';
import type { Locale } from '@/i18n/types';
import {
  addDays,
  daysInMonth,
  pad2,
  parseDateTimeLocal,
  sameDay,
  startOfDay,
  toDateTimeLocalValue,
} from '@/lib/datetime-local';
import { cn } from '@/lib/utils';

type DateTimePickerProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  hint?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
  /** Disallow dates before this instant (local). Defaults to start of today. */
  min?: Date;
  placeholder?: string;
};

function intlLocale(locale: Locale) {
  return locale === 'en' ? 'en-US' : 'tr-TR';
}

function weekdayLabels(locale: Locale) {
  const fmt = new Intl.DateTimeFormat(intlLocale(locale), { weekday: 'short' });
  // Monday-first calendar
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(Date.UTC(2024, 0, 1 + index)); // Mon Jan 1 2024
    return fmt.format(day);
  });
}

function monthTitle(date: Date, locale: Locale) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function displayValue(value: string, locale: Locale) {
  const date = parseDateTimeLocal(value);
  if (!date) return '';
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function buildValue(day: Date, hours: number, minutes: number) {
  return toDateTimeLocalValue(
    new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      hours,
      minutes,
      0,
      0,
    ),
  );
}

export function DateTimePicker({
  value,
  onChange,
  label,
  hint,
  id,
  name,
  disabled = false,
  min,
  placeholder,
}: DateTimePickerProps) {
  const { t, locale } = useLanguage();
  const generatedId = useId();
  const fieldId = id ?? name ?? generatedId;
  const hintId = `${fieldId}-hint`;
  const panelId = `${fieldId}-panel`;

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    mobile: boolean;
  } | null>(null);

  const minDate = useMemo(() => startOfDay(min ?? new Date()), [min, open]);

  const selected = parseDateTimeLocal(value);
  const [viewMonth, setViewMonth] = useState(() => {
    const base = selected ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [draftDay, setDraftDay] = useState<Date | null>(
    selected ? startOfDay(selected) : null,
  );
  const [hours, setHours] = useState(selected?.getHours() ?? 23);
  const [minutes, setMinutes] = useState(selected?.getMinutes() ?? 59);

  const hourOptions = useMemo(
    () => Array.from({ length: 24 }, (_, i) => i),
    [],
  );
  const minuteOptions = useMemo(() => {
    const base = [0, 15, 30, 45, 59];
    if (!base.includes(minutes)) {
      return [...base, minutes].sort((a, b) => a - b);
    }
    return base;
  }, [minutes]);

  const weeks = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const total = daysInMonth(year, month);
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i += 1) cells.push(null);
    for (let day = 1; day <= total; day += 1) {
      cells.push(new Date(year, month, day));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    const rows: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7));
    }
    return rows;
  }, [viewMonth]);

  const weekdays = useMemo(() => weekdayLabels(locale), [locale]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const current = parseDateTimeLocal(value);
    const next = current ?? new Date();
    setViewMonth(new Date(next.getFullYear(), next.getMonth(), 1));
    setDraftDay(current ? startOfDay(current) : null);
    setHours(current?.getHours() ?? 23);
    setMinutes(current?.getMinutes() ?? 59);
  }, [open, value]);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;

    const update = () => {
      const rect = triggerRef.current!.getBoundingClientRect();
      const mobile = window.innerWidth < 640;
      if (mobile) {
        setCoords({
          top: 0,
          left: 0,
          width: window.innerWidth,
          mobile: true,
        });
        return;
      }
      const panelWidth = Math.min(360, window.innerWidth - 24);
      const left = Math.min(
        Math.max(12, rect.left),
        window.innerWidth - panelWidth - 12,
      );
      const estimatedHeight = 420;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < estimatedHeight && rect.top > spaceBelow;
      const top = openUp
        ? Math.max(12, rect.top - estimatedHeight - 8)
        : rect.bottom + 8;
      setCoords({ top, left, width: panelWidth, mobile: false });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
      }
    };
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        panelRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [open]);

  function commit(day: Date, nextHours = hours, nextMinutes = minutes) {
    onChange(buildValue(day, nextHours, nextMinutes));
  }

  function applyPreset(days: number) {
    const target = addDays(new Date(), days);
    target.setHours(23, 59, 0, 0);
    onChange(toDateTimeLocalValue(target));
    setOpen(false);
  }

  function clearValue() {
    onChange('');
    setOpen(false);
  }

  function applyDraft() {
    if (!draftDay) return;
    commit(draftDay, hours, minutes);
    setOpen(false);
  }

  const panel =
    open && mounted && coords
      ? createPortal(
          <>
            {coords.mobile && (
              <div
                className="animate-fade-in fixed inset-0 z-[60] bg-black/50 backdrop-blur-[2px]"
                aria-hidden
              />
            )}
            <div
              ref={panelRef}
              id={panelId}
              role="dialog"
              aria-modal={coords.mobile || undefined}
              aria-label={label ?? t.dateTimePicker.placeholder}
              className={cn(
                'z-[61] overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-strong)] bg-[var(--surface-raised)] p-4 shadow-[var(--shadow-lg)] outline-none',
                coords.mobile
                  ? 'fixed inset-x-3 bottom-[max(5.5rem,env(safe-area-inset-bottom))] animate-fade-in'
                  : 'fixed',
              )}
              style={
                coords.mobile
                  ? undefined
                  : { top: coords.top, left: coords.left, width: coords.width }
              }
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {label ?? t.dateTimePicker.placeholder}
                </p>
                {coords.mobile && (
                  <button
                    type="button"
                    aria-label={t.common.close}
                    onClick={() => setOpen(false)}
                    className="grid h-9 w-9 place-items-center rounded-lg text-[var(--muted-foreground)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset(1)}
                  className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
                >
                  {t.dateTimePicker.preset1d}
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(7)}
                  className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
                >
                  {t.dateTimePicker.preset7d}
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(30)}
                  className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
                >
                  {t.dateTimePicker.preset30d}
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <button
                  type="button"
                  aria-label={t.dateTimePicker.previousMonth}
                  onClick={() =>
                    setViewMonth(
                      new Date(
                        viewMonth.getFullYear(),
                        viewMonth.getMonth() - 1,
                        1,
                      ),
                    )
                  }
                  className="grid h-9 w-9 place-items-center rounded-lg text-[var(--muted-foreground)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <p className="text-sm font-semibold capitalize text-[var(--foreground)]">
                  {monthTitle(viewMonth, locale)}
                </p>
                <button
                  type="button"
                  aria-label={t.dateTimePicker.nextMonth}
                  onClick={() =>
                    setViewMonth(
                      new Date(
                        viewMonth.getFullYear(),
                        viewMonth.getMonth() + 1,
                        1,
                      ),
                    )
                  }
                  className="grid h-9 w-9 place-items-center rounded-lg text-[var(--muted-foreground)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 grid grid-cols-7 gap-1">
                {weekdays.map((day) => (
                  <div
                    key={day}
                    className="py-1 text-center text-[11px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]"
                  >
                    {day}
                  </div>
                ))}
                {weeks.flatMap((row, rowIndex) =>
                  row.map((day, colIndex) => {
                    if (!day) {
                      return (
                        <div
                          key={`empty-${rowIndex}-${colIndex}`}
                          className="h-9"
                        />
                      );
                    }
                    const disabledDay = day < minDate;
                    const isSelected = draftDay ? sameDay(day, draftDay) : false;
                    const isToday = sameDay(day, new Date());
                    return (
                      <button
                        key={day.toISOString()}
                        type="button"
                        disabled={disabledDay}
                        onClick={() => {
                          setDraftDay(day);
                          if (!selected) {
                            setHours(23);
                            setMinutes(59);
                          }
                        }}
                        className={cn(
                          'h-9 rounded-lg text-sm font-medium transition',
                          disabledDay &&
                            'cursor-not-allowed text-[var(--muted-foreground)]/40',
                          !disabledDay &&
                            !isSelected &&
                            'text-[var(--foreground)] hover:bg-[var(--surface-hover)]',
                          isSelected &&
                            'bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[var(--shadow-glow)]',
                          !isSelected &&
                            isToday &&
                            'ring-1 ring-inset ring-[var(--accent-border)]',
                        )}
                      >
                        {day.getDate()}
                      </button>
                    );
                  }),
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="min-w-0">
                  <span className="mb-1.5 block text-xs font-medium text-[var(--muted-foreground)]">
                    {t.dateTimePicker.hour}
                  </span>
                  <select
                    value={hours}
                    onChange={(event) => setHours(Number(event.target.value))}
                    className="min-h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-inset focus:ring-[var(--accent)]/30"
                  >
                    {hourOptions.map((hour) => (
                      <option key={hour} value={hour}>
                        {pad2(hour)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="min-w-0">
                  <span className="mb-1.5 block text-xs font-medium text-[var(--muted-foreground)]">
                    {t.dateTimePicker.minute}
                  </span>
                  <select
                    value={minutes}
                    onChange={(event) => setMinutes(Number(event.target.value))}
                    className="min-h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-inset focus:ring-[var(--accent)]/30"
                  >
                    {minuteOptions.map((minute) => (
                      <option key={minute} value={minute}>
                        {pad2(minute)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearValue}
                >
                  {t.dateTimePicker.clear}
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    fullWidth
                    className="sm:w-auto"
                    onClick={() => setOpen(false)}
                  >
                    {t.common.cancel}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    fullWidth
                    className="sm:w-auto"
                    disabled={!draftDay}
                    onClick={applyDraft}
                  >
                    {t.dateTimePicker.apply}
                  </Button>
                </div>
              </div>
            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <div>
      {label && (
        <label
          htmlFor={fieldId}
          className="mb-2 block text-sm font-medium text-[var(--muted)]"
        >
          {label}
        </label>
      )}

      <button
        ref={triggerRef}
        id={fieldId}
        type="button"
        name={name}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-describedby={hint ? hintId : undefined}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'flex min-h-[var(--control-height)] w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-left text-sm outline-none transition',
          'hover:border-[var(--border-strong)] focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]/30',
          'disabled:cursor-not-allowed disabled:bg-[var(--surface-raised)] disabled:text-[var(--muted-foreground)]',
          open && 'border-[var(--accent)] ring-2 ring-inset ring-[var(--accent)]/30',
        )}
      >
        <Calendar className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
        <span
          className={cn(
            'min-w-0 flex-1 truncate',
            value
              ? 'font-medium text-[var(--foreground)]'
              : 'text-[var(--muted-foreground)]/70',
          )}
        >
          {value
            ? displayValue(value, locale)
            : (placeholder ?? t.dateTimePicker.placeholder)}
        </span>
        {value && !disabled && (
          <span
            role="button"
            tabIndex={-1}
            aria-label={t.dateTimePicker.clear}
            onClick={(event) => {
              event.stopPropagation();
              onChange('');
            }}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[var(--muted-foreground)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
      </button>

      {hint && (
        <p id={hintId} className="mt-2 text-xs text-[var(--muted-foreground)]">
          {hint}
        </p>
      )}

      {panel}
    </div>
  );
}
