import type { BlockCategory } from './categories';
import { PLAN_DAY_END } from './date';

/**
 * Turns a plan written the way people write it in their notes into time blocks:
 *
 *   10:30 - 12:30 Wake up, skincare, eat, clean the room
 *   12:30 - 2:30 ERK
 *   3:30 :5:00 Prepare for work
 *   11:30 - 12:30 Productive time      ← runs past midnight
 *   12:30 - 2:00 Sleep                 ← after midnight
 *
 * Times can be 24-hour (14:30), 12-hour with am/pm (2:30pm), or 12-hour without am/pm — then the
 * day is read in order: each start is the earliest matching time that isn't before the previous start.
 * Minutes after midnight continue past 1440 (00:30 the next morning = 1470), up to 06:00.
 */

export interface ParsedBlock {
  start: number;
  end: number;
  title: string;
  category: BlockCategory;
}

// h, optional :mm, optional am/pm (written out, so "Prepare" isn't read as "p.m.")
const T = String.raw`(\d{1,2})(?:[:.](\d{2}))?(?:\s*([ap])\.?m\.?(?![a-z]))?`;
const LINE = new RegExp(String.raw`^\s*(?:[-•*·]\s*)?` + T + String.raw`\s*(?:-+|–|—|to|until|:)?\s*` + `(?:${T})?` + String.raw`\s*[-–—:,.)]*\s*(.*)$`, 'i');

interface Tok {
  h: number;
  m: number;
  ap: 'a' | 'p' | null;
}

const tok = (h?: string, m?: string, ap?: string): Tok | null => {
  if (h === undefined) return null;
  const hh = Number(h);
  const mm = m ? Number(m) : 0;
  if (hh > 24 || mm > 59) return null;
  return { h: hh, m: mm, ap: ap ? (ap.toLowerCase() as 'a' | 'p') : null };
};

/** Candidate minute values for a time token, ascending. */
function candidates(t: Tok): number[] {
  const out: number[] = [];
  if (t.ap || t.h === 0 || t.h > 12) {
    // Unambiguous: one time of day, repeated every 24h.
    const base = t.ap ? ((t.h % 12) + (t.ap === 'p' ? 12 : 0)) * 60 + t.m : (t.h % 24) * 60 + t.m;
    for (let k = 0; k < 2; k++) out.push(base + k * 1440);
  } else {
    // 1–12 without am/pm: could be either half of the day.
    const base = (t.h % 12) * 60 + t.m;
    for (let k = 0; k < 4; k++) out.push(base + k * 720);
  }
  return out;
}

/** The first time of the day, with nothing before it: 5–11 → morning, 12 → noon, 1–4 → afternoon. */
function firstTime(t: Tok): number {
  if (t.ap || t.h === 0 || t.h > 12) return candidates(t)[0];
  if (t.h >= 5 && t.h <= 11) return t.h * 60 + t.m;
  if (t.h === 12) return 720 + t.m;
  return (t.h + 12) * 60 + t.m;
}

const pick = (t: Tok, notBefore: number) => candidates(t).find((v) => v >= notBefore) ?? null;

const KINDS: [BlockCategory, RegExp][] = [
  ['train', /\b(gym|train|training|workout|lift|run|running|box|boxing|bjj|mma|yoga|sport|football|soccer|basketball|swim|cardio|stretch)/i],
  ['learn', /\b(read|reading|study|learn|course|class|lecture|book|homework|exam|practice|language|duolingo)/i],
  ['social', /\b(call|family|friend|friends|date|party|meet|meeting with|hang|mom|dad|brother|sister)/i],
  ['recover', /\b(sleep|nap|rest|shower|skincare|skin care|eat|lunch|dinner|breakfast|meal|wake|relax|meditat|walk|chill|bath)/i],
];

export function guessCategory(title: string): BlockCategory {
  for (const [k, re] of KINDS) if (re.test(title)) return k;
  return 'deep';
}

export function parsePlanLine(line: string, notBefore: number | null): ParsedBlock | null {
  const m = line.match(LINE);
  if (!m) return null;
  const a = tok(m[1], m[2], m[3]);
  const b = tok(m[4], m[5], m[6]);
  if (!a) return null;
  const start = notBefore === null ? firstTime(a) : pick(a, notBefore);
  if (start === null || start >= PLAN_DAY_END) return null;
  let end = b ? pick(b, start + 5) : null;
  if (end === null) end = start + 60;
  end = Math.min(end, PLAN_DAY_END);
  if (end - start > 16 * 60) end = start + 60; // almost certainly a misread
  const title = (m[7] ?? '').replace(/^[\s\-–—:,.]+/, '').trim();
  return { start, end, title, category: guessCategory(title) };
}

/** Parse a whole pasted plan. Lines without a leading time are skipped (returned in `skipped`). */
export function parsePlan(text: string): { blocks: ParsedBlock[]; skipped: string[] } {
  const blocks: ParsedBlock[] = [];
  const skipped: string[] = [];
  let prev: number | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const p = parsePlanLine(line, prev);
    if (!p) {
      skipped.push(line);
      continue;
    }
    blocks.push(p);
    prev = p.start;
  }
  return { blocks, skipped };
}
