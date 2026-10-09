/** مكوّنات واجهة مشتركة: حالات تحميل/خطأ/فارغ/متصل، بطاقات، شريط تبويب، لوحة مزامنة. */
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { errorMessageFor, t, type StringKey } from '../i18n';
import type { Connectivity, Locale, SyncState } from '../types';

export function LoadingView({ locale }: { locale: Locale }) {
  return (
    <View style={styles.center} testID="loading-view" accessibilityRole="progressbar" accessibilityLabel={t('loading', locale)}>
      <ActivityIndicator size="large" />
      <Text style={styles.mutedText}>{t('loading', locale)}</Text>
    </View>
  );
}

export function ErrorView({
  error,
  onRetry,
  locale,
}: {
  error: { ar: string; en: string; code: string } | null;
  onRetry?: () => void;
  locale: Locale;
}) {
  return (
    <View style={styles.center} testID="error-view" accessibilityRole="alert">
      <Text style={styles.errorText}>
        {error ? `${t('errorPrefix', locale)}: ${errorMessageFor(locale, error.ar, error.en)}` : t('error', locale)}
      </Text>
      {onRetry ? (
        <Pressable style={styles.button} onPress={onRetry} accessibilityRole="button" accessibilityLabel={t('retry', locale)}>
          <Text style={styles.buttonText}>{t('retry', locale)}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyView({ message }: { message: string }) {
  return (
    <View style={styles.center} testID="empty-view">
      <Text style={styles.mutedText}>{message}</Text>
    </View>
  );
}

export function CacheStamp({ locale }: { locale: Locale }) {
  return (
    <View style={styles.cacheBadge} testID="cached-stamp" accessibilityRole="summary" accessibilityLabel={t('cachedLabel', locale)}>
      <Text style={styles.cacheBadgeText}>{t('cachedLabel', locale)}</Text>
    </View>
  );
}

export function OfflineBadge({ locale }: { locale: Locale }) {
  return (
    <View style={styles.offlineBadge} testID="offline-badge" accessibilityRole="summary" accessibilityLabel={t('offlineNotify', locale)}>
      <Text style={styles.offlineBadgeText}>{t('offlineNotify', locale)}</Text>
    </View>
  );
}

export function Card({ children, testID }: { children: ReactNode; testID?: string }) {
  return (
    <View style={styles.card} testID={testID}>
      {children}
    </View>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.cardTitle}>{children}</Text>;
}

export function SectionHeader({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionHeader}>{children}</Text>;
}

const SYNC_LABEL_KEY: Record<SyncState, StringKey> = {
  DRAFT: 'syncStateDraft',
  QUEUED: 'syncStatePending',
  SYNCING: 'syncStateSyncing',
  SYNCED: 'syncStateSynced',
  FAILED: 'syncStateError',
  CONFLICT: 'syncStateConflict',
  RECONNECTING: 'syncStateReconnecting',
};

export function SyncStatusPanel({
  locale,
  connectivity,
  syncState,
  serverTime,
  contractVersion,
}: {
  locale: Locale;
  connectivity: Connectivity;
  syncState: SyncState;
  serverTime?: string | null;
  contractVersion?: string | null;
}) {
  return (
    <View style={styles.syncPanel} testID="sync-panel" accessibilityRole="summary">
      <Text style={styles.syncText}>
        {connectivity === 'offline'
          ? t('syncStateOffline', locale)
          : t(SYNC_LABEL_KEY[syncState], locale)}
      </Text>
      {serverTime ? (
        <Text style={styles.mutedText}>{`${t('serverTimeLabel', locale)}: ${serverTime}`}</Text>
      ) : null}
      {contractVersion ? (
        <Text style={styles.mutedText}>{`${t('contractVersionLabel', locale)}: ${contractVersion}`}</Text>
      ) : null}
    </View>
  );
}

export interface TabItem {
  id: string;
  label: string;
}

export function TabBar({
  tabs,
  active,
  onSelect,
  locale,
}: {
  tabs: readonly { id: string; label: string }[];
  active: string;
  onSelect: (id: string) => void;
  locale: Locale;
}) {
  return (
    <View style={[styles.tabBar, locale === 'ar' && styles.rowReverse]} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <Pressable
            key={tab.id}
            testID={`tab-${tab.id}`}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onSelect(tab.id)}
            hitSlop={4}
            style={[styles.tab, selected && styles.tabActive]}
          >
            <Text style={[styles.tabText, selected && styles.tabTextActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  testID,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID ?? 'primary-button'}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.button, disabled && styles.buttonDisabled, pressed && styles.buttonPressed]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

export function TextField({
  label,
  value,
  onChangeText,
  secure,
  autoCapitalize,
  testID,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  secure?: boolean;
  autoCapitalize?: 'none' | 'words';
  testID?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        testID={testID}
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secure}
        autoCapitalize={autoCapitalize ?? 'none'}
        style={styles.input}
        placeholderTextColor="#98A2B3"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  mutedText: { color: '#667085', fontSize: 13 },
  errorText: { color: '#B42318', fontSize: 14, textAlign: 'center' },
  button: {
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#0B5ED7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonPressed: { opacity: 0.85 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E4E7EC',
    padding: 14,
    marginBottom: 10,
    shadowColor: '#1D2939',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardTitle: { fontWeight: '700', fontSize: 15, marginBottom: 8 },
  sectionHeader: { fontWeight: '700', fontSize: 16, marginBottom: 8, marginTop: 4 },
  syncPanel: { padding: 10, borderRadius: 10, backgroundColor: '#F0F9FF', gap: 2, marginBottom: 8 },
  syncText: { fontWeight: '600', fontSize: 13, color: '#075985' },
  offlineBadge: {
    backgroundColor: '#FFFAEB',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  offlineBadgeText: { color: '#B54708', fontSize: 12 },
  cacheBadge: {
    backgroundColor: '#EFF8FF',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  cacheBadgeText: { color: '#175CD3', fontSize: 12 },
  tabBar: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E4E7EC' },
  rowReverse: { flexDirection: 'row-reverse' },
  tab: { minHeight: 44, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  tabActive: { backgroundColor: '#E3F2FD' },
  tabText: { fontSize: 12, color: '#475467' },
  tabTextActive: { color: '#0B5ED7', fontWeight: '700' },
  field: { marginBottom: 12 },
  fieldLabel: { marginBottom: 4, fontWeight: '600', fontSize: 13 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#101828',
  },
});