import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PublicIcon from '@mui/icons-material/Public';
import { useSectorPortal, regionLabels } from '../../components/sectors/SectorPortalLayout';
import { EmptyState } from '../../components/common';

const SectorPortalAbout = () => {
  const { sector, loading } = useSectorPortal();

  if (loading) return <Skeleton variant="rounded" height={200} />;
  if (!sector) return <EmptyState icon={<LocationOnIcon />} title="القطاع غير متاح" />;

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>عن القطاع</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        معلومات تفصيلية عن {sector.name_ar}
      </Typography>

      <Card sx={{ border: '1px solid', borderColor: 'divider', mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>الوصف</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
            {sector.description_ar || 'قطاع صحي تابع للإدارة الاتحادية للحجر الصحي.'}
          </Typography>
        </CardContent>
      </Card>

      <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>معلومات الاتصال</Typography>
          <Stack spacing={2}>
            <InfoRow icon={<LocationOnIcon />} label="المنطقة" value={regionLabels[sector.region] || sector.region} />
            <InfoRow icon={<LocalShippingIcon />} label="نقاط الدخول" value={`${sector.ports_count} منفذ`} />
            {sector.phone && <InfoRow icon={<PhoneIcon />} label="الهاتف" value={sector.phone} dir="ltr" />}
            {sector.email && <InfoRow icon={<EmailIcon />} label="البريد الإلكتروني" value={sector.email} dir="ltr" />}
            {sector.address && <InfoRow icon={<LocationOnIcon />} label="العنوان" value={sector.address} />}
            {sector.working_hours && <InfoRow icon={<AccessTimeIcon />} label="ساعات العمل" value={sector.working_hours} />}
            {sector.website && <InfoRow icon={<PublicIcon />} label="الموقع الإلكتروني" value={sector.website} dir="ltr" />}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

const InfoRow = ({ icon, label, value, dir }: { icon: React.ReactNode; label: string; value: string; dir?: 'ltr' | 'rtl' }) => (
  <Stack direction="row" spacing={1.5} alignItems="center">
    <Box sx={{ color: 'primary.main', display: 'grid', placeItems: 'center', width: 32, height: 32, borderRadius: 1.5, bgcolor: 'primary.light', flexShrink: 0 }}>{icon}</Box>
    <Box sx={{ flex: 1 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 700 }} dir={dir}>{value}</Typography>
    </Box>
  </Stack>
);

export default SectorPortalAbout;
