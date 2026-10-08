import { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import { getIntegrations } from '../../../api/endpoints/integration';
import type { Credential, Integration } from '../../../types/integration';
import { notifyError, notifySuccess } from '../../../utils/toast';
import { createCredential, updateCredential } from '../../../api/endpoints/integration';

const KEY_TYPES = [
  { value: 'API_KEY', label: 'مفتاح API' },
  { value: 'OAUTH_SECRET', label: 'سر OAuth' },
  { value: 'CERTIFICATE', label: 'شهادة' },
  { value: 'TOKEN', label: 'توكن' },
  { value: 'OTHER', label: 'أخرى' },
];

interface Props {
  open: boolean;
  credential: Credential | null;
  onClose: () => void;
  onSaved: () => void;
}

const CredentialDialog = ({ open, credential, onClose, onSaved }: Props) => {
  const [saving, setSaving] = useState(false);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [integration, setIntegration] = useState('');
  const [keyType, setKeyType] = useState('API_KEY');
  const [keyName, setKeyName] = useState('');
  const [value, setValue] = useState('');

  useEffect(() => {
    if (!open) return;
    setIntegration(credential?.integration ?? '');
    setKeyType(credential?.key_type ?? 'API_KEY');
    setKeyName(credential?.key_name ?? '');
    setValue('');

    getIntegrations({ page_size: 200 })
      .then((res) => setIntegrations(res.data?.data?.results ?? []))
      .catch(() => setIntegrations([]));
  }, [open, credential]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (credential) {
        await updateCredential(credential.id, { key_type: keyType as Credential['key_type'], key_name: keyName, value });
      } else {
        await createCredential({ integration, key_type: keyType as Credential['key_type'], key_name: keyName, value });
      }
      notifySuccess(credential ? 'تم تدوير الاعتماد' : 'تم إضافة الاعتماد');
      onSaved();
    } catch {
      notifyError('تعذّر حفظ الاعتماد');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{credential ? 'تدوير الاعتماد' : 'إضافة اعتماد'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ pt: 0.5 }}>
            <TextField
              select size="small" fullWidth required label="التكامل"
              value={integration}
              onChange={(e) => setIntegration(e.target.value)}
              disabled={!!credential}
            >
              {integrations.map((i) => (
                <MenuItem key={i.id} value={i.id}>
                  {i.organization_name} / {i.endpoint_code}
                </MenuItem>
              ))}
            </TextField>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select size="small" fullWidth required label="النوع"
                value={keyType}
                onChange={(e) => setKeyType(e.target.value)}
              >
                {KEY_TYPES.map((k) => (
                  <MenuItem key={k.value} value={k.value}>{k.label}</MenuItem>
                ))}
              </TextField>
              <TextField
                size="small" fullWidth required label="اسم المفتاح"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                inputProps={{ dir: 'ltr', style: { textAlign: 'left' } }}
              />
            </Stack>

            <TextField
              size="small" fullWidth required type="password" label="القيمة"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              helperText="تُشفَّر في الخادم ولا تُعاد للعرض"
              inputProps={{ dir: 'ltr', style: { textAlign: 'left' } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={saving}>إلغاء</Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CredentialDialog;