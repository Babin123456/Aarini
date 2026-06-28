import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { ArrowLeft, Download, FileText, Share, Globe } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { exportHealthData, shareExportFile } from '../services/exportService';

export const SettingsScreen = ({ navigation }) => {
  const { userToken, user } = useAuth();
  const { theme } = useTheme();
  const { colors, typography, spacing, borderRadius, shadows } = theme;
  const { t, language, setLanguage, supportedLanguages } = useLanguage();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [exporting, setExporting] = useState(false);
  const [lastExport, setLastExport] = useState(null);

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const result = await exportHealthData(userToken, user?.uid);
      setLastExport(result);
      const filePath = format === 'json' ? result.jsonPath : result.textPath;
      await shareExportFile(filePath);
    } catch (err) {
      Alert.alert(t('common.error'), err.message || t('settings.exportFailed'));
    } finally {
      setExporting(false);
    }
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
          <Text style={[typography.h2, styles.headerTitle]}>{t('settings.title')}</Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <Download size={20} color={colors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={typography.h3}>{t('settings.exportData')}</Text>
              <Text style={styles.cardSubtitle}>{t('settings.exportSubtitle')}</Text>
            </View>
          </View>

          <Text style={styles.infoText}>
            {t('settings.exportInfo')}
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.exportButton, styles.exportButtonPrimary]}
              onPress={() => handleExport('text')}
              disabled={exporting}
              accessibilityLabel={t('settings.readableReport')}
            >
              {exporting ? (
                <ActivityIndicator size="small" color={colors.textOnPrimary} />
              ) : (
                <>
                  <FileText size={18} color={colors.textOnPrimary} />
                  <Text style={styles.exportButtonTextPrimary}>{t('settings.readableReport')}</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.exportButton, styles.exportButtonSecondary]}
              onPress={() => handleExport('json')}
              disabled={exporting}
              accessibilityLabel={t('settings.jsonExport')}
            >
              {exporting ? (
                <ActivityIndicator size="small" color={colors.primaryDark} />
              ) : (
                <>
                  <Share size={18} color={colors.primaryDark} />
                  <Text style={styles.exportButtonTextSecondary}>{t('settings.jsonExport')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {lastExport && (
            <Text style={styles.successText}>
              {t('settings.exportSuccess', { count: lastExport.recordCount })}
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <Globe size={20} color={colors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={typography.h3}>{t('settings.language')}</Text>
              <Text style={styles.cardSubtitle}>{t('settings.languageSubtitle')}</Text>
            </View>
          </View>

          <View style={styles.languageOptions}>
            {supportedLanguages.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[styles.languageOption, language === lang.code && styles.languageOptionActive]}
                onPress={() => setLanguage(lang.code)}
                accessibilityRole="radio"
                accessibilityState={{ selected: language === lang.code }}
                accessibilityLabel={lang.label}
              >
                <Text style={[styles.languageOptionText, language === lang.code && styles.languageOptionTextActive]}>
                  {lang.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
    languageOptions: { flexDirection: 'row', gap: spacing.sm },
    languageOption: { flex: 1, paddingVertical: 12, borderRadius: borderRadius.md, backgroundColor: colors.mutedBackground, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' },
    languageOptionActive: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
    languageOptionText: { ...typography.buttonText, color: colors.textMedium },
    languageOptionTextActive: { color: colors.textOnPrimary },
  });
