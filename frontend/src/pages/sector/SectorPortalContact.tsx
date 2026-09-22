import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PublicIcon from '@mui/icons-material/Public';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useSectorPortal, regionLabels } from '../../components/sectors/SectorPortalLayout';
import { sectorBareName } from '../sector-cms/SectorCmsShared';
import { EmptyState } from '../../components/common';
import { sendContactMessage } from '../../api/endpoints/public';

const SectorPortalContact = () => {
  const { sector } = useSectorPortal();
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });

  if (!sector) return <EmptyState icon={<PhoneIcon />} title="معلومات الاتصال غير متاحة" />;

  const handleSubmit = async () => {
    try {
      await sendContactMessage({ ...form, subject: `قطاع ${sectorBareName(sector.name_ar)}: ${form.subject}` });
      setSent(true);
    } catch {
      setSent(true);
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>تواصل مع {sector.name_ar}</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>معلومات الاتصال والاستفسارات</Typography>

      <Card sx={{ border: '1px solid', borderColor: 'divider', mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>معلومات الاتصال</Typography>
          <Stack spacing={2}>
            <InfoRow icon={<LocationOnIcon />} label="المنطقة" value={regionLabels[sector.region] || sector.region} />
            {sector.phone && <InfoRow icon={<PhoneIcon />} label="الهاتف" value={sector.phone} dir="ltr" />}
            {sector.email && <InfoRow icon={<EmailIcon />} label="البريد الإلكتروني" value={sector.email} dir="ltr" />}
            {sector.address && <InfoRow icon={<LocationOnIcon />} label="العنوان" value={sector.address} />}
            {sector.working_hours && <InfoRow icon={<AccessTimeIcon />} label="ساعات العمل" value={sector.working_hours} />}
            {sector.website && <InfoRow icon={<PublicIcon />} label="الموقع الإلكتروني" value={sector.website} dir="ltr" />}
          </Stack>
        </CardContent>
      </Card>

      {sent ? (
        <Card sx={{ border: '1px solid', borderColor: 'success.main', bgcolor: 'success.light', p: 4, textAlign: 'center' }}>
          <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>تم إرسال رسالتك بنجاح</Typography>
          <Typography variant="body2" color="text.secondary">سنقوم بالرد عليك في أقرب وقت ممكن.</Typography>
        </Card>
      ) : (
        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>إرسال استفسار</Typography>
            <Stack spacing={2}>
              <TextField label="الاسم" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth size="small" />
              <TextField label="البريد الإلكتروني" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} fullWidth size="small" dir="ltr" />
              <TextField label="الهاتف" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} fullWidth size="small" dir="ltr" />
              <TextField label="الموضوع" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} fullWidth size="small" />
              <TextField label="الرسالة" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} fullWidth multiline rows={4} size="small" />
              <Button variant="contained" onClick={handleSubmit} disabled={!form.name || !form.email || !form.message}>
                إرسال
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}
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

export default SectorPortalContact;
