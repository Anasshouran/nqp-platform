import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LockResetIcon from '@mui/icons-material/LockReset';
import BrandLogo from '../../components/common/BrandLogo';
import { travelerForgotPassword } from '../../api/endpoints/travelers';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await travelerForgotPassword(email.trim());
      setSuccess(true);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setSuccess(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ bgcolor: 'primary.darker' }}>
          <Container maxWidth="lg"><Box sx={{ py: 1.5 }}><BrandLogo light compact product="afyatna" /></Box></Container>
        </Box>
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4, bgcolor: 'grey.50' }}>
          <Container maxWidth="xs">
            <Card elevation={2} sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 4 }}>
                <Stack spacing={3} alignItems="center">
                  <Box sx={{ p: 1.5, borderRadius: '50%', bgcolor: 'success.main', color: 'white', display: 'flex' }}>
                    <LockResetIcon fontSize="large" />
                  </Box>
                  <Typography variant="h5" fontWeight={700} textAlign="center">
                    تحقق من بريدك الإلكتروني
                  </Typography>
                  <Typography variant="body2" color="text.secondary" textAlign="center">
                    إذا كان <strong>{email}</strong> مسجّلاً، ستتلقى رابطاً لإعادة تعيين كلمة المرور.
                  </Typography>
                  <Typography variant="caption" color="text.secondary" textAlign="center">
                    لم تصل الرسالة؟ تحقق من مجلد الرسائل غير المرغوب فيها.
                  </Typography>
                  <Button component={RouterLink} to="/traveler/login" variant="outlined" fullWidth sx={{ mt: 1 }}>
                    العودة لتسجيل الدخول
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Container>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ bgcolor: 'primary.darker' }}>
        <Container maxWidth="lg"><Box sx={{ py: 1.5 }}><BrandLogo light compact product="afyatna" /></Box></Container>
      </Box>
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4, bgcolor: 'grey.50' }}>
        <Container maxWidth="xs">
          <Card elevation={2} sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 4 }}>
              <Stack spacing={3} alignItems="center">
                <Box sx={{ p: 1.5, borderRadius: '50%', bgcolor: 'primary.main', color: 'white', display: 'flex' }}>
                  <LockResetIcon fontSize="large" />
                </Box>
                <Typography variant="h5" fontWeight={700} textAlign="center">
                  نسيت كلمة المرور؟
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور
                </Typography>

                {error && <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert>}

                <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
                  <Stack spacing={2.5}>
                    <TextField
                      label="البريد الإلكتروني"
                      type="email"
                      fullWidth
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      inputProps={{ dir: 'ltr', autoComplete: 'email' }}
                    />
                    <Button
                      type="submit"
                      variant="contained"
                      fullWidth
                      size="large"
                      disabled={submitting}
                      sx={{ py: 1.5, fontWeight: 600 }}
                    >
                      {submitting ? <CircularProgress size={24} color="inherit" /> : 'إرسال رابط إعادة التعيين'}
                    </Button>
                  </Stack>
                </Box>

                <Link component={RouterLink} to="/traveler/login" variant="body2" underline="hover" color="primary.main">
                  العودة لتسجيل الدخول
                </Link>
              </Stack>
            </CardContent>
          </Card>

          <Stack direction="row" justifyContent="center" sx={{ mt: 2 }}>
            <Button component={RouterLink} to="/" startIcon={<ArrowBackIcon />} size="small" sx={{ textTransform: 'none' }}>
              العودة للرئيسية
            </Button>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
};

export default ForgotPasswordPage;
