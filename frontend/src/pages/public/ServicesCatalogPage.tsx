import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import SearchIcon from '@mui/icons-material/Search';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import {
  getServiceCategories,
  type Service,
  type ServiceCategory,
} from '../../api/endpoints/services';
import { PageHeader, ListSkeleton, EmptyState } from '../../components/common';
import { iconFor } from '../../utils/iconMap';

const audienceLabels: Record<string, string> = {
  PUBLIC: 'عام',
  INDIVIDUAL: 'الأفراد',
  BUSINESS: 'الأعمال',
  GOVERNMENT: 'الجهات الحكومية',
  EMPLOYEE: 'الموظفون',
};

const filterChips = [
  { key: 'all', label: 'الكل' },
  { key: 'INDIVIDUAL', label: 'المسافرون' },
  { key: 'BUSINESS', label: 'الأعمال' },
  { key: 'GOVERNMENT', label: 'الحكومة' },
  { key: 'PUBLIC', label: 'الصحة والتحقق' },
];

const ServiceCard = ({ service }: { service: Service }) => {
  const Icon = iconFor(service.icon);
  const href = service.external_url || service.route || '/services';
  const isExternal = Boolean(service.external_url);

  const cardSx = {
    border: '1px solid' as const,
    borderColor: 'divider' as const,
    borderRadius: 2.5,
    height: '100%',
    display: 'flex' as const,
    flexDirection: 'column' as const,
    textDecoration: 'none' as const,
    color: 'inherit' as const,
    transition: 'all .2s',
    '&:hover': {
      borderColor: 'primary.main',
      boxShadow: '0 8px 24px rgba(14,138,114,.14)',
      transform: 'translateY(-2px)',
    },
    position: 'relative' as const,
  };

  const content = (
    <>
      {service.requires_auth && (
        <Box
          sx={{
            position: 'absolute',
            top: 10,
            insetInlineEnd: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            color: 'success.main',
          }}
          title="يتطلب هوية موثقة"
        >
          <VerifiedUserIcon sx={{ fontSize: 15 }} />
        </Box>
      )}
      <CardContent sx={{ p: 1.8, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 0.75 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              background: 'linear-gradient(135deg,#0c7f6a,#0a6b58)',
              color: '#fff',
              flexShrink: 0,
            }}
          >
            <Icon sx={{ fontSize: 20 }} />
          </Box>
          <Typography variant="body1" sx={{ fontWeight: 700, lineHeight: 1.3, fontSize: '0.92rem' }}>
            {service.name_ar}
          </Typography>
        </Stack>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            flex: 1,
            fontSize: '0.78rem',
            lineHeight: 1.6,
            mb: 1.25,
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 2,
            overflow: 'hidden',
          }}
        >
          {service.description_ar}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Chip
            label={audienceLabels[service.audience] || 'عام'}
            size="small"
            variant="outlined"
            sx={{ height: 22, fontSize: '0.68rem', fontWeight: 700 }}
          />
          {service.requires_auth ? (
            <LockOutlinedIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
          ) : (
            <ArrowForwardIcon sx={{ fontSize: 17, color: 'primary.main' }} />
          )}
        </Stack>
      </CardContent>
    </>
  );

  return isExternal ? (
    <Card component="a" href={href} target="_blank" rel="noopener noreferrer" elevation={0} sx={cardSx}>
      {content}
    </Card>
  ) : (
    <Card component={Link} to={href} elevation={0} sx={cardSx}>
      {content}
    </Card>
  );
};

const ServicesCatalogPage = () => {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    getServiceCategories()
      .then((res) => setCategories(res.data.data))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return categories
      .map((cat) => ({
        ...cat,
        services: cat.services.filter((s) => {
          const inFilter = filter === 'all' || s.audience === filter;
          const inSearch =
            !term ||
            s.name_ar.toLowerCase().includes(term) ||
            (s.name_en || '').toLowerCase().includes(term) ||
            (s.description_ar || '').toLowerCase().includes(term);
          return inFilter && inSearch;
        }),
      }))
      .filter((cat) => cat.services.length > 0);
  }, [categories, search, filter]);

  const allServices = useMemo(
    () => filtered.flatMap((cat) => cat.services),
    [filtered],
  );

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <PageHeader
        title="جميع الخدمات"
        subtitle="جميع الخدمات الإلكترونية التي تقدمها المنصة للمسافرين والشركاء والجهات الصحية"
        eyebrow="بوابة الخدمات"
      />

      {/* Search + filters */}
      <Stack spacing={2} sx={{ mb: 4 }}>
        <TextField
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث عن خدمة... (التسجيل المسبق، فحص شحنة، التحقق من شهادة)"
          aria-label="بحث عن خدمة"
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{
            maxWidth: 560,
            mx: 'auto',
            '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'background.paper' },
          }}
        />
        <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center" useFlexGap>
          {filterChips.map((chip) => (
            <Chip
              key={chip.key}
              label={chip.label}
              onClick={() => setFilter(chip.key)}
              color={filter === chip.key ? 'primary' : 'default'}
              variant={filter === chip.key ? 'filled' : 'outlined'}
              sx={{ fontWeight: 700, px: 1 }}
            />
          ))}
        </Stack>
      </Stack>

      {loading ? (
        <ListSkeleton count={6} />
      ) : allServices.length === 0 ? (
        <EmptyState
          icon={<SearchIcon />}
          title="لا توجد خدمات مطابقة"
          description="جرّب تعديل كلمة البحث أو اختيار فئة أخرى."
        />
      ) : (
        <Grid container spacing={2}>
          {allServices.map((service) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={service.id}>
              <ServiceCard service={service} />
            </Grid>
          ))}
        </Grid>
      )}

      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Button variant="outlined" component={Link} to="/contact" sx={{ textTransform: 'none' }}>
          لم تجد ما تبحث عنه؟ تواصل معنا
        </Button>
      </Box>
    </Container>
  );
};

export default ServicesCatalogPage;
