import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Typography from '@mui/material/Typography';
import SearchIcon from '@mui/icons-material/Search';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import LockIcon from '@mui/icons-material/Lock';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import FlightIcon from '@mui/icons-material/Flight';
import InventoryIcon from '@mui/icons-material/Inventory';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import BugReportIcon from '@mui/icons-material/BugReport';
import ScienceIcon from '@mui/icons-material/Science';
import GroupsIcon from '@mui/icons-material/Groups';
import DomainIcon from '@mui/icons-material/Domain';
import VerifiedIcon from '@mui/icons-material/Verified';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { useSectorPortal } from '../../components/sectors/SectorPortalLayout';
import { EmptyState } from '../../components/common';
import { getServiceCategories } from '../../api/endpoints/services';
import type { Service, ServiceCategory } from '../../api/endpoints/services';
import { iconFor } from '../../utils/iconMap';

const audienceLabels: Record<string, string> = {
  PUBLIC: 'عام', INDIVIDUAL: 'أفراد', BUSINESS: 'شركات', GOVERNMENT: 'حكومي', EMPLOYEE: 'موظفون',
};

const audienceFilters = [
  { value: 'ALL', label: 'الكل' },
  { value: 'PUBLIC', label: 'عام' },
  { value: 'INDIVIDUAL', label: 'أفراد' },
  { value: 'BUSINESS', label: 'شركات' },
  { value: 'GOVERNMENT', label: 'حكومي' },
];

const categoryIcons: Record<string, React.ReactNode> = {
  travelers: <FlightIcon />,
  'food-safety': <InventoryIcon />,
  carriers: <FlightIcon />,
  'poe-health': <HealthAndSafetyIcon />,
  'vector-control': <BugReportIcon />,
  surveillance: <HealthAndSafetyIcon />,
  laboratory: <ScienceIcon />,
  government: <DomainIcon />,
  public: <VerifiedIcon />,
  assistant: <SmartToyIcon />,
};

const SectorPortalServices = () => {
  const { sector } = useSectorPortal();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [audienceFilter, setAudienceFilter] = useState('ALL');

  useEffect(() => {
    setLoading(true);
    getServiceCategories()
      .then((res) => {
        const cats = (res.data.data ?? []).filter((c) => c.is_active);
        setCategories(cats);
      })
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    return categories
      .map((cat) => {
        const filteredServices = cat.services.filter((s) => {
          if (!s.is_active || s.status !== 'ACTIVE') return false;
          if (audienceFilter !== 'ALL' && s.audience !== audienceFilter) return false;
          if (q) {
            return (
              s.name_ar.toLowerCase().includes(q) ||
              (s.name_en || '').toLowerCase().includes(q) ||
              (s.description_ar || '').toLowerCase().includes(q) ||
              cat.name_ar.toLowerCase().includes(q)
            );
          }
          return true;
        });
        return { ...cat, services: filteredServices };
      })
      .filter((cat) => cat.services.length > 0);
  }, [categories, search, audienceFilter]);

  const totalServices = filteredCategories.reduce((sum, cat) => sum + cat.services.length, 0);

  if (loading) {
    return (
      <Box>
        <Skeleton variant="rounded" height={60} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={40} sx={{ mb: 3 }} />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rounded" height={120} sx={{ mb: 2 }} />
        ))}
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        الخدمات الإلكترونية
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
        جميع الخدمات المتاحة عبر المنصة الإلكترونية لـ{sector?.name_ar || 'القطاع'}
      </Typography>
      <Typography variant="body2" color="primary" sx={{ fontWeight: 700, mb: 3 }}>
        {totalServices} خدمة متاحة
      </Typography>

      {/* Search + Filters */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 4 }}>
        <TextField
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث عن خدمة بالاسم أو الوصف..."
          size="small"
          sx={{ flex: 1, maxWidth: { sm: 400 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {audienceFilters.map((f) => (
            <Chip
              key={f.value}
              label={f.label}
              onClick={() => setAudienceFilter(f.value)}
              color={audienceFilter === f.value ? 'primary' : 'default'}
              variant={audienceFilter === f.value ? 'filled' : 'outlined'}
              sx={{ fontWeight: 700 }}
            />
          ))}
        </Stack>
      </Stack>

      {/* Results */}
      {filteredCategories.length === 0 ? (
        <EmptyState
          icon={<WorkspacePremiumIcon />}
          title="لا توجد خدمات مطابقة"
          description="جرّب تغيير كلمة البحث أو فئة الجمهور."
        />
      ) : (
        <Stack spacing={5}>
          {filteredCategories.map((category) => (
            <Box key={category.id}>
              {/* Category Header */}
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    display: 'grid',
                    placeItems: 'center',
                    color: 'primary.main',
                    bgcolor: 'primary.light',
                  }}
                >
                  {categoryIcons[category.icon] || <WorkspacePremiumIcon />}
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {category.name_ar}
                  </Typography>
                  {category.description_ar && (
                    <Typography variant="caption" color="text.secondary">
                      {category.description_ar}
                    </Typography>
                  )}
                </Box>
                <Chip
                  label={`${category.services.length} خدمة`}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ fontWeight: 700 }}
                />
              </Stack>

              {/* Services Grid */}
              <Grid container spacing={2}>
                {category.services.map((service) => (
                  <Grid item xs={12} sm={6} md={4} key={service.id}>
                    <ServiceCard service={service} />
                  </Grid>
                ))}
              </Grid>

              <Divider sx={{ mt: 4 }} />
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
};

const ServiceCard = ({ service }: { service: Service }) => {
  const destination = service.external_url || service.route || '/services';
  const isExternal = !!service.external_url;

  return (
    <Card
      component={Link}
      to={destination}
      target={isExternal ? '_blank' : undefined}
      sx={{
        height: '100%',
        border: '1px solid',
        borderColor: 'divider',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
          borderColor: 'primary.main',
        },
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2.5,
              display: 'grid',
              placeItems: 'center',
              color: 'primary.main',
              bgcolor: 'primary.light',
              flexShrink: 0,
            }}
          >
            {(() => {
              const Icon = iconFor(service.icon);
              return <Icon />;
            })()}
          </Box>
          <Stack direction="row" spacing={0.5} alignItems="center">
            {service.requires_auth && (
              <LockIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            )}
            <ArrowForwardIcon sx={{ fontSize: 18, color: 'primary.main' }} />
          </Stack>
        </Stack>

        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
          {service.name_ar}
        </Typography>

        {service.description_ar && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 1.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              minHeight: 40,
            }}
          >
            {service.description_ar}
          </Typography>
        )}

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip
            label={audienceLabels[service.audience] || service.audience}
            size="small"
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
          {service.identity_provider && service.identity_provider !== 'NONE' && (
            <Chip
              label={service.identity_provider}
              size="small"
              color="secondary"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default SectorPortalServices;
