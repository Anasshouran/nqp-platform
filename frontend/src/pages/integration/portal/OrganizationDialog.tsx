import { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import type { Organization, OrganizationFormData } from '../../../types/integration';

const ORG_TYPES = [
  { value: 'INTERNATIONAL', label: 'دولية' },
  { value: 'GOVERNMENT', label: 'حكومية' },
  { value: 'LABORATORY', label: 'مختبر' },
  { value: 'HOSPITAL', label: 'مستشفى' },
  { value: 'PARTNER', label: 'شريك' },
  { value: 'OTHER', label: 'أخرى' },
];

const STATUSES = [
  { value: 'ACTIVE', label: 'نشط' },
  { value: 'PENDING', label: 'معلق' },
  { value: 'INACTIVE', label: 'غير نشط' },
];

const COUNTRIES = [
  { value: 'SD', label: 'السودان (SD)' },
  { value: 'CH', label: 'سويسرا — WHO (CH)' },
  { value: 'EG', label: 'مصر (EG)' },
  { value: 'SA', label: 'السعودية (SA)' },
  { value: 'AE', label: 'الإمارات (AE)' },
  { value: 'ET', label: 'إثيوبيا (ET)' },
  { value: 'SS', label: 'جنوب السودان (SS)' },
  { value: 'ER', label: 'إريتريا (ER)' },
  { value: 'LY', label: 'ليبيا (LY)' },
];

const EMPTY: OrganizationFormData = {
  code: '',
  name_en: '',
  name_ar: '',
  org_type: 'PARTNER',
  country: 'SD',
  status: 'PENDING',
  technical_contact_name: '',
  technical_contact_email: '',
  technical_contact_phone: '',
  is_active: true,
};

interface Props {
  open: boolean;
  organization: Organization | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (data: OrganizationFormData) => Promise<void>;
}

const OrganizationDialog = ({ open, organization, saving, onClose, onSubmit }: Props) => {
  const [form, setForm] = useState<OrganizationFormData>(EMPTY);

  useEffect(() => {
    if (!open) return;
    if (organization) {
      setForm({
        code: organization.code,
        name_en: organization.name_en,
        name_ar: organization.name_ar,
        org_type: organization.org_type,
        country: organization.country || 'SD',
        status: organization.status,
        technical_contact_name: organization.technical_contact_name ?? '',
        technical_contact_email: organization.technical_contact_email ?? '',
        technical_contact_phone: organization.technical_contact_phone ?? '',
        is_active: organization.is_active,
      });
    } else {
      setForm(EMPTY);
    }
  }, [open, organization]);

  const change = <K extends keyof OrganizationFormData>(key: K, value: OrganizationFormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{organization ? 'تعديل المنظمة' : 'إضافة منظمة'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ pt: 0.5 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                size="small" fullWidth required label="الكود" value={form.code}
                onChange={(e) => change('code', e.target.value.toUpperCase())}
                disabled={!!organization}
                helperText="أحرف إنجليزية وأرقام، لا يتغير بعد الإنشاء"
              />
              <TextField
                select size="small" fullWidth required label="النوع"
                value={form.org_type}
                onChange={(e) => change('org_type', e.target.value as OrganizationFormData['org_type'])}
              >
                {ORG_TYPES.map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </TextField>
            </Stack>

            <TextField
              size="small" fullWidth required label="الاسم (إنجليزي)"
              value={form.name_en}
              onChange={(e) => change('name_en', e.target.value)}
              inputProps={{ dir: 'ltr', style: { textAlign: 'left' } }}
            />
            <TextField
              size="small" fullWidth required label="الاسم (عربي)"
              value={form.name_ar}
              onChange={(e) => change('name_ar', e.target.value)}
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select size="small" fullWidth label="الحالة"
                value={form.status}
                onChange={(e) => change('status', e.target.value as OrganizationFormData['status'])}
              >
                {STATUSES.map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </TextField>
              <TextField
                select size="small" fullWidth label="الدولة"
                value={form.country}
                onChange={(e) => change('country', e.target.value)}
              >
                {COUNTRIES.map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </TextField>
            </Stack>

            <TextField
              size="small" fullWidth label="جهة الاتصال"
              value={form.technical_contact_name}
              onChange={(e) => change('technical_contact_name', e.target.value)}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                size="small" fullWidth type="email" label="البريد الإلكتروني"
                value={form.technical_contact_email}
                onChange={(e) => change('technical_contact_email', e.target.value)}
                inputProps={{ dir: 'ltr', style: { textAlign: 'left' } }}
              />
              <TextField
                size="small" fullWidth label="الهاتف"
                value={form.technical_contact_phone}
                onChange={(e) => change('technical_contact_phone', e.target.value)}
                inputProps={{ dir: 'ltr', style: { textAlign: 'left' } }}
              />
            </Stack>
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

export default OrganizationDialog;