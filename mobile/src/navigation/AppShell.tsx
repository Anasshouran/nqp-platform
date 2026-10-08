/** قشرة التنقل — تبويبات حتمية في التطبيق (§21؛ Travel تبقى لوحة "قريباً" مؤجَّلة). */
import { StyleSheet, View } from 'react-native';
import { TabBar, type TabItem, LoadingView, OfflineBadge } from '../components/ui';
import { t } from '../i18n';
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../state/hooks';
import type { RootState } from '../state';
import { setTab } from '../state';
import { bootstrapOffline } from '../offline/engine';
import { LoginScreen } from '../screens/LoginScreen';
import {
  CertificatesScreen,
  HealthScreen,
  HomeScreen,
  ProfileScreen,
  TravelScreen,
} from '../screens/dataScreens';

const TAB_IDS = ['home', 'travel', 'health', 'certificates', 'profile'] as const;
type TabId = (typeof TAB_IDS)[number];

export function AppShell() {
  const dispatch = useAppDispatch();
  const sessionStatus = useAppSelector((s: RootState) => s.session.status);
  const tab = useAppSelector((s: RootState) => s.ui.activeTab) as TabId;
  const locale = useAppSelector((s: RootState) => s.ui.locale);
  const connectivity = useAppSelector((s: RootState) => s.ui.connectivity);

  useEffect(() => {
    // تشغيل الإقلاع مرة واحدة: استرداد جلسة/كاش ثم محاولة توفيق الخادم.
    void dispatch(bootstrapOffline('online'));
  }, [dispatch]);

  if (sessionStatus === 'restoring') {
    return <LoadingView locale={locale} />;
  }

  if (sessionStatus !== 'signed_in') {
    return (
      <View style={styles.root}>
        {connectivity === 'offline' ? <OfflineBadge locale={locale} /> : null}
        <LoginScreen />
      </View>
    );
  }

  const tabs: TabItem[] = TAB_IDS.map((id) => ({ id, label: t(id, locale) }));

  const screen = {
    home: <HomeScreen />,
    travel: <TravelScreen />,
    health: <HealthScreen />,
    certificates: <CertificatesScreen />,
    profile: <ProfileScreen />,
  }[tab];

  return (
    <View style={styles.root}>
      <View style={styles.content}>{screen}</View>
      <TabBar
        tabs={tabs}
        active={tab}
        onSelect={(id) => dispatch(setTab(id as TabId))}
        locale={locale}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FCFCFD' },
  content: { flex: 1 },
});