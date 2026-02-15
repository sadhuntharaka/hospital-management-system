export type WeekDay = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface SessionTemplate {
  start: string;
  end: string;
  location?: string;
  note?: string;
}

export interface DayTemplate {
  enabled: boolean;
  sessions: SessionTemplate[];
}

export interface ScheduleTemplate {
  slotMinutes: number;
  timezone: 'Asia/Colombo';
  days: Record<WeekDay, DayTemplate>;
}

const SLOT_OPTIONS = [5, 10, 15, 20, 30, 60];

const toMinutes = (value: string) => {
  const [h, m] = value.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return NaN;
  return h * 60 + m;
};

export const normalizeTime = (value: string) => {
  const [h = '00', m = '00'] = value.split(':');
  const hh = h.padStart(2, '0').slice(0, 2);
  const mm = m.padStart(2, '0').slice(0, 2);
  return `${hh}:${mm}`;
};

export const validateTemplate = (template: ScheduleTemplate): { ok: boolean; message?: string } => {
  if (!SLOT_OPTIONS.includes(template.slotMinutes)) {
    return { ok: false, message: 'Slot minutes must be one of 5, 10, 15, 20, 30, 60.' };
  }

  for (const [day, entry] of Object.entries(template.days) as [WeekDay, DayTemplate][]) {
    if (!entry.enabled) continue;

    const sorted = [...entry.sessions].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));

    for (let i = 0; i < sorted.length; i += 1) {
      const session = sorted[i];
      const start = toMinutes(session.start);
      const end = toMinutes(session.end);

      if (Number.isNaN(start) || Number.isNaN(end)) {
        return { ok: false, message: `${day.toUpperCase()}: invalid session time format.` };
      }

      if (start >= end) {
        return { ok: false, message: `${day.toUpperCase()}: session start must be before end.` };
      }

      if (end - start < template.slotMinutes) {
        return {
          ok: false,
          message: `${day.toUpperCase()}: session length must be at least ${template.slotMinutes} minutes.`,
        };
      }

      const next = sorted[i + 1];
      if (next && toMinutes(next.start) < end) {
        return { ok: false, message: `${day.toUpperCase()}: sessions overlap.` };
      }
    }
  }

  return { ok: true };
};
