import { parseLocalDate, toDateKey } from './cyclePrediction';

const DAY_MS = 24 * 60 * 60 * 1000;
const diffDays = (later, earlier) => Math.round((later - earlier) / DAY_MS);

const MOOD_VALUES = { great: 5, good: 4, okay: 3, low: 2, bad: 1 };

const PHASES = ['Menstrual', 'Follicular', 'Ovulation', 'Luteal'];

/**
 * Determine which cycle day a given date falls on.
 * Day 1 = first day of the period that started the cycle containing this date.
 * Returns null if the date doesn't fall within any known cycle window.
 */
function getCycleDayForDate(dateKey, sortedCycles, avgCycleLength) {
  const date = parseLocalDate(dateKey);
  if (!date) return null;

  for (let i = sortedCycles.length - 1; i >= 0; i--) {
    const cycleStart = sortedCycles[i].start;
    const nextStart = i < sortedCycles.length - 1
      ? sortedCycles[i + 1].start
      : new Date(cycleStart.getTime() + avgCycleLength * DAY_MS);

    if (date >= cycleStart && date < nextStart) {
      return diffDays(date, cycleStart) + 1;
    }
  }
  return null;
}

/**
 * Determine the phase for a given cycle day.
 */
function getPhaseForDay(cycleDay, avgPeriodLength, avgCycleLength) {
  if (cycleDay <= avgPeriodLength) return 'Menstrual';
  const ovulationDay = Math.max(avgPeriodLength + 1, avgCycleLength - 15);
  const ovulationStart = ovulationDay - 5;
  const ovulationEnd = ovulationDay + 1;
  if (cycleDay < ovulationStart) return 'Follicular';
  if (cycleDay <= ovulationEnd) return 'Ovulation';
  return 'Luteal';
}

/**
 * Core correlation function.
 *
 * Takes mood entries (date-keyed object from MoodTrackingScreen) and
 * cycle history (array from /cycles endpoint), then maps each mood to
 * its cycle day and computes per-day averages across all cycles.
 *
 * Returns null if insufficient data (< 2 cycles or < 14 mood entries).
 */
export function computeMoodCycleCorrelation(moodEntries, cycles) {
  const sortedCycles = cycles
    .map((c) => ({ ...c, start: parseLocalDate(c.startDate), end: parseLocalDate(c.endDate) }))
    .filter((c) => c.start && c.end)
    .sort((a, b) => a.start - b.start);

  if (sortedCycles.length < 2) return null;

  const intervals = [];
  for (let i = 1; i < sortedCycles.length; i++) {
    const gap = diffDays(sortedCycles[i].start, sortedCycles[i - 1].start);
    if (gap >= 15 && gap <= 60) intervals.push(gap);
  }
  const avgCycleLength = intervals.length
    ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length)
    : 28;

  const durations = sortedCycles
    .map((c) => diffDays(c.end, c.start) + 1)
    .filter((d) => d >= 1 && d <= 14);
  const avgPeriodLength = durations.length
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 5;

  const moodDates = Object.keys(moodEntries).filter((key) => {
    const entry = moodEntries[key];
    return entry && entry.mood && MOOD_VALUES[entry.mood.toLowerCase()] !== undefined;
  });

  if (moodDates.length < 14) return null;

  const dayBuckets = {};

  for (const dateKey of moodDates) {
    const cycleDay = getCycleDayForDate(dateKey, sortedCycles, avgCycleLength);
    if (cycleDay === null || cycleDay < 1 || cycleDay > avgCycleLength) continue;

    const moodValue = MOOD_VALUES[moodEntries[dateKey].mood.toLowerCase()];
    if (!dayBuckets[cycleDay]) {
      dayBuckets[cycleDay] = { total: 0, count: 0 };
    }
    dayBuckets[cycleDay].total += moodValue;
    dayBuckets[cycleDay].count += 1;
  }

  const mappedCount = Object.values(dayBuckets).reduce((sum, b) => sum + b.count, 0);
  if (mappedCount < 10) return null;

  const dayAverages = [];
  for (let day = 1; day <= avgCycleLength; day++) {
    const bucket = dayBuckets[day];
    dayAverages.push({
      day,
      average: bucket ? Math.round((bucket.total / bucket.count) * 10) / 10 : null,
      count: bucket ? bucket.count : 0,
      phase: getPhaseForDay(day, avgPeriodLength, avgCycleLength),
    });
  }

  const phaseBands = computePhaseBands(avgPeriodLength, avgCycleLength);
  const patterns = detectPatterns(dayAverages, avgPeriodLength, avgCycleLength);

  return {
    dayAverages,
    avgCycleLength,
    avgPeriodLength,
    phaseBands,
    patterns,
    totalMoodsMapped: mappedCount,
    cyclesUsed: sortedCycles.length,
  };
}

/**
 * Compute phase band boundaries for chart overlay.
 */
function computePhaseBands(avgPeriodLength, avgCycleLength) {
  const ovulationDay = Math.max(avgPeriodLength + 1, avgCycleLength - 15);
  return [
    { phase: 'Menstrual', start: 1, end: avgPeriodLength },
    { phase: 'Follicular', start: avgPeriodLength + 1, end: ovulationDay - 6 },
    { phase: 'Ovulation', start: ovulationDay - 5, end: ovulationDay + 1 },
    { phase: 'Luteal', start: ovulationDay + 2, end: avgCycleLength },
  ];
}

/**
 * Detect significant mood patterns (dips and peaks).
 * A pattern is "significant" if a stretch of 3+ consecutive days
 * averages notably below or above the overall mean.
 */
function detectPatterns(dayAverages, avgPeriodLength, avgCycleLength) {
  const withData = dayAverages.filter((d) => d.average !== null);
  if (withData.length < 5) return [];

  const overallMean = withData.reduce((sum, d) => sum + d.average, 0) / withData.length;
  const threshold = 0.6;
  const patterns = [];

  let streakStart = null;
  let streakType = null;

  for (let i = 0; i < dayAverages.length; i++) {
    const entry = dayAverages[i];
    if (entry.average === null) {
      if (streakStart !== null && i - streakStart >= 3) {
        patterns.push(buildPattern(dayAverages, streakStart, i - 1, streakType, overallMean, avgPeriodLength, avgCycleLength));
      }
      streakStart = null;
      streakType = null;
      continue;
    }

    const diff = entry.average - overallMean;
    const type = diff < -threshold ? 'dip' : diff > threshold ? 'peak' : null;

    if (type !== streakType) {
      if (streakStart !== null && i - streakStart >= 3) {
        patterns.push(buildPattern(dayAverages, streakStart, i - 1, streakType, overallMean, avgPeriodLength, avgCycleLength));
      }
      streakStart = type ? i : null;
      streakType = type;
    }
  }

  if (streakStart !== null && dayAverages.length - streakStart >= 3) {
    patterns.push(buildPattern(dayAverages, streakStart, dayAverages.length - 1, streakType, overallMean, avgPeriodLength, avgCycleLength));
  }

  return patterns.filter(Boolean).slice(0, 3);
}

function buildPattern(dayAverages, start, end, type, overallMean, avgPeriodLength, avgCycleLength) {
  if (!type) return null;
  const days = dayAverages.slice(start, end + 1).filter((d) => d.average !== null);
  if (days.length < 3) return null;

  const avg = days.reduce((sum, d) => sum + d.average, 0) / days.length;
  const phase = getPhaseForDay(Math.round((start + end) / 2) + 1, avgPeriodLength, avgCycleLength);

  return {
    type,
    startDay: start + 1,
    endDay: end + 1,
    averageMood: Math.round(avg * 10) / 10,
    phase,
    deviation: Math.round((avg - overallMean) * 10) / 10,
  };
}

/**
 * Generate a brief human-readable summary for a detected pattern.
 */
export function generatePatternSummary(pattern) {
  if (!pattern) return '';
  const dayRange = `days ${pattern.startDay}-${pattern.endDay}`;
  const phaseLabel = pattern.phase.toLowerCase();

  if (pattern.type === 'dip') {
    return `Your mood tends to dip on ${dayRange}, during ${phaseLabel} phase. This is common and often linked to hormonal shifts.`;
  }
  return `Your mood tends to peak on ${dayRange}, during ${phaseLabel} phase. Your body responds well to this part of the cycle.`;
}

export const PHASE_COLORS = {
  Menstrual: '#FFDFE5',
  Follicular: '#E6E2F8',
  Ovulation: '#FFE5D9',
  Luteal: '#E8F5E9',
};
