import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, SafeAreaView, ScrollView, StyleSheet,
  Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Bell, CalendarDays, ChevronLeft, ChevronRight, Droplets, LogOut, Plus, Sparkles,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  dateInRange, parseLocalDate, predictCycleLocally, toDateKey,
} from '../utils/cyclePrediction';
import {
  cancelPredictionNotifications, schedulePredictionNotifications,
} from '../services/predictionNotifications';

const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.117.86.186:5000';
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const PHASE_COPY = {
  Menstrual: 'Your period is estimated to be active. Rest and hydration may feel especially helpful.',
  Follicular: 'Estrogen typically rises as your body prepares for ovulation.',
  Ovulation: 'You are in your estimated ovulation window. Predictions are not contraception.',
  Luteal: 'Progesterone typically rises as your body approaches the next period.',
};

const buildMonth = (cursor) => {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const count = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  return [
    ...Array(first.getDay()).fill(null),
    ...Array.from({ length: count }, (_, index) => new Date(cursor.getFullYear(), cursor.getMonth(), index + 1)),
  ];
};

export const CycleTrackerScreen = () => {
  const { user, userToken, logout } = useAuth();
  const { theme } = useTheme();
  const { colors, typography, spacing } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const storageKey = `cycles:${user?.uid || 'local'}`;

  const [cycles, setCycles] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [month, setMonth] = useState(new Date());
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${userToken}`,
    'X-User-Id': user?.uid || 'mock_user_123',
  }), [user?.uid, userToken]);

  const updateState = useCallback(async (nextCycles, serverPrediction) => {
    const sorted = [...nextCycles].sort((a, b) => b.startDate.localeCompare(a.startDate));
    setCycles(sorted);
    setPrediction(serverPrediction || predictCycleLocally(sorted, user?.cycleLength || 28));
    await AsyncStorage.setItem(storageKey, JSON.stringify(sorted));
  }, [storageKey, user?.cycleLength]);

  const loadCycles = useCallback(async () => {
    setLoading(true);
    const local = JSON.parse((await AsyncStorage.getItem(storageKey)) || '[]');
    try {
      const response = await fetch(`${BACKEND_URL}/cycles`, { headers });
      if (!response.ok) throw new Error('Cycle service unavailable');
      const data = await response.json();
      await updateState(data.cycles?.length ? data.cycles : local, data.prediction);
    } catch {
      await updateState(local);
    } finally {
      setLoading(false);
    }
  }, [headers, storageKey, updateState]);

  useEffect(() => {
    loadCycles();
    AsyncStorage.getItem('predictionNotificationsEnabled')
      .then((value) => setNotificationsEnabled(value === 'true'));
  }, [loadCycles]);

  useEffect(() => {
    if (notificationsEnabled && prediction?.nextPeriodStart) {
      schedulePredictionNotifications(prediction);
    }
  }, [notificationsEnabled, prediction]);

  const saveCycle = async () => {
    const start = parseLocalDate(startDate);
    const end = parseLocalDate(endDate);
    if (!start || !end) return Alert.alert('Check the dates', 'Use YYYY-MM-DD for both dates.');
    if (end < start) return Alert.alert('Check the dates', 'The end date must be on or after the start date.');
    if ((end - start) / 86400000 > 13) return Alert.alert('Check the dates', 'A period entry can be at most 14 days.');
    if (start > new Date()) return Alert.alert('Check the dates', 'A period cannot begin in the future.');

    setSaving(true);
    const entry = { id: `local_${Date.now()}`, startDate, endDate };
    try {
      const response = await fetch(`${BACKEND_URL}/add-cycle`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...entry, uid: user?.uid }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Could not save this period');
      }
      const data = await response.json();
      await updateState([...cycles, data.cycle || entry], data.prediction);
    } catch {
      await updateState([...cycles, entry]);
    } finally {
      setSaving(false);
      setModalVisible(false);
      setStartDate('');
      setEndDate('');
    }
  };

  const toggleNotifications = async (enabled) => {
    setNotificationsEnabled(enabled);
    await AsyncStorage.setItem('predictionNotificationsEnabled', String(enabled));
    if (enabled) {
      const scheduled = await schedulePredictionNotifications(prediction);
      if (!scheduled) Alert.alert('Notifications unavailable', 'Enable notification permission in device settings.');
    } else {
      await cancelPredictionNotifications();
    }
  };

  const calendarDays = useMemo(() => buildMonth(month), [month]);
  const phase = prediction?.currentPhase;
  const dayStyle = (date) => {
    const key = toDateKey(date);
    if (cycles.some((cycle) => dateInRange(key, cycle.startDate, cycle.endDate))) return styles.loggedDay;
    if (dateInRange(key, prediction?.nextPeriodStart, prediction?.nextPeriodEnd)) return styles.predictedDay;
    if (dateInRange(key, prediction?.ovulationWindowStart, prediction?.ovulationWindowEnd)) return styles.ovulationDay;
    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>MY CYCLE</Text>
            <Text style={typography.h1}>Hello, {user?.name?.split(' ')[0] || 'there'}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.iconButton} accessibilityLabel="Sign out">
            <LogOut size={20} color={colors.textMedium} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primaryDark} />
            <Text style={styles.muted}>Learning your cycle rhythm…</Text>
          </View>
        ) : !prediction?.hasHistory ? (
          <View style={styles.heroCard}>
            <Droplets size={30} color={colors.secondaryDark} />
            <Text style={[typography.h2, styles.center]}>Start with your latest period</Text>
            <Text style={[styles.muted, styles.center]}>Log start and end dates to unlock phase and period predictions.</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setModalVisible(true)}>
              <Plus size={18} color={colors.white} />
              <Text style={styles.primaryButtonText}>Log period</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.phaseCard}>
              <View style={styles.phaseTop}>
                <View style={styles.phaseIcon}><Sparkles size={22} color={colors.primaryDark} /></View>
                <View style={styles.flex}>
                  <Text style={styles.label}>CURRENT PHASE · DAY {prediction.cycleDay}</Text>
                  <Text style={[typography.h1, styles.phaseTitle]}>{phase}</Text>
                </View>
              </View>
              <Text style={styles.phaseCopy}>{PHASE_COPY[phase]}</Text>
            </View>

            <View style={styles.metrics}>
              <View style={styles.metricCard}>
                <Text style={styles.label}>NEXT PERIOD</Text>
                <Text style={styles.metricValue}>{prediction.nextPeriodStart}</Text>
                <Text style={styles.muted}>{prediction.averageCycleLength}-day average · {prediction.confidence} confidence</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.label}>OVULATION WINDOW</Text>
                <Text style={styles.metricValue}>{prediction.ovulationWindowStart}</Text>
                <Text style={styles.muted}>through {prediction.ovulationWindowEnd}</Text>
              </View>
            </View>
          </>
        )}

        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitle}>
            <CalendarDays size={20} color={colors.primaryDark} />
            <Text style={typography.h2}>Cycle calendar</Text>
          </View>
          <TouchableOpacity style={styles.smallButton} onPress={() => setModalVisible(true)}>
            <Plus size={16} color={colors.primaryDark} /><Text style={styles.smallButtonText}>Log</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
              <ChevronLeft color={colors.textDark} />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</Text>
            <TouchableOpacity onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
              <ChevronRight color={colors.textDark} />
            </TouchableOpacity>
          </View>
          <View style={styles.weekRow}>
            {WEEKDAYS.map((day, index) => <Text key={`${day}-${index}`} style={styles.weekday}>{day}</Text>)}
          </View>
          <View style={styles.dayGrid}>
            {calendarDays.map((date, index) => (
              <View key={date ? toDateKey(date) : `blank-${index}`} style={styles.dayCell}>
                {date ? (
                  <View style={[styles.dayCircle, dayStyle(date)]}>
                    <Text style={styles.dayText}>{date.getDate()}</Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
          <View style={styles.legend}>
            <Text style={styles.loggedLegend}>● Logged</Text>
            <Text style={styles.predictedLegend}>● Predicted</Text>
            <Text style={styles.ovulationLegend}>● Ovulation</Text>
          </View>
        </View>

        <View style={styles.notificationCard}>
          <View style={styles.bell}><Bell size={19} color={colors.primaryDark} /></View>
          <View style={styles.flex}>
            <Text style={styles.notificationTitle}>Prediction reminders</Text>
            <Text style={styles.muted}>A heads-up before your predicted period and ovulation window.</Text>
          </View>
          <Switch value={notificationsEnabled} onValueChange={toggleNotifications} trackColor={{ true: colors.primaryDark }} />
        </View>
        <Text style={styles.disclaimer}>Estimates can vary and should not be used as birth control or medical diagnosis.</Text>
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={typography.h2}>Log your period</Text>
            <Text style={styles.modalHint}>Enter dates in YYYY-MM-DD format.</Text>
            <Text style={styles.inputLabel}>Start date</Text>
            <TextInput value={startDate} onChangeText={setStartDate} placeholder="2026-06-20" placeholderTextColor={colors.textLight} style={styles.input} />
            <Text style={styles.inputLabel}>End date</Text>
            <TextInput value={endDate} onChangeText={setEndDate} placeholder="2026-06-24" placeholderTextColor={colors.textLight} style={styles.input} />
            <TouchableOpacity style={styles.primaryButton} onPress={saveCycle} disabled={saving}>
              <Text style={styles.primaryButtonText}>{saving ? 'Saving…' : 'Save period'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const createStyles = ({ colors, typography, spacing, borderRadius, shadows }) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 80 },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  eyebrow: { ...typography.caption, color: colors.primaryDark, fontWeight: '800', letterSpacing: 1.4, marginBottom: 4 },
  iconButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.cardBackground, alignItems: 'center', justifyContent: 'center' },
  loading: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  heroCard: { backgroundColor: colors.cardBackground, padding: spacing.lg, borderRadius: borderRadius.lg, alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg, ...shadows.light },
  primaryButton: { minHeight: 50, borderRadius: borderRadius.md, paddingHorizontal: spacing.lg, backgroundColor: colors.primaryDark, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.md },
  primaryButtonText: { ...typography.buttonText, color: colors.white },
  phaseCard: { padding: spacing.lg, borderRadius: borderRadius.lg, backgroundColor: colors.primary, marginBottom: spacing.md },
  phaseTop: { flexDirection: 'row', alignItems: 'center' },
  phaseIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.cardBackground, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  label: { ...typography.caption, color: colors.textMedium, fontWeight: '800', letterSpacing: 0.6 },
  phaseTitle: { color: colors.textDark, marginTop: 2 },
  phaseCopy: { ...typography.bodyMedium, color: colors.textMedium, marginTop: spacing.md },
  metrics: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  metricCard: { flex: 1, padding: spacing.md, borderRadius: borderRadius.md, backgroundColor: colors.cardBackground, ...shadows.light },
  metricValue: { ...typography.h3, fontSize: 16, marginVertical: 6 },
  muted: { ...typography.bodySmall, color: colors.textMedium },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  smallButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.primary, borderRadius: borderRadius.round },
  smallButtonText: { ...typography.bodySmall, color: colors.primaryDark, fontWeight: '800' },
  calendarCard: { backgroundColor: colors.cardBackground, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md, ...shadows.light },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  monthTitle: { ...typography.h3 },
  weekRow: { flexDirection: 'row' },
  weekday: { width: '14.285%', textAlign: 'center', ...typography.caption, color: colors.textLight, paddingBottom: spacing.sm },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.285%', height: 42, alignItems: 'center', justifyContent: 'center' },
  dayCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dayText: { ...typography.bodySmall, color: colors.textDark, fontWeight: '600' },
  loggedDay: { backgroundColor: colors.primaryDark },
  predictedDay: { backgroundColor: colors.secondary },
  ovulationDay: { backgroundColor: colors.accent },
  legend: { flexDirection: 'row', gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md, marginTop: spacing.sm },
  loggedLegend: { ...typography.caption, color: colors.primaryDark },
  predictedLegend: { ...typography.caption, color: colors.secondaryDark },
  ovulationLegend: { ...typography.caption, color: colors.accentDark },
  notificationCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.cardBackground, borderRadius: borderRadius.md, padding: spacing.md },
  bell: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  notificationTitle: { ...typography.bodyMedium, color: colors.textDark, fontWeight: '800', marginBottom: 2 },
  disclaimer: { ...typography.caption, color: colors.textLight, textAlign: 'center', paddingHorizontal: spacing.md, marginTop: spacing.md },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.cardBackground, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: spacing.lg, paddingBottom: spacing.xxl },
  modalHint: { ...typography.bodySmall, color: colors.textMedium, marginTop: 4, marginBottom: spacing.lg },
  inputLabel: { ...typography.bodySmall, color: colors.textDark, fontWeight: '700', marginBottom: 6 },
  input: { minHeight: 50, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.inputBackground, color: colors.textDark, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, marginBottom: spacing.md },
  cancelButton: { alignItems: 'center', padding: spacing.md },
  cancelText: { ...typography.bodyMedium, color: colors.textMedium, fontWeight: '700' },
});
