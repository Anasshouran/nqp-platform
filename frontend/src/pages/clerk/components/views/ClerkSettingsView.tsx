// Dashboard preferences.
// Extracted from ClerkDashboardPage without behavioural change.
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
  const { lang, setLang } = nav;
  return (
    <>
              <Card variant="outlined" sx={{ borderRadius: 3, maxWidth: 720 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>الإعدادات</Typography>
                  <Stack spacing={1}>
                    <SettingRow label="اللغة" value={lang === 'AR' ? 'العربية' : 'English'} onToggle={() => setLang(lang === 'AR' ? 'EN' : 'AR')} />
                    <SettingRow label="إشعارات الطلبات" value="مفعّلة" onToggle={() => notifySuccess('تم تبديل الإشعارات')} />
                    <SettingRow label="تنسيق الأرقام" value="عربي (ar-EG)" onToggle={() => notifySuccess('تم تبديل التنسيق')} />
                  </Stack>
                </CardContent>
              </Card>
    </>
  );
};
