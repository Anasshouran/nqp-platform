// Dashboard preferences.
// Extracted from ClerkDashboardPage without behavioural change.
import { useTranslation } from 'react-i18next';
import type { useClerkNav } from '../../hooks/useClerkNav';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import { notifySuccess } from '../../../../utils/toast';
import { SettingRow } from '../SettingsPanel';

type Props = {
  nav: Pick<ReturnType<typeof useClerkNav>, 'lang' | 'setLang'>;
};

export const ClerkSettingsView = ({ nav }: Props) => {
  const { t } = useTranslation();
  const { lang, setLang } = nav;
  return (
    <>
              <Card variant="outlined" sx={{ borderRadius: 3, maxWidth: 720 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>{t('clerk.views.settings.title')}</Typography>
                  <Stack spacing={1}>
                    <SettingRow label={t('clerk.views.settings.languageLabel')} value={lang === 'AR' ? t('clerk.views.settings.languageArabic') : 'English'} onToggle={() => setLang(lang === 'AR' ? 'EN' : 'AR')} />
                    <SettingRow label={t('clerk.views.settings.notificationsLabel')} value={t('clerk.views.settings.notificationsEnabled')} onToggle={() => notifySuccess(t('clerk.views.settings.notificationsToggleToast'))} />
                    <SettingRow label={t('clerk.views.settings.numberFormatLabel')} value={t('clerk.views.settings.numberFormatArabic')} onToggle={() => notifySuccess(t('clerk.views.settings.numberFormatToggleToast'))} />
                  </Stack>
                </CardContent>
              </Card>
    </>
  );
};
