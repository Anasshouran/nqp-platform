/** شاشات البيانات (M2-B) — كل شاشة تشغِّل حاصل الجلب مرة عند الحاجة وتعرض
 * حالات تحميل/فارغ/خطأ/غير متصل بشكل صريح (§24). لا وصول مباشر لـ HTTP. */
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { MobileCertificate } from '@afyatna/contracts';
import { localizedStatus, t } from '../i18n';
import { type RootState } from '../state';
import { useAppDispatch, useAppSelector } from '../state/hooks';
import {
  fetchCertificates,
  fetchDeclarations,
  fetchNotifications,
  fetchProfile,
  fetchRequirements,
  fetchSyncStatus,
  logout,
  markNotificationRead,
  setLocale,
} from '../state';
import type { FetchMeta } from '../state/data';
import {
  CacheStamp,
  Card,
  CardTitle,
  EmptyView,
  ErrorView,
  LoadingView,
  OfflineBadge,
  PrimaryButton,
  SectionHeader,
  SyncStatusPanel,
} from '../components/ui';

const selectCertificates = (s: RootState): FetchMeta<MobileCertificate[]> => s.certificates;

type FetchThunk =
  | ReturnType<typeof fetchProfile>
  | ReturnType<typeof fetchCertificates>
  | ReturnType<typeof fetchRequirements>
  | ReturnType<typeof fetchDeclarations>
  | ReturnType<typeof fetchNotifications>
  | ReturnType<typeof fetchSyncStatus>;

function useFetchOnIdle(status: string, thunk: () => FetchThunk): (() => void) {
  const dispatch = useAppDispatch();
  useEffect(() => {
    if (status === 'idle') dispatch(thunk() as never);
  }, [status, dispatch]);
  return () => dispatch(thunk() as never);
}

function ScreenScaffold({
  locale,
  header,
  children,
}: {
  locale: 'ar' | 'en';
  header: string;
  children: React.ReactNode;
}) {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} testID="screen-scroll">
      <View style={[styles.headerRow, locale === 'ar' && styles.rtlRow]}>
        <Text style={styles.header}>{header}</Text>
      </View>
      {children}
    </ScrollView>
  );
}

function Section({
  meta,
  offline,
  locale,
  onRetry,
  emptyText,
  isEmpty,
  children,
}: {
  meta: { status: string; error: { ar: string; en: string; code: string } | null; isCached?: boolean };
  offline: boolean;
  locale: 'ar' | 'en';
  onRetry: () => void;
  emptyText: string;
  isEmpty: boolean;
  children: React.ReactNode;
}) {
  if (meta.status === 'loading') return <LoadingView locale={locale} />;
  if (meta.status === 'error')
    return <ErrorView error={meta.error} onRetry={onRetry} locale={locale} />;
  if (isEmpty) return <EmptyView message={emptyText} />;
  return (
    <>
      {meta.isCached ? <CacheStamp locale={locale} /> : null}
      {offline ? <OfflineBadge locale={locale} /> : null}
      {children}
    </>
  );
}

// ---------------------------------------------------------- الشاشة الرئيسية --
export function HomeScreen() {
  const dispatch = useAppDispatch();
  const locale = useAppSelector((s) => s.ui.locale);
  const connectivity = useAppSelector((s) => s.ui.connectivity);
  const syncState = useAppSelector((s) => s.ui.syncState);
  const profile = useAppSelector((s) => s.profile);
  const certificates = useAppSelector(selectCertificates);
  const declarations = useAppSelector((s) => s.declarations);
  const notifications = useAppSelector((s) => s.notifications);
  const sync = useAppSelector((s) => s.sync);

  useFetchOnIdle(profile.status, () => fetchProfile());
  useFetchOnIdle(certificates.status, () => fetchCertificates());
  useFetchOnIdle(declarations.status, () => fetchDeclarations());
  useFetchOnIdle(notifications.status, () => fetchNotifications());
  useFetchOnIdle(sync.status, () => fetchSyncStatus());

  const fullName = profile.data?.full_name ?? '';
  const declared = declarations.data?.[0]?.declared;
  const unread = sync.data?.unread_notifications ?? notifications.data?.filter((n) => !n.is_read).length ?? 0;

  return (
    <ScreenScaffold locale={locale} header={t('home', locale)}>
      <SyncStatusPanel
        locale={locale}
        connectivity={connectivity}
        syncState={syncState}
        serverTime={sync.data?.server_time ?? null}
        contractVersion={sync.data?.contract_version ?? null}
      />
      {profile.status === 'loading' ? <LoadingView locale={locale} /> : null}
      {profile.status === 'error' ? <ErrorView error={profile.error} onRetry={() => dispatch(fetchProfile() as never)} locale={locale} /> : null}
      {profile.data ? (
        <Card testID="home-greeting">
          <Text style={styles.cardTitle}>{fullName ? `${t('greeting', locale)} ${fullName} 👋` : t('greeting', locale)}</Text>
        </Card>
      ) : null}
      <View style={styles.statRow}>
        <View style={[styles.stat, locale === 'ar' && styles.statRtl]}>
          <Text style={styles.statValue}>{certificates.data?.length ?? 0}</Text>
          <Text style={styles.statLabel}>{t('certificates', locale)}</Text>
        </View>
        <View style={[styles.stat, locale === 'ar' && styles.statRtl]}>
          <Text style={styles.statValue}>{unread}</Text>
          <Text style={styles.statLabel}>{t('notifications', locale)}</Text>
        </View>
        <View style={[styles.stat, locale === 'ar' && styles.statRtl]}>
          <Text style={styles.statValue}>{declared === undefined ? '—' : declared ? t('declaredYes', locale) : t('declaredNo', locale)}</Text>
          <Text style={styles.statLabel}>{t('declarationSummary', locale)}</Text>
        </View>
      </View>
    </ScreenScaffold>
  );
}

// ------------------------------------------------------------ الملف الشخصي --
export function ProfileScreen() {
  const dispatch = useAppDispatch();
  const locale = useAppSelector((s) => s.ui.locale);
  const profile = useAppSelector((s) => s.profile);
  const offline = useAppSelector((s) => s.ui.connectivity) === 'offline';
  const [confirming, setConfirming] = useState(false);

  useFetchOnIdle(profile.status, () => fetchProfile());

  const onLogout = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    dispatch(logout());
  };

  return (
    <ScreenScaffold locale={locale} header={t('profile', locale)}>
      <Section meta={profile} offline={offline} locale={locale} onRetry={() => dispatch(fetchProfile() as never)} emptyText={t('empty', locale)} isEmpty={!profile.data}>
        {profile.data ? (
          <Card>
            <CardTitle>{profile.data.full_name}</CardTitle>
            <Row label="Email" value={profile.data.email} />
            <Row label="Phone" value={profile.data.phone} />
            <Row label="National ID" value={profile.data.national_id} />
            <Row label="Type" value={profile.data.user_type} />
          </Card>
        ) : null}
      </Section>
      <SectionHeader>{t('language', locale)}</SectionHeader>
      <View style={styles.langRow}>
        {(['ar', 'en'] as const).map((loc) => (
          <Pressable
            key={loc}
            testID={`lang-${loc}`}
            accessibilityRole="button"
            accessibilityLabel={t('language', locale)}
            accessibilityState={{ selected: locale === loc }}
            onPress={() => dispatch(setLocale(loc))}
            style={[styles.langChip, locale === loc && styles.langChipActive]}
          >
            <Text style={[styles.langChipText, locale === loc && styles.langChipTextActive]}>
              {loc === 'ar' ? t('languageArabic', locale) : t('languageEnglish', locale)}
            </Text>
          </Pressable>
        ))}
      </View>
      <PrimaryButton
        testID="logout-button"
        label={confirming ? t('confirm', locale) : t('logout', locale)}
        onPress={onLogout}
      />
    </ScreenScaffold>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>{value || '—'}</Text>
    </View>
  );
}

// -------------------------------------------------------------- الشهادات ---
export function CertificatesScreen() {
  const locale = useAppSelector((s) => s.ui.locale);
  const meta = useAppSelector(selectCertificates);
  const offline = useAppSelector((s) => s.ui.connectivity) === 'offline';
  const [selected, setSelected] = useState<MobileCertificate | null>(null);
  const reload = useFetchOnIdle(meta.status, () => fetchCertificates());

  if (selected) {
    return (
      <ScreenScaffold locale={locale} header={t('certificates', locale)}>
        <Card>
          <CardTitle>{selected.vaccine_name || t('certificateNumber', locale)}</CardTitle>
          <Row label={t('certificateNumber', locale)} value={selected.certificate_number} />
          <Row label={t('vaccineName', locale)} value={selected.vaccine_name} />
          <Row label={t('issuedAt', locale)} value={selected.issued_at} />
          <Row label={t('validUntil', locale)} value={selected.valid_until} />
          <Row label={t('status', locale)} value={localizedStatus(locale, selected.status)} />
        </Card>
        <PrimaryButton label={t('home', locale)} onPress={() => setSelected(null)} testID="certificate-back" />
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold locale={locale} header={t('certificates', locale)}>
      <Section meta={meta} offline={offline} locale={locale} onRetry={reload} emptyText={t('emptyCertificates', locale)} isEmpty={!meta.data?.length}>
        {meta.data?.map((cert) => (
          <Pressable key={cert.id} testID={`certificate-${cert.id}`} accessibilityRole="button" onPress={() => setSelected(cert)}>
            <Card>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>{cert.vaccine_name || cert.certificate_number}</Text>
                <Text style={styles.rowValue}>{localizedStatus(locale, cert.status)}</Text>
              </View>
            </Card>
          </Pressable>
        ))}
      </Section>
    </ScreenScaffold>
  );
}

// ------------------------------------------------------------------ الصحة ---
export function HealthScreen() {
  const locale = useAppSelector((s) => s.ui.locale);
  const meta = useAppSelector((s) => s.declarations);
  const offline = useAppSelector((s) => s.ui.connectivity) === 'offline';
  const reload = useFetchOnIdle(meta.status, () => fetchDeclarations());

  const declaration = meta.data?.find((d) => d.declared) ?? meta.data?.[0];

  return (
    <ScreenScaffold locale={locale} header={t('health', locale)}>
      <Section meta={meta} offline={offline} locale={locale} onRetry={reload} emptyText={t('empty', locale)} isEmpty={!meta.data?.length}>
        {declaration ? (
          <Card>
            <CardTitle>{t('declarationSummary', locale)}</CardTitle>
            <Row label={t('status', locale)} value={declaration.declared ? t('declaredYes', locale) : t('declaredNo', locale)} />
            <Row label={t('symptomsLabel', locale)} value={declaration.symptoms.join('، ') || '—'} />
            {declaration.submitted_at ? <Row label={t('createdLabel', locale)} value={declaration.submitted_at} /> : null}
          </Card>
        ) : null}
      </Section>
    </ScreenScaffold>
  );
}

// ------------------------------------------------------- المتطلبات ----------
export function RequirementsScreen() {
  const locale = useAppSelector((s) => s.ui.locale);
  const meta = useAppSelector((s) => s.requirements);
  const offline = useAppSelector((s) => s.ui.connectivity) === 'offline';
  const reload = useFetchOnIdle(meta.status, () => fetchRequirements());

  return (
    <ScreenScaffold locale={locale} header={t('requirements', locale)}>
      <Section meta={meta} offline={offline} locale={locale} onRetry={reload} emptyText={t('emptyRequirements', locale)} isEmpty={!meta.data?.length}>
        {meta.data?.map((req) => (
          <Card key={req.code}>
            <CardTitle>{req.title_ar}</CardTitle>
            {req.description_ar ? <Text style={styles.mutedText}>{req.description_ar}</Text> : null}
            <Text style={styles.mutedText}>{t('requirementSource', locale)}</Text>
          </Card>
        ))}
      </Section>
    </ScreenScaffold>
  );
}

// ---------------------------------------------------------------- إشعارات ---
export function NotificationsScreen() {
  const dispatch = useAppDispatch();
  const locale = useAppSelector((s) => s.ui.locale);
  const meta = useAppSelector((s) => s.notifications);
  const offline = useAppSelector((s) => s.ui.connectivity) === 'offline';
  const reload = useFetchOnIdle(meta.status, () => fetchNotifications());

  return (
    <ScreenScaffold locale={locale} header={t('notifications', locale)}>
      <Section meta={meta} offline={offline} locale={locale} onRetry={reload} emptyText={t('emptyNotifications', locale)} isEmpty={!meta.data?.length}>
        {meta.data?.map((entry) => (
          <Card key={entry.id}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{entry.subject || t('notifications', locale)}</Text>
              <Text style={[styles.rowValue, !entry.is_read && styles.unreadDot]} testID={`unread-${entry.id}`}>
                {entry.is_read ? '' : t('unreadLabel', locale)}
              </Text>
            </View>
            {!entry.is_read ? (
              <Pressable
                testID={`read-${entry.id}`}
                accessibilityRole="button"
                onPress={() => dispatch(markNotificationRead(entry.id))}
                style={styles.readButton}
              >
                <Text style={styles.readButtonText}>{t('readNow', locale)}</Text>
              </Pressable>
            ) : null}
            {entry.created_at ? <Text style={styles.mutedText}>{entry.created_at}</Text> : null}
          </Card>
        ))}
      </Section>
    </ScreenScaffold>
  );
}


// ----------------------------------------------------------------- السفر ----
export function TravelScreen() {
  const locale = useAppSelector((s) => s.ui.locale);
  return (
    <ScreenScaffold locale={locale} header={t('travel', locale)}>
      <Card>
        <CardTitle>{t('travelPlaceholderTitle', locale)}</CardTitle>
        <Text style={styles.mutedText}>{t('travelPlaceholderBody', locale)}</Text>
      </Card>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FCFCFD' },
  content: { padding: 16, paddingBottom: 32 },
  headerRow: { marginBottom: 12 },
  rtlRow: { direction: 'rtl' },
  header: { fontSize: 22, fontWeight: '800' },
  cardTitle: { fontWeight: '700', fontSize: 15, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, gap: 12 },
  rowLabel: { flex: 1, color: '#475467', fontSize: 14 },
  rowValue: { flex: 1, textAlign: 'right', fontWeight: '600', fontSize: 14 },
  mutedText: { color: '#667085', fontSize: 13 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 12 },
  stat: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: '#E4E7EC' },
  statRtl: {},
  statValue: { fontWeight: '800', fontSize: 18 },
  statLabel: { fontSize: 12, color: '#475467', marginTop: 2, textAlign: 'center' },
  langRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  langChip: { minHeight: 44, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#D0D5DD', justifyContent: 'center' },
  langChipActive: { backgroundColor: '#0B5ED7', borderColor: '#0B5ED7' },
  langChipText: { color: '#475467', fontSize: 13 },
  langChipTextActive: { color: '#fff', fontWeight: '700' },
  unreadDot: { color: '#0B5ED7' },
  readButton: { marginTop: 6, minHeight: 40, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 12, backgroundColor: '#E3F2FD', borderRadius: 8 },
  readButtonText: { color: '#0B5ED7', fontWeight: '600', fontSize: 13 },
});