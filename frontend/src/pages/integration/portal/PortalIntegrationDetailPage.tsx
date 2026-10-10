import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { PageHeader } from '../../../components/common';
import {
  getIntegration,
  getIntegrationHealthRecords,
  getCredentials,
} from '../../../api/endpoints/integration';
import type { Credential, Integration, IntegrationHealth } from '../../../types/integration';
import { formatDateTime } from '../../../utils/formatters';
import { notifyError } from '../../../utils/toast';

const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ py: 1 }}>
    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 150 }}>{label}</Typography>
    <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>{value ?? '—'}</Typography>
  </Stack>
);

const PortalIntegrationDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [health, setHealth] = useState<IntegrationHealth[]>([]);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    setError(null);

    getIntegration(id)
      .then((res) => { if (active) setIntegration(res.data?.data ?? null); })
      .catch(() => { if (active) { setError('تعذّر تحميل بيانات التكامل'); notifyError('تعذّر تحميل بيانات التكامل'); } })
      .finally(() => { if (active) setLoading(false); });

    getIntegrationHealthRecords({ integration: id, page_size: 10 })
      .then((res) => { if (active) setHealth(res.data?.data?.results ?? []); })
      .catch(() => undefined);

    getCredentials({ integration: id, page_size: 50 })
      .then((res) => { if (active) setCredentials(res.data?.data?.results ?? []); })
      .catch(() => undefined);

    return () => { active = false; };
  }, [id]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;
  }

  if (error || !integration) {
    return (
      <Box>
        <PageHeader title="تفاصيل التكامل" />
        <Alert severity="error">{error ?? 'التكامل غير موجود'}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title={`${integration.organization_name} / ${integration.endpoint_code}`}
        subtitle={integration.endpoint_name}
action={
    <Chip label={integration.status} size="small" />
  }
/>

      <Stack spacing={2.5}>
        <Card>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>الإعدادات</Typography>
            <Divider sx={{ mb: 1 }} />
            <DetailRow label="المنظمة" value={integration.organization_name} />
            <DetailRow label="نقطة الـAPI" value={integration.endpoint_code} />
            <DetailRow label="البيئة" value={integration.environment} />
            <DetailRow label="نوع المصادقة" value={integration.auth_type || '—'} />
            <DetailRow label="الرابط" value={integration.base_url || '—'} />
            <DetailRow label="آخر توثيق" value={integration.verified_at ? formatDateTime(integration.verified_at) : '—'} />
            <DetailRow label="ملاحظات" value={integration.notes || '—'} />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>بيانات الاعتماد</Typography>
            <Alert severity="info" sx={{ mb: 1.5 }}>
              القيم مشفّرة ولا تُعرض. يمكن تدويرها من شاشة «بيانات الاعتماد».
            </Alert>
            {credentials.length === 0 ? (
              <Typography variant="body2" color="text.secondary">لا توجد اعتمادات مسجلة.</Typography>
            ) : (
              <Stack spacing={1}>
                {credentials.map((c) => (
                  <Stack key={c.id} direction="row" spacing={1} alignItems="center">
                    <Chip size="small" label={c.key_type} />
                    <Typography variant="body2">{c.key_name}</Typography>
                  </Stack>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>سجلات الصحة</Typography>
            {health.length === 0 ? (
              <Typography variant="body2" color="text.secondary">لا توجد فحوصات مسجلة بعد.</Typography>
            ) : (
              <Stack spacing={1}>
                {health.map((h) => (
                  <Stack key={h.id} direction="row" spacing={1} alignItems="center">
                    <Chip size="small" color={h.passed ? 'success' : 'error'} label={h.passed ? 'ناجح' : 'فاشل'} />
                    <Typography variant="body2">{h.check_type}</Typography>
                    <Typography variant="caption" color="text.secondary">{formatDateTime(h.checked_at)}</Typography>
                  </Stack>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>

        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/app/integration/portal/integrations')}>
          رجوع للتكاملات
        </Button>
      </Stack>
    </Box>
  );
};

export default PortalIntegrationDetailPage;