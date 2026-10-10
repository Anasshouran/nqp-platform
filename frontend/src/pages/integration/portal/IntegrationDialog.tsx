import { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import { getApiEndpoints, getOrganizations } from '../../../api/endpoints/integration';
import type { ApiEndpoint, Integration, IntegrationFormData, Organization } from '../../../types/integration';

const ENVIRONMENTS = [
  { value: 'DEV', label: 'تطويري' },
  { value: 'SANDBOX', label: 'تجريبي' },
  { value: 'PRODUCTION', label: 'إنتاجي' },
];

const STATUSES = [
  { value: 'NOT_CONFIGURED', label: 'غير مُعدّ' },
  { value: 'PENDING', label: 'معلق' },
  { value: 'CONFIGURED', label: 'مُعدّ' },
  { value: 'DISABLED', label: 'معطّل' },
];

const EMPTY: IntegrationFormData = {
  organization: '',
  endpoint: '',
  environment: 'SANDBOX',
  status: 'NOT_CONFIGURED',
  auth_type: '',
  base_url: '',
  notes: '',
  is_active: true,
};

interface Props {
  open: boolean;
  integration: Integration | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (data: IntegrationFormData) => Promise<void>;
}

const IntegrationDialog = ({ open, integration, saving, onClose, onSubmit }: Props) => {
  const [form, setForm] = useState<IntegrationFormData>(EMPTY);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      integration
        ? {
            organization: integration.organization,
            endpoint: integration.endpoint,
            environment: integration.environment,
            status: integration.status,
            auth_type: integration.auth_type ?? '',
            base_url: integration.base_url ?? '',
            notes: integration.notes ?? '',
            is_active: integration.is_active,
          }
        : EMPTY,
    );
  }, [open, integration]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoadingRefs(true);

    Promise.all([
      getOrganizations({ page_size: 200 }),
      getApiEndpoints({ page_size: 200 }),
    ])
      .then(([orgRes, epRes]) => {
        if (!active) return;
        setOrgs(orgRes.data?.data?.results ?? []);
        setEndpoints(epRes.data?.data?.results ?? []);
      })
      .finally(() => { if (active) setLoadingRefs(false); });

    return () => { active = false; };
  }, [open]);

  const change = <K extends keyof IntegrationFormData>(key: K, value: IntegrationFormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{integration ? 'تعديل التكامل' : 'إضافة تكامل'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ pt: 0.5 }}>
            <TextField
              select size="small" fullWidth required label="المنظمة"
              value={form.organization}
              onChange={(e) => change('organization', e.target.value)}
              helperText={loadingRefs ? 'جارٍ التحميل...' : undefined}
              disabled={!!integration}
            >
              {orgs.map((o) => (
                <MenuItem key={o.id} value={o.id}>{o.name_ar || o.name_en}</MenuItem>
              ))}
            </TextField>

            <TextField
              select size="small" fullWidth required label="نقطة API"
              value={form.endpoint}
              onChange={(e) => change('endpoint', e.target.value)}
              helperText={loadingRefs ? 'جارٍ التحميل...' : undefined}
            >
              {endpoints
                .filter((ep) => !form.organization || ep.organization === form.organization)
                .map((ep) => (
                  <MenuItem key={ep.id} value={ep.id}>{ep.name_ar || ep.name_en}</MenuItem>
                ))}
            </TextField>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select size="small" fullWidth label="البيئة"
                value={form.environment}
                onChange={(e) => change('environment', e.target.value as IntegrationFormData['environment'])}
              >
                {ENVIRONMENTS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </TextField>
              <TextField
                select size="small" fullWidth label="الحالة"
                value={form.status}
                onChange={(e) => change('status', e.target.value as IntegrationFormData['status'])}
              >
                {STATUSES.map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </TextField>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                size="small" fullWidth label="نوع المصادقة"
                value={form.auth_type}
                onChange={(e) => change('auth_type', e.target.value)}
                placeholder="OAuth2 / mTLS / API Key"
                inputProps={{ dir: 'ltr', style: { textAlign: 'left' } }}
              />
              <TextField
                size="small" fullWidth label="الرابط الأساسي"
                value={form.base_url}
                onChange={(e) => change('base_url', e.target.value)}
                inputProps={{ dir: 'ltr', style: { textAlign: 'left' } }}
              />
            </Stack>

            <TextField
              size="small" fullWidth multiline minRows={2} label="ملاحظات"
              value={form.notes}
              onChange={(e) => change('notes', e.target.value)}
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

export default IntegrationDialog;