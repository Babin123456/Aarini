/**
 * Anomaly detection service for health data.
 * Scans logged cycles, moods, medications, and symptoms for concerning patterns.
 * Returns in-app alerts (never push notifications).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const DISMISSED_KEY = '@aarini:dismissed_alerts';

const RULES = {
  latePeriod: { daysOverdue: 7 },
  moodStreak: { consecutiveDays: 5, moods: ['bad', 'low', 'terrible', 'awful'] },
  medicationGap: { consecutiveMissed: 3 },
  symptomSeverity: { consecutiveDays: 3, severity: 'high' },
  cycleIrregularity: { deviationDays: 10 },
};

async function getDismissed() {
  const raw = await AsyncStorage.getItem(DISMISSED_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function dismissAlert(alertId) {
  const dismissed = await getDismissed();
  if (!dismissed.includes(alertId)) {
    dismissed.push(alertId);
    await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed));
  }
}

function checkLatePeriod(cycles, prediction) {
  if (!prediction?.nextPeriod) return null;
  const predicted = new Date(prediction.nextPeriod);
  const today = new Date();
  const daysLate = Math.floor((today - predicted) / (1000 * 60 * 60 * 24));
  if (daysLate >= RULES.latePeriod.daysOverdue) {
    return {
      id: `late_period_${predicted.toISOString().slice(0, 10)}`,
      type: 'latePeriod',
      severity: 'moderate',
      daysLate,
    };
  }
  return null;
}

function checkMoodStreak(moodEntries) {
  if (!moodEntries || moodEntries.length < RULES.moodStreak.consecutiveDays) return null;
  const sorted = [...moodEntries].sort((a, b) => new Date(b.date) - new Date(a.date));
  let streak = 0;
  for (const entry of sorted) {
    const moodVal = (entry.mood || entry.value || '').toLowerCase();
    if (RULES.moodStreak.moods.includes(moodVal)) {
      streak++;
    } else {
      break;
    }
  }
  if (streak >= RULES.moodStreak.consecutiveDays) {
    return {
      id: `mood_streak_${sorted[0].date}`,
      type: 'moodStreak',
      severity: 'moderate',
      consecutiveDays: streak,
    };
  }
  return null;
}

function checkMedicationGap(medications) {
  if (!medications || medications.length === 0) return null;
  const alerts = [];
  for (const med of medications) {
    const history = med.history || [];
    let missed = 0;
    const sorted = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
    for (const entry of sorted) {
      if (entry.status === 'missed' || entry.status === 'skipped') {
        missed++;
      } else {
        break;
      }
    }
    if (missed >= RULES.medicationGap.consecutiveMissed) {
      alerts.push({
        id: `med_gap_${med.name}_${sorted[0]?.date}`,
        type: 'medicationGap',
        severity: 'moderate',
        medicationName: med.name,
        consecutiveMissed: missed,
      });
    }
  }
  return alerts.length > 0 ? alerts[0] : null;
}

function checkSymptomSeverity(symptoms) {
  if (!symptoms || symptoms.length === 0) return null;
  const sorted = [...symptoms].sort((a, b) => new Date(b.date) - new Date(a.date));
  const byType = {};
  for (const s of sorted) {
    const key = s.symptom || s.type || 'unknown';
    if (!byType[key]) byType[key] = [];
    byType[key].push(s);
  }
  for (const [symptomName, entries] of Object.entries(byType)) {
    let streak = 0;
    for (const entry of entries) {
      const sev = (entry.severity || '').toLowerCase();
      if (sev === 'high' || sev === 'severe') {
        streak++;
      } else {
        break;
      }
    }
    if (streak >= RULES.symptomSeverity.consecutiveDays) {
      return {
        id: `symptom_${symptomName}_${entries[0].date}`,
        type: 'symptomSeverity',
        severity: 'high',
        symptomName,
        consecutiveDays: streak,
      };
    }
  }
  return null;
}

function checkCycleIrregularity(cycles) {
  if (!cycles || cycles.length < 3) return null;
  const lengths = cycles
    .filter(c => c.startDate && c.endDate)
    .map(c => {
      const start = new Date(c.startDate);
      const end = new Date(c.endDate);
      return Math.round((end - start) / (1000 * 60 * 60 * 24));
    })
    .filter(l => l > 0 && l < 100);
  if (lengths.length < 3) return null;
  const avg = lengths.slice(0, -1).reduce((a, b) => a + b, 0) / (lengths.length - 1);
  const latest = lengths[lengths.length - 1];
  const deviation = Math.abs(latest - avg);
  if (deviation >= RULES.cycleIrregularity.deviationDays) {
    return {
      id: `irregularity_${cycles[cycles.length - 1].startDate}`,
      type: 'cycleIrregularity',
      severity: 'moderate',
      deviation: Math.round(deviation),
      averageLength: Math.round(avg),
      latestLength: latest,
    };
  }
  return null;
}

export async function detectAnomalies({ cycles, prediction, moodEntries, medications, symptoms }) {
  const dismissed = await getDismissed();
  const alerts = [];

  const latePeriod = checkLatePeriod(cycles, prediction);
  if (latePeriod) alerts.push(latePeriod);

  const moodAlert = checkMoodStreak(moodEntries);
  if (moodAlert) alerts.push(moodAlert);

  const medAlert = checkMedicationGap(medications);
  if (medAlert) alerts.push(medAlert);

  const symptomAlert = checkSymptomSeverity(symptoms);
  if (symptomAlert) alerts.push(symptomAlert);

  const irregularity = checkCycleIrregularity(cycles);
  if (irregularity) alerts.push(irregularity);

  return alerts.filter(a => !dismissed.includes(a.id));
}

export { dismissAlert };
