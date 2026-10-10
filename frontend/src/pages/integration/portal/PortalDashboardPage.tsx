import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PeopleIcon from '@mui/icons-material/People';
import SyncIcon from '@mui/icons-material/Sync';
import LinkIcon from '@mui/icons-material/Link';
import ListAltIcon from '@mui/icons-material/ListAlt';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import WebhookIcon from '@mui/icons-material/Webhook';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import DescriptionIcon from '@mui/icons-material/Description';
import { PageHeader, StatCard } from '../../../components/common';
import {
  getApiEndpoints,
  getAuditLogs,
  getCredentials,
  getDataScopes,
  getIntegrations,
  getIntegrationHealthRecords,
  getOrganizations,
  getWebhookSubscriptions,
} from '../../../api/endpoints/integration';
import { notifyError } from '../../../utils/toast';

type CountFetcher = (params: Record<string, unknown>) => Promise<{
  data: { data?: { count?: number } };
}>;

const RESOURCES = [
  { key: 'organizations', label: 'المنظمات', to: '/app/integration/portal/organizations', icon: <PeopleIcon /> },
  { key: 'integrations', label: 'التكاملات', to: '/app/integration/portal/integrations', icon: <SyncIcon /> },
  { key: 'apiEndpoints', label: 'كتالوج API', to: '/app/integration/portal/api-catalog', icon: <LinkIcon /> },
  { key: 'dataScopes', label: 'نطاقات البيانات', to: '/app/integration/portal/data-scopes', icon: <ListAltIcon /> },
  { key: 'credentials', label: 'بيانات الاعتماد', to: '/app/integration/portal/credentials', icon: <VpnKeyIcon /> },
  { key: 'webhooks', label: 'الويب هوك', to: '/app/integration/portal/webhooks', icon: <WebhookIcon /> },
  { key: 'health', label: 'سجلات الصحة', to: '/app/integration/portal/health', icon: <HealthAndSafetyIcon /> },
  { key: 'auditLogs', label: 'سجلات المراجعة', to: '/app/integration/portal/audit-logs', icon: <DescriptionIcon /> },
];

const FETCHERS: Record<string, CountFetcher> = {
  organizations: getOrganizations,
  integrations: getIntegrations,
  apiEndpoints: getApiEndpoints,
  dataScopes: getDataScopes,
  credentials: getCredentials,
  webhooks: getWebhookSubscriptions,
  health: getIntegrationHealthRecords,
  auditLogs: getAuditLogs,
};

const PortalDashboardPage = () => {
  const navigate = useNavigate();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const entries = await Promise.all(
        RESOURCES.map(async ({ key }) => {
          try {
            const res = await FETCHERS[key]({ page_size: 1 });
            return [key, res.data?.data?.count ?? 0] as const;
          } catch {
            return [key, 0] as const;
          }
        }),
      );
      if (active) setCounts(Object.fromEntries(entries));
    };

    load()
      .catch(() => notifyError('تعذّر تحميل ملخص البوابة'))
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, []);

  return (
    <Box>
      <PageHeader
        title="بوابة تكامل المنظمات"
        subtitle="المنظمات الشريكة، التكاملات، كتالوج API، النطاقات، والاعتمادات"
      />

      {loading && <LinearProgress sx={{ mb: 3 }} />}

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            lg: 'repeat(4, 1fr)',
          },
          mb: 3.5,
        }}
      >
        {RESOURCES.map(({ key, label, icon }) => (
          <StatCard
            key={key}
            label={label}
            value={loading ? '—' : counts[key] ?? 0}
            icon={icon}
            onClick={() => navigate(`/app/integration/portal/${key === 'apiEndpoints' ? 'api-catalog' : key === 'auditLogs' ? 'audit-logs' : key}`)}
          />
        ))}
      </Box>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
            الوصول السريع
          </Typography>
          <Stack spacing={0.5}>
            {RESOURCES.map(({ label, to, icon }) => (
              <Stack
                key={to}
                direction="row"
                spacing={1}
                alignItems="center"
                onClick={() => navigate(to)}
                sx={{
                  cursor: 'pointer', py: 1, px: 1, borderRadius: 1,
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                {icon}
                <Typography variant="body2" sx={{ flexGrow: 1 }}>{label}</Typography>
                <ArrowForwardIcon fontSize="small" color="disabled" />
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default PortalDashboardPage;