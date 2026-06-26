import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { ArrowLeft, Download, FileText, Share, Trash2 } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { exportHealthData, shareExportFile } from '../services/exportService';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

export const SettingsScreen = ({ navigation }) => {
  const { userToken, user, logout } = useAuth();
  const { theme } = useTheme();
  const { colors, typography, spacing, borderRadius, shadows } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [exporting, setExporting] = useState(false);
  const [lastExport, setLastExport] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const result = await exportHealthData(userToken, user?.uid);
      setLastExport(result);
      const filePath = format === 'json' ? result.jsonPath : result.textPath;
      await shareExportFile(filePath);
    } catch (err) {
      Alert.alert('Export failed', err.message || 'Could not export your data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all health data (cycles, symptoms, moods). This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const headers = { 'Content-Type': 'application/json' };
              if (userToken) {
                headers['Authorization'] = `Bearer ${userToken}`;
              } else {
                headers['X-User-Id'] = user?.uid || 'mock_user_123';
              }
              const resp = await fetch(`${API_BASE}/delete-account`, {
                method: 'DELETE',
                headers,
                body: JSON.stringify({ confirm: true }),
              });
              const data = await resp.json();
              if (!resp.ok) {
                throw new Error(data.error || 'Deletion failed');
              }
              Alert.alert('Account Deleted', 'Your account and all data have been removed.', [
                { text: 'OK', onPress: () => logout() },
              ]);
            } catch (err) {
              Alert.alert('Error', err.message || 'Could not delete account. Please try again.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          {navigation?.canGoBack?.() ? (
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityLabel="Go back">
              <ArrowLeft size={22} color={colors.textDark} />
            </TouchableOpacity>
          ) : (
            <View style={styles.backButton} />
          )}
          <Text style={[typography.h2, styles.headerTitle]}>Settings</Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <Download size={20} color={colors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={typography.h3}>Export My Data</Text>
              <Text style={styles.cardSubtitle}>Download your health history for backup or sharing with a doctor</Text>
            </View>
          </View>

          <Text style={styles.infoText}>
            Your export includes all logged cycles, mood entries, and symptoms. Choose a format:
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.exportButton, styles.exportButtonPrimary]}
              onPress={() => handleExport('text')}
              disabled={exporting}
              accessibilityLabel="Export as readable text file"
            >
              {exporting ? (
                <ActivityIndicator size="small" color={colors.textOnPrimary} />
              ) : (
                <>
                  <FileText size={18} color={colors.textOnPrimary} />
                  <Text style={styles.exportButtonTextPrimary}>Readable Report</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.exportButton, styles.exportButtonSecondary]}
              onPress={() => handleExport('json')}
              disabled={exporting}
              accessibilityLabel="Export as JSON data file"
            >
              {exporting ? (
                <ActivityIndicator size="small" color={colors.primaryDark} />
              ) : (
                <>
                  <Share size={18} color={colors.primaryDark} />
                  <Text style={styles.exportButtonTextSecondary}>JSON Export</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {lastExport && (
            <Text style={styles.successText}>
              Last export: {lastExport.recordCount} records exported successfully.
            </Text>
          )}
        </View>

        <View style={[styles.card, styles.dangerCard]}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, styles.dangerIcon]}>
              <Trash2 size={20} color={colors.error || '#DC2626'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={typography.h3}>Delete Account</Text>
              <Text style={styles.cardSubtitle}>Permanently remove your account and all stored data</Text>
            </View>
          </View>

          <Text style={styles.infoText}>
            This will permanently delete your profile, cycle history, symptom logs, mood entries,
            and any other stored health data. This action cannot be undone.
          </Text>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteAccount}
            disabled={deleting}
            accessibilityLabel="Delete your account permanently"
          >
            {deleting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Trash2 size={18} color="#FFFFFF" />
                <Text style={styles.deleteButtonText}>Delete My Account</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = ({ colors, typography, spacing, borderRadius, shadows }) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
    backButton: { width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardBackground },
    headerTitle: { flex: 1, textAlign: 'center' },
    card: { backgroundColor: colors.cardBackground, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.lg, ...shadows.light },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
    cardIcon: { width: 44, height: 44, borderRadius: borderRadius.md, backgroundColor: colors.mutedBackground, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
    cardSubtitle: { ...typography.bodySmall, color: colors.textMedium, marginTop: 2 },
    infoText: { ...typography.bodyMedium, color: colors.textMedium, marginBottom: spacing.md },
    buttonRow: { flexDirection: 'row', gap: spacing.sm },
    exportButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: 12, borderRadius: borderRadius.md },
    exportButtonPrimary: { backgroundColor: colors.primaryDark },
    exportButtonSecondary: { backgroundColor: colors.mutedBackground, borderWidth: 1, borderColor: colors.border },
    exportButtonTextPrimary: { ...typography.buttonText, color: colors.textOnPrimary },
    exportButtonTextSecondary: { ...typography.buttonText, color: colors.primaryDark },
    successText: { ...typography.bodySmall, color: colors.successDark, marginTop: spacing.md, textAlign: 'center' },
    dangerCard: { borderWidth: 1, borderColor: colors.error || '#FCA5A5' },
    dangerIcon: { backgroundColor: (colors.error || '#DC2626') + '15' },
    deleteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: 14, borderRadius: borderRadius.md, backgroundColor: colors.error || '#DC2626' },
    deleteButtonText: { ...typography.buttonText, color: '#FFFFFF' },
  });
