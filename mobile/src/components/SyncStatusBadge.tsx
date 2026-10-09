/** شارة حالة المزامنة (M1.9) — تعرض حالة الطابور الحالية للمستخدم. */
import { StyleSheet, Text, View } from 'react-native';
import { t, type StringKey } from '../i18n';
import type { Locale, SyncState } from '../types';

export interface SyncStatusBadgeProps {
  state: SyncState;
  pendingCount: number;
  locale?: Locale;
}

const STATE_LABEL_KEY: Record<SyncState, StringKey | null> = {
  DRAFT: null,
  QUEUED: 'syncStatePending',
  SYNCING: 'syncStateSyncing',
  SYNCED: null,
  FAILED: 'syncStateError',
  CONFLICT: 'syncStateConflict',
  RECONNECTING: 'syncStateReconnecting',
};

export function SyncStatusBadge({ state, pendingCount, locale = 'ar' }: SyncStatusBadgeProps) {
  const labelKey = STATE_LABEL_KEY[state];
  if (!labelKey && pendingCount === 0) return null;
  const label = labelKey ? t(labelKey, locale) : t('syncStatePending', locale);
  return (
    <View style={styles.badge} testID="sync-status-badge" accessibilityRole="summary">
      <Text style={styles.text}>
        {label}
        {pendingCount > 0 ? ` (${pendingCount})` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#E0F2FE',
    alignSelf: 'flex-start',
    justifyContent: 'center',
  },
  text: { color: '#075985', fontSize: 12, fontWeight: '600' },
});
