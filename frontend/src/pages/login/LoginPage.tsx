import { Link, useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import LoginForm from '../../components/forms/LoginForm';
import BrandLogo from '../../components/common/BrandLogo';

const highlights = [
  'مراقبة وبائية على مدار الساعة',
  'إدارة متكاملة لمنافذ الدخول',
  'تقارير فورية للجهات الرسمية',
];

const LoginPage = () => {
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next');

  return (
  <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
    <Box sx={{ bgcolor: 'primary.darker' }}>
      <Container maxWidth="lg">
        <Box sx={{ py: 1.5 }}>
          <BrandLogo light compact product="afyatna" />
        </Box>
      </Container>
    </Box>

    <Box
      sx={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: { xs: 4, md: 6 },
        background:
          'radial-gradient(900px 400px at 80% -10%, rgba(14,138,114,0.12), transparent 60%), linear-gradient(180deg, #f6f9f8, #eaf3f0)',
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' }, gap: { xs: 4, md: 6 }, alignItems: 'center' }}>
          {/* Brand side */}
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <Box
              sx={{
                width: 76,
                height: 76,
                borderRadius: 4,
                display: 'grid',
                placeItems: 'center',
                background: 'linear-gradient(135deg, #0e8a72, #0a6b58)',
                color: '#fff',
                boxShadow: '0 14px 30px rgba(14,138,114,0.35)',
                mb: 3,
              }}
            >
              <HealthAndSafetyIcon sx={{ fontSize: 42 }} />
            </Box>
            <Typography variant="h1" sx={{ mb: 2, maxWidth: 520 }}>
              منصة الحجر الصحي القومي
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 2, maxWidth: 500 }}>
              نظام موحّد لموظفي الإدارة الاتحادية للحجر الصحي لإدارة منافذ الدخول،
              الفحص الصحي، الرصد الوبائي، وغرفة العمليات الطارئة.
            </Typography>
            <Stack spacing={1.5}>
              {highlights.map((item) => (
                <Stack key={item} direction="row" spacing={1.5} alignItems="center">
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      bgcolor: 'secondary.main',
                      flexShrink: 0,
                    }}
                  />
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {item}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Box>

          {/* Form card */}
          <Card
            sx={{
              maxWidth: 440,
              width: '100%',
              justifySelf: { md: 'end' },
              borderRadius: 4,
              border: '1px solid rgba(16,40,34,0.08)',
              bgcolor: 'rgba(255,255,255,0.86)',
              backdropFilter: 'blur(20px) saturate(1.4)',
              boxShadow: '0 4px 12px rgba(16,40,34,0.06), 0 24px 60px rgba(16,40,34,0.14)',
            }}
          >
            <CardContent sx={{ p: { xs: 3.5, md: 4.5 } }}>
              <Typography variant="h3" sx={{ mb: 0.5 }}>
                تسجيل الدخول
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                الدخول للموظفين والجهات المعتمدة فقط
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {next ? <LoginForm redirectPath={next} /> : <LoginForm />}
            </CardContent>
          </Card>
        </Box>
      </Container>
    </Box>

    <Box sx={{ bgcolor: 'grey.900', color: 'grey.400' }}>
      <Container maxWidth="lg">
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 2 }}>
          <Typography variant="caption">
            © {new Date().getFullYear()} الإدارة الاتحادية للحجر الصحي
          </Typography>
          <Link
            to="/"
            style={{ color: 'inherit', textDecoration: 'none', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <ArrowBackIcon sx={{ fontSize: 15 }} />
            العودة إلى الموقع العام
          </Link>
        </Stack>
      </Container>
    </Box>
  </Box>
  );
};

export default LoginPage;
