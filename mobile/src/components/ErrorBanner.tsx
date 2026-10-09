/**
 * مكوّن عرض خطأ ثنائي اللغة (M1.5/المكوّنات): يعرض رسالة الغلاف المعتمدة
 * (عربي أولاً) بلا أي تفاصيل داخلية.
 */
import { StyleSheet, Text, View } from 'react-native';
import type { ErrorMessage } from '@afyatna/contracts';
import { errorMessageFor, t, type StringKey } from '../i18n';
import type { Locale } from '../types';

export interface ErrorBannerProps {
  error: Pick<ErrorMessage, 'code' | 'ar' | 'en'>;
  locale?: Locale;
}

export function ErrorBanner({ error, locale = 'ar' }: ErrorBannerProps) {
  return (
    <View style={styles.banner} accessibilityRole="alert" testID="error-banner">
      <Text style={styles.text} accessibilityLabel={errorMessageFor(locale, error.ar, error.en)}>
        {`${t('errorPrefix' as StringKey, locale)}: ${errorMessageFor(locale, error.ar, error.en)}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    minHeight: 48,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FEE4E2',
    justifyContent: 'center',
  },
  text: { color: '#B42318', fontSize: 14, textAlign: 'right' },
});
