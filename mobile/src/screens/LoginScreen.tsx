/** الشاشة: دخول المسافر — عبر المزوّد القائم (JWT الوطني). SUDAPASS غير مفعّل. */
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { login } from '../state';
import { useAppDispatch, useAppSelector } from '../state/hooks';
import { normalizeError } from '../services/errors';
import { t } from '../i18n';
import { ErrorView, PrimaryButton, TextField } from '../components/ui';

export function LoginScreen() {
  const dispatch = useAppDispatch();
  const locale = useAppSelector((s) => s.ui.locale);
  const sessionStatus = useAppSelector((s) => s.session.status);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<ReturnType<typeof normalizeError> | null>(null);

  const onSubmit = async () => {
    setLocalError(null);
    try {
      await dispatch(login({ identifier, password })).unwrap();
    } catch (e) {
      setLocalError(normalizeError(e));
    }
  };

  const sessionExpired = sessionStatus === 'session_expired';

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.titleBlock, locale === 'ar' && styles.rtl]}>
          <Text style={styles.title}>{t('appName', locale)}</Text>
          <Text style={styles.subtitle}>{t('signInSubtitle', locale)}</Text>
        </View>
        {sessionExpired ? (
          <View style={styles.expired} accessibilityRole="alert" testID="session-expired-banner">
            <Text style={styles.expiredText}>{`${t('sessionExpiredTitle', locale)} — ${t('sessionExpiredBody', locale)}`}</Text>
          </View>
        ) : null}
        {localError ? (
          <ErrorView error={localError} onRetry={onSubmit} locale={locale} />
        ) : null}
        <View style={styles.form}>
          <TextField label={t('identifier', locale)} value={identifier} onChangeText={setIdentifier} testID="login-identifier" />
          <TextField label={t('password', locale)} value={password} onChangeText={setPassword} secure testID="login-password" />
          <PrimaryButton
            label={t('login', locale)}
            onPress={onSubmit}
            disabled={!identifier || !password}
            testID="login-submit"
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FCFCFD' },
  content: { padding: 20, justifyContent: 'center', flexGrow: 1 },
  titleBlock: { marginBottom: 20 },
  rtl: { direction: 'rtl' },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: '#475467', fontSize: 14 },
  form: { gap: 4 },
  expired: { backgroundColor: '#FEF3C7', padding: 10, borderRadius: 8, marginBottom: 12 },
  expiredText: { color: '#92400E', fontSize: 13 },
});