import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import { getService, type Service } from '../../api/endpoints/services';
import { PageHeader, ListSkeleton } from '../../components/common';
import { iconFor } from '../../utils/iconMap';
import ServiceAuthGate from '../../components/services/ServiceAuthGate';

const audienceLabels: Record<string, string> = {
  PUBLIC: 'عام',
  INDIVIDUAL: 'الأفراد',
  BUSINESS: 'الأعمال',
  GOVERNMENT: 'الجهات الحكومية',
  EMPLOYEE: 'الموظفون',
};

const identityLabels: Record<string, string> = {
  NONE: 'لا يتطلب هوية',
  CREDENTIALS: 'اسم مستخدم وكلمة مرور',
};

const destinationFor = (service: Service, currentPath: string): { href: string; external?: boolean } => {
  if (service.external_url) return { href: service.external_url, external: true };

  const contentDestinations: Record<string, string> = {
    'vector-info': '/services/vector-control',
    'vector-guidelines': '/services/vector-control/guidelines',
    'vector-alerts': '/services/vector-control/alerts',
    'vector-general': '/services/vector-control/info',
  };
  if (contentDestinations[service.code]) return { href: contentDestinations[service.code] };

  const route = service.route || '/services';
  if (route === currentPath) return { href: '/services/tools' };
  return { href: route };
};

/**
 * صفحة تفصيلية عامة لأي خدمة في كتالوج الخدمات.
 * تجلب بيانات الخدمة من النهاية الخلفية حسب الكود وتقدّم معلوماتها وزر الانتقال إلى النظام التشغيلي.
 */
const ServicePage = ({ serviceCode }: { serviceCode: string }) => {
  const location = useLocation();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getService(serviceCode)
      .then((res) => setService(res.data.data))
      .catch(() => setError('تعذّر تحميل بيانات الخدمة.'))
      .finally(() => setLoading(false));
  }, [serviceCode]);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 5 }}>
        <ListSkeleton count={3} />
      </Container>
    );
  }

  if (error || !service) {
    return (
      <Container maxWidth="lg" sx={{ py: 5 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'الخدمة غير موجودة.'}
        </Alert>
        <Button component={Link} to="/services" startIcon={<ArrowBackIcon />} sx={{ textTransform: 'none' }}>
          العودة إلى الخدمات
        </Button>
      </Container>
    );
  }

  const Icon = iconFor(service.icon);
  const dest = destinationFor(service, location.pathname);

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          الرئيسية
        </Link>
        <Link to="/services" style={{ textDecoration: 'none', color: 'inherit' }}>
          الخدمات
        </Link>
        <Typography color="text.primary">{service.name_ar}</Typography>
      </Breadcrumbs>

      <PageHeader
        title={service.name_ar}
        subtitle={service.description_ar || ''}
        eyebrow={service.category_code}
      />

      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4 }}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ md: 'center' }}>
            <Box
              sx={{
                width: 74,
                height: 74,
                borderRadius: 4,
                display: 'grid',
                placeItems: 'center',
                background: 'linear-gradient(135deg,#0c7f6a,#0a6b58)',
                color: '#fff',
                boxShadow: '0 14px 30px rgba(14,138,114,.3)',
                flexShrink: 0,
              }}
            >
              <Icon sx={{ fontSize: 40 }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                {service.name_ar}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                {service.description_ar}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
                <Chip label={audienceLabels[service.audience] || 'عام'} size="small" />
                <Chip
                  icon={service.requires_auth ? <LockOutlinedIcon /> : <VerifiedUserIcon />}
                  label={service.requires_auth ? (identityLabels[service.identity_provider] || 'يتطلب تسجيل الدخول') : 'خدمة عامة'}
                  size="small"
                  color={service.requires_auth ? 'primary' : 'success'}
                  variant="outlined"
                />
                {service.target_system && (
                  <Chip label={`النظام: ${service.target_system}`} size="small" variant="outlined" />
                )}
              </Stack>
            </Box>
          </Stack>

          <Divider sx={{ my: 3 }} />

          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 2 }}>
            تُنفَّذ هذه الخدمة داخل النظام التشغيلي المتخصص للحجر الصحي القومي. البيانات التي تراها هنا هي وصف
            للخدمة؛ تبدأ الإجراءات الفعلية بالضغط على الزر أدناه.
          </Typography>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 3 }}>
            <ServiceAuthGate service={service} returnRoute={service.route || location.pathname}>
              <Button
                variant="contained"
                size="large"
                component="a"
                href={dest.href}
                {...(dest.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                startIcon={service.requires_auth ? <VerifiedUserIcon /> : undefined}
                sx={{ py: 1.2, px: 4, textTransform: 'none', fontWeight: 700 }}
              >
                {service.requires_auth ? `ابدأ الخدمة (${identityLabels[service.identity_provider]})` : 'الانتقال إلى الخدمة'}
              </Button>
            </ServiceAuthGate>
            <Button component={Link} to="/services" startIcon={<ArrowBackIcon />} size="large" sx={{ textTransform: 'none' }}>
              جميع الخدمات
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
};

export default ServicePage;
