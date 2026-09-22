import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import HomeIcon from '@mui/icons-material/Home';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import { usePageTitle } from '../../hooks/usePageTitle';

const NotFoundPage = () => {
  usePageTitle('الصفحة غير موجودة (404)');

  return (
    <Container maxWidth="md" sx={{ py: { xs: 6, md: 10 } }}>
      <Box
        sx={{
          textAlign: 'center',
          px: { xs: 2, md: 6 },
          py: { xs: 6, md: 8 },
          borderRadius: 4,
          border: '1.5px dashed rgba(140,109,31,0.35)',
          bgcolor: 'rgba(140,109,31,0.04)',
        }}
      >
        <Box
          aria-hidden
          sx={{
            width: 96,
            height: 96,
            mx: 'auto',
            mb: 3,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            color: 'secondary.main',
            bgcolor: 'rgba(140,109,31,0.1)',
            border: '1px solid rgba(140,109,31,0.2)',
          }}
        >
          <SearchOffIcon sx={{ fontSize: 44 }} />
        </Box>
        <Typography
          variant="h1"
          component="h1"
          sx={{
            fontSize: { xs: '2.5rem', md: '3.5rem' },
            fontWeight: 900,
            lineHeight: 1.1,
            mb: 1,
          }}
        >
          404
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
          عذراً، الصفحة التي تبحث عنها غير موجودة
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 520, mx: 'auto', mb: 4, lineHeight: 1.8 }}>
          ربما تم نقل الصفحة أو حذفها أو أن الرابط الذي استخدمته غير صحيح. يمكنك العودة إلى
          الصفحة الرئيسية للوصول إلى جميع خدمات المنصة.
        </Typography>
        <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap" useFlexGap>
          <Button component={RouterLink} to="/" variant="contained" color="primary" size="large" startIcon={<HomeIcon />}>
            العودة إلى الصفحة الرئيسية
          </Button>
          <Button component={RouterLink} to="/services" variant="outlined" size="large">
            تصفح الخدمات
          </Button>
        </Stack>
      </Box>
    </Container>
  );
};

export default NotFoundPage;