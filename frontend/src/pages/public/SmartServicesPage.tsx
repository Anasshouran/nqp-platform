import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../components/common';

interface SmartService {
  title: string;
  desc: string;
  emoji: string;
  to: string;
}

interface ServiceGroup {
  label: string;
  icon: string;
  services: SmartService[];
}

const serviceGroups: ServiceGroup[] = [
  {
    label: 'الأفراد والمسافرون',
    icon: '👤',
    services: [
      { title: 'السفر', desc: 'متطلبات السفر والإجراءات الصحية للدخول والخروج', emoji: '✈️', to: '/travel-requirements' },
      { title: 'التطعيم الدولي', desc: 'التسجيل للتطعيم واستخراج الشهادات الدولية', emoji: '💉', to: '/app/vaccination' },
      { title: 'الشهادة الصحية', desc: 'التحقق من صحة الشهادات الصحية الدولية', emoji: '📜', to: '/verify' },
      { title: 'التحقق من الوثيقة', desc: 'التحقق من صحة رموز QR والوثائق الصادرة عن المنصة', emoji: '🔍', to: '/verify' },
    ],
  },
  {
    label: 'الشركات',
    icon: '🏢',
    services: [
      { title: 'رقابة الأغذية', desc: 'تصاريح استيراد الأغذية ومراقبة شحناتها في المنافذ', emoji: '📦', to: '/services/food-safety' },
      { title: 'الاستيراد والتصدير', desc: 'إجراءات الاستيراد والتصدير والإفراج عن الشحنات', emoji: '🚢', to: '/services/food-safety' },
    ],
  },
  {
    label: 'الجهات الحكومية والمنظمات',
    icon: '🏛️',
    services: [
      { title: 'الخدمات المؤسسية', desc: 'خدمات مشتركة للجهات الحكومية العاملة في نقاط الدخول', emoji: '📋', to: '/services' },
      { title: 'التكامل الإلكتروني', desc: 'ربط الأنظمة وتبادل البيانات مع المنصة والمنظمات', emoji: '🔗', to: '/partners' },
    ],
  },
];

const SmartServicesPage = () => {
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return serviceGroups;
    return serviceGroups
      .map((group) => ({
        ...group,
        services: group.services.filter((s) =>
          `${s.title} ${s.desc} ${group.label}`.toLowerCase().includes(q)
        ),
      }))
      .filter((group) => group.services.length > 0);
  }, [query]);

  const totalServices = useMemo(
    () => serviceGroups.reduce((acc, g) => acc + g.services.length, 0),
    []
  );

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <PageHeader
        title="الخدمات الذكية"
        subtitle="خدمات رقمية من منصة عافيتنا"
        eyebrow="بوابة الخدمات"
      />

      <TextField
        fullWidth
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="ابحث عن خدمة..."
        aria-label="ابحث عن خدمة"
        sx={{ maxWidth: 560, mb: 5, mx: 'auto', display: 'flex' }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" />
            </InputAdornment>
          ),
        }}
      />

      <Stack spacing={6}>
        {groups.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography sx={{ fontSize: 36, mb: 1 }} aria-hidden>
              🔎
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
              لا توجد خدمات مطابقة
            </Typography>
            <Typography variant="body2" color="text.secondary">
              جرّب كلمات أخرى مثل «السفر» أو «الأغذية» أو «التحقق».
            </Typography>
          </Box>
        )}

        {groups.map((group) => (
          <Box key={group.label}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
              <Typography sx={{ fontSize: 22, lineHeight: 1 }} aria-hidden>
                {group.icon}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                {group.label}
              </Typography>
              <Chip label={group.services.length} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
            </Stack>

            <Grid container spacing={{ xs: 2, sm: 2.5 }}>
              {group.services.map((service) => (
                <Grid item xs={12} sm={6} key={service.title}>
                  <Card
                    component={Link}
                    to={service.to}
                    className="fade-up"
                    sx={{
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      p: 2.5,
                      borderRadius: 3,
                      textDecoration: 'none',
                      color: 'inherit',
                      border: '1px solid',
                      borderColor: 'divider',
                      '&:hover': { borderColor: 'primary.main' },
                    }}
                  >
                    <Box
                      aria-hidden
                      sx={{
                        width: 52,
                        height: 52,
                        borderRadius: 2.5,
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 26,
                        flexShrink: 0,
                        bgcolor: 'rgba(12,127,106,0.08)',
                        border: '1px solid rgba(12,127,106,0.16)',
                      }}
                    >
                      {service.emoji}
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 800 }}>
                        {service.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                        {service.desc}
                      </Typography>
                    </Box>
                    <ArrowBackIcon sx={{ color: 'primary.main', flexShrink: 0 }} />
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        ))}
      </Stack>

      <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ mt: 6 }}>
        <Typography variant="body2" color="text.secondary">
          لأكثر من {totalServices} خدمة، يمكنك زيارة <b>كتالوج الخدمات</b> أو <b>اتصل بنا</b>.
        </Typography>
      </Stack>
    </Container>
  );
};

export default SmartServicesPage;