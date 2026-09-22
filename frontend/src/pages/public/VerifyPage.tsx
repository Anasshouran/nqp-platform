import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import { PageHeader } from '../../components/common';
import VerifyTools from '../../components/VerifyTools';

const capabilities = [
  { icon: <QrCode2Icon />, title: 'التحقق من QR', desc: 'التحقق من صحة وصلاحية رموز QR الصادرة للمسافرين.' },
  { icon: <WorkspacePremiumIcon />, title: 'التحقق من الشهادات', desc: 'التأكد من صحة وسريان الشهادات الصحية الدولية.' },
  { icon: <VerifiedUserIcon />, title: 'تتبّع الطلبات', desc: 'الاستعلام عن حالة طلبات التسجيل المسبق للمسافرين.' },
];

const VerifyPage = () => (
  <Container maxWidth="lg" sx={{ py: 5 }}>
    <PageHeader
      title="التحقق الذكي"
      subtitle="أدوات تحقق موثوقة للبيانات الصحية والشهادات ورموز QR الصادرة عن المنصة"
      eyebrow="خدمة التحقق"
    />

    <Grid container spacing={3} sx={{ mb: 5 }}>
      {capabilities.map((cap) => (
        <Grid item xs={12} sm={6} md={4} key={cap.title}>
          <Card
            className="fade-up"
            sx={{
              height: '100%',
              border: '1px solid',
              borderColor: 'divider',
              textAlign: 'center',
              transition: 'box-shadow 250ms ease, transform 250ms ease',
              '&:hover': { boxShadow: 4, transform: 'translateY(-4px)' },
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  mx: 'auto',
                  mb: 1.5,
                  borderRadius: 3,
                  display: 'grid',
                  placeItems: 'center',
                  color: 'primary.main',
                  bgcolor: 'primary.light',
                }}
              >
                {cap.icon}
              </Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {cap.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {cap.desc}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>

    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: 2.5,
          display: 'grid',
          placeItems: 'center',
          color: '#fff',
          bgcolor: 'primary.main',
        }}
      >
        <VerifiedUserIcon />
      </Box>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        أدوات التحقق
      </Typography>
    </Stack>

    <VerifyTools />
  </Container>
);

export default VerifyPage;
