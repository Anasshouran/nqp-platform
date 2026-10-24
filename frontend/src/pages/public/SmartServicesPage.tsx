import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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


const SmartServicesPage = () => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');

  const serviceGroups: ServiceGroup[] = useMemo(
    () => (
      [
        {
          label: t('public.الأفراد والمسافرون'),
          icon: '👤',
          services: [
            { title: t('public.السفر'), desc: t('public.متطلبات السفر والإجراءات الصحية للدخول والخروج'), emoji: '✈️', to: '/travel-requirements' },
            { title: t('public.التطعيم الدولي'), desc: t('public.التسجيل للتطعيم واستخراج الشهادات الدولية'), emoji: '💉', to: '/app/vaccination' },
            { title: t('public.الشهادة الصحية'), desc: t('public.التحقق من صحة الشهادات الصحية الدولية'), emoji: '📜', to: '/verify' },
            { title: t('public.التحقق من الوثيقة'), desc: t('public.التحقق من صحة رموز QR والوثائق الصادرة عن المنصة'), emoji: '🔍', to: '/verify' },
          ],
        },
        {
          label: t('public.الشركات'),
          icon: '🏢',
          services: [
            { title: t('public.رقابة الأغذية'), desc: t('public.تصاريح استيراد الأغذية ومراقبة شحناتها في المنافذ'), emoji: '📦', to: '/services/food-safety' },
            { title: t('public.الاستيراد والتصدير'), desc: t('public.إجراءات الاستيراد والتصدير والإفراج عن الشحنات'), emoji: '🚢', to: '/services/food-safety' },
          ],
        },
        {
          label: t('public.الجهات الحكومية والمنظمات'),
          icon: '🏛️',
          services: [
            { title: t('public.الخدمات المؤسسية'), desc: t('public.خدمات مشتركة للجهات الحكومية العاملة في نقاط الدخول'), emoji: '📋', to: '/services' },
            { title: t('public.التكامل الإلكتروني'), desc: t('public.ربط الأنظمة وتبادل البيانات مع المنصة والمنظمات'), emoji: '🔗', to: '/partners' },
          ],
        },
      ]),
    [t],
  );

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
  }, [query, serviceGroups, t]);

  const totalServices = useMemo(
    () => serviceGroups.reduce((acc, g) => acc + g.services.length, 0),
    [serviceGroups]
  );

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <PageHeader
        title={t('public.الخدمات الذكية')}
        subtitle={t('public.خدمات رقمية من منصة عافيتنا')}
        eyebrow={t('public.بوابة الخدمات')}
      />

      <TextField
        fullWidth
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('public.ابحث عن خدمة')}
        aria-label={t('public.ابحث عن خدمة 2')}
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
              {t('public.لا توجد خدمات مطابقة')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('public.جرّب كلمات أخرى مثل «السفر» أو «الأغذية» أو «التحقق»')}</Typography>
          </Box>
        )}

        {groups.map((group) => (
          <Box key={group.label}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
              <Typography sx={{ fontSize: 22, lineHeight: 1 }} aria-hidden>
                {group.icon}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
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
                      <Typography variant="body1" sx={{ fontWeight: 700 }}>
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
          {t('public.لأكثر من')} {totalServices} {t('public.خدمة، يمكنك زيارة')} <b>{t('public.كتالوج الخدمات')}</b> {t('public.أو')}<b>{t('public.اتصل بنا')}</b>.
        </Typography>
      </Stack>
    </Container>
  );
};

export default SmartServicesPage;