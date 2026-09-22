import { useState } from 'react';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import SaveIcon from '@mui/icons-material/Save';
import { SectionCard } from '../../../../../components/uikit';
import { getCmsSettings, upsertCmsSetting } from '../../../../../api/endpoints/cms';

interface ContactForm {
  official_phone: string;
  official_email: string;
  address: string;
  website: string;
}

const defaultContact: ContactForm = {
  official_phone: '',
  official_email: '',
  address: '',
  website: '',
};

const RedSeaSettingsPanel = () => {
  const [contact, setContact] = useState<ContactForm>(defaultContact);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const ensureLoaded = () => {
    if (loaded) return;
    setLoaded(true);
    getCmsSettings()
      .then((res) => {
        const item = res.data.data.results.find((s) => s.key === 'contact');
        if (item) {
          const v = item.value as Record<string, string>;
          setContact({
            official_phone: v.official_phone ?? '',
            official_email: v.official_email ?? '',
            address: v.address ?? '',
            website: v.website ?? '',
          });
        }
      })
      .catch(() => undefined);
  };

  const save = () => {
    setSaving(true);
    setMessage('');
    upsertCmsSetting({ key: 'contact', value: { ...contact } })
      .then(() => {
        setMessage('تم حفظ الإعدادات بنجاح');
        setSaving(false);
      })
      .catch(() => {
        setMessage('فشل حفظ الإعدادات');
        setSaving(false);
      });
  };

  return (
    <Stack spacing={3}>
      <SectionCard title="معلومات الاتصال الرسمية" subtitle="تظهر هذه البيانات في صفحة اتصل بنا بالموقع العام">
        {message && <Alert severity={message.includes('تم') ? 'success' : 'error'}><AlertTitle>{message}</AlertTitle></Alert>}
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="رقم الهاتف الرسمي" value={contact.official_phone} onChange={(e) => setContact((c) => ({ ...c, official_phone: e.target.value }))} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="البريد الإلكتروني الرسمي" value={contact.official_email} onChange={(e) => setContact((c) => ({ ...c, official_email: e.target.value }))} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="العنوان" multiline minRows={2} value={contact.address} onChange={(e) => setContact((c) => ({ ...c, address: e.target.value }))} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="الموقع الإلكتروني" value={contact.website} onChange={(e) => setContact((c) => ({ ...c, website: e.target.value }))} />
          </Grid>
        </Grid>
        <Divider sx={{ my: 3 }} />
        <Button variant="contained" startIcon={<SaveIcon />} onClick={save} disabled={saving} onFocus={ensureLoaded} onMouseEnter={ensureLoaded}>
          {saving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}
        </Button>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          ملاحظة: حتى تُعتمد البيانات رسميًا تُعرض في صفحة اتصل بنا بدلًا من النصوص المؤقتة.
        </Typography>
      </SectionCard>
    </Stack>
  );
};

export default RedSeaSettingsPanel;
