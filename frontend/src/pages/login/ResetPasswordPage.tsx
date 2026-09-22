import { useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
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
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LockResetIcon from '@mui/icons-material/LockReset';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import BrandLogo from '../../components/common/BrandLogo';
import { staffResetPassword } from '../../api/endpoints/auth';

const StaffResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const uidb64 = searchParams.get('uidb64') || '';
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }
    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }
    if (!uidb64 || !token) {
      setError('رابط إعادة التعيين غير صالح أو منتهي الصلاحية');
      return;
    }

    setSubmitting(true);
    try {
      await staffResetPassword(uidb64, token, password, confirmPassword);
      setSuccess(true);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || 'رابط إعادة التعيين غير صالح أو منتهي الصلاحية');
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
                    تم إعادة تعيين كلمة المرور
                  </Typography>
                  <Typography variant="body2" color="text.secondary" textAlign="center">
                    يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة
                  </Typography>
                  <Button component={RouterLink} to="/login" variant="contained" fullWidth sx={{ py: 1.5, fontWeight: 600 }}>
                    تسجيل الدخول
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
                  إعادة تعيين كلمة المرور
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  أدخل كلمة المرور الجديدة
                </Typography>

                {error && <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert>}

                <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
                  <Stack spacing={2.5}>
                    <TextField
                      label="كلمة المرور الجديدة"
                      type={showPassword ? 'text' : 'password'}
                      fullWidth
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      inputProps={{ dir: 'ltr', autoComplete: 'new-password' }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                              size="small"
                            >
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                    <TextField
                      label="تأكيد كلمة المرور"
                      type={showPassword ? 'text' : 'password'}
                      fullWidth
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      inputProps={{ dir: 'ltr', autoComplete: 'new-password' }}
                    />
                    <Button
                      type="submit"
                      variant="contained"
                      fullWidth
                      size="large"
                      disabled={submitting}
                      sx={{ py: 1.5, fontWeight: 600 }}
                    >
                      {submitting ? <CircularProgress size={24} color="inherit" /> : 'إعادة تعيين كلمة المرور'}
                    </Button>
                  </Stack>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <Stack direction="row" justifyContent="center" sx={{ mt: 2 }}>
            <Button component={RouterLink} to="/login" startIcon={<ArrowBackIcon />} size="small" sx={{ textTransform: 'none' }}>
              العودة لتسجيل الدخول
            </Button>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
};

export default StaffResetPasswordPage;
