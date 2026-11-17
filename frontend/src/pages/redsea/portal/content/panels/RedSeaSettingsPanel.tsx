import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [contact, setContact] = useState<ContactForm>(defaultContact);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

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
    setSaveStatus('idle');
    upsertCmsSetting({ key: 'contact', value: { ...contact } })
      .then(() => {
        setSaveStatus('success');
        setSaving(false);
      })
      .catch(() => {
        setSaveStatus('error');
        setSaving(false);
      });
  };

  return (
    <Stack spacing={3}>
      <SectionCard title={t('redsea.settings.contactInfoTitle')} subtitle={t('redsea.settings.contactInfoSubtitle')}>
        {saveStatus !== 'idle' && (
          <Alert severity={saveStatus}>
            <AlertTitle>{saveStatus === 'success' ? t('redsea.settings.saveSuccess') : t('redsea.settings.saveError')}</AlertTitle>
          </Alert>
        )}
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label={t('redsea.settings.fields.officialPhone')} value={contact.official_phone} onChange={(e) => setContact((c) => ({ ...c, official_phone: e.target.value }))} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label={t('redsea.settings.fields.officialEmail')} value={contact.official_email} onChange={(e) => setContact((c) => ({ ...c, official_email: e.target.value }))} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label={t('redsea.settings.fields.address')} multiline minRows={2} value={contact.address} onChange={(e) => setContact((c) => ({ ...c, address: e.target.value }))} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label={t('redsea.settings.fields.website')} value={contact.website} onChange={(e) => setContact((c) => ({ ...c, website: e.target.value }))} />
          </Grid>
        </Grid>
        <Divider sx={{ my: 3 }} />
        <Button variant="contained" startIcon={<SaveIcon />} onClick={save} disabled={saving} onFocus={ensureLoaded} onMouseEnter={ensureLoaded}>
          {saving ? t('redsea.settings.actions.saving') : t('redsea.settings.actions.save')}
        </Button>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          {t('redsea.settings.note')}
        </Typography>
      </SectionCard>
    </Stack>
  );
};

export default RedSeaSettingsPanel;
