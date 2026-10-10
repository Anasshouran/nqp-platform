import { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import { getOrganizations } from '../../../api/endpoints/integration';
import type { ApiEndpoint, ApiEndpointFormData, Organization } from '../../../types/integration';

const PROTOCOLS = ['REST', 'SOAP', 'SFTP', 'OData', 'gRPC'];
const SCOPES = [
  { value: 'DISEASE', label: 'أمراض' },
  { value: 'SURVEILLANCE', label: 'ترصد' },
  { value: 'VACCINATION', label: 'تحصين' },
  { value: 'IHR', label: 'IHR' },
  { value: 'LABORATORY', label: 'مختبر' },
  { value: 'HEALTH_EVENT', label: 'حدث صحي' },
  { value: 'REFERENCE', label: 'بيانات مرجعية' },
];

const EMPTY: ApiEndpointFormData = {
  code: '',
  organization: '',
  name_en: '',
  name_ar: '',
  description: '',
  protocol: 'REST',
  scope: 'REFERENCE',
  base_url: '',
  version: '',
  auth_type: '',
  doc_url: '',
  is_active: true,
};

interface Props {
  open: boolean;
  endpoint: ApiEndpoint | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (data: ApiEndpointFormData) => Promise<void>;
}

const ApiEndpointDialog = ({ open, endpoint, saving, onClose, onSubmit }: Props) => {
  const [form, setForm] = useState<ApiEndpointFormData>(EMPTY);
  const [orgs, setOrgs] = useState<Organization[]>([]);

  useEffect(() => {
    if (!open) return;
    setForm(
      endpoint
        ? {
            code: endpoint.code,
            organization: endpoint.organization,
            name_en: endpoint.name_en,
            name_ar: endpoint.name_ar,
            description: endpoint.description ?? '',
            protocol: endpoint.protocol,
            scope: endpoint.scope,
            base_url: endpoint.base_url,
            version: endpoint.version ?? '',
            auth_type: endpoint.auth_type ?? '',
            doc_url: endpoint.doc_url ?? '',
            is_active: endpoint.is_active,
          }
        : EMPTY,
    );

    getOrganizations({ page_size: 200 })
      .then((res) => setOrgs(res.data?.data?.results ?? []))
      .catch(() => setOrgs([]));
  }, [open, endpoint]);

  const change = <K extends keyof ApiEndpointFormData>(key: K, value: ApiEndpointFormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{endpoint ? 'تعديل نقطة API' : 'إضافة نقطة API'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ pt: 0.5 }}>
            <TextField
              select size="small" fullWidth required label="المنظمة"
              value={form.organization}
              onChange={(e) => change('organization', e.target.value)}
            >
              {orgs.map((o) => (
                <MenuItem key={o.id} value={o.id}>{o.name_ar || o.name_en}</MenuItem>
              ))}
            </TextField>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                size="small" fullWidth required label="الكود"
                value={form.code}
                onChange={(e) => change('code', e.target.value.toUpperCase())}
                disabled={!!endpoint}
              />
              <TextField
                select size="small" fullWidth required label="التصنيف"
                value={form.scope}
                onChange={(e) => change('scope', e.target.value as ApiEndpointFormData['scope'])}
              >
                {SCOPES.map((s) => (
                  <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
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

            <TextField
              size="small" fullWidth required label="الرابط الأساسي"
              value={form.base_url}
              onChange={(e) => change('base_url', e.target.value)}
              inputProps={{ dir: 'ltr', style: { textAlign: 'left' } }}
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select size="small" fullWidth label="البروتوكول"
                value={form.protocol}
                onChange={(e) => change('protocol', e.target.value as ApiEndpointFormData['protocol'])}
              >
                {PROTOCOLS.map((p) => (
                  <MenuItem key={p} value={p}>{p}</MenuItem>
                ))}
              </TextField>
              <TextField
                size="small" fullWidth label="الإصدار"
                value={form.version}
                onChange={(e) => change('version', e.target.value)}
                inputProps={{ dir: 'ltr', style: { textAlign: 'left' } }}
              />
            </Stack>

            <TextField
              size="small" fullWidth label="نوع المصادقة"
              value={form.auth_type}
              onChange={(e) => change('auth_type', e.target.value)}
              inputProps={{ dir: 'ltr', style: { textAlign: 'left' } }}
            />
            <TextField
              size="small" fullWidth multiline minRows={2} label="الوصف"
              value={form.description}
              onChange={(e) => change('description', e.target.value)}
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

export default ApiEndpointDialog;