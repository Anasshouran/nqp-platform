import { useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
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
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import BrandLogo from '../../components/common/BrandLogo';
import { login } from '../../api/endpoints/auth';
import { setCredentials } from '../../store/slices/authSlice';
import type { AppDispatch } from '../../store/store';
import { roleHomePathFor } from '../../utils/roleHome';

const errorMessage = (err: unknown): string => {
  const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
  if (!data) return 'بيانات الدخول غير صحيحة';
  const detail = data.detail;
  if (typeof detail === 'string' && detail) return detail;
  if (Array.isArray(detail) && detail.length) return String(detail[0]);
  if (Array.isArray(data.non_field_errors) && (data.non_field_errors as unknown[]).length) {
    return String((data.non_field_errors as string[])[0]);
  }
  if (typeof data.message === 'string' && data.message) return data.message;
  return 'بيانات الدخول غير صحيحة';
};

const TravelerLoginPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next') || undefined;
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const { data: res } = await login({ identifier, password });
      const payload = res.data;
      dispatch(
        setCredentials({
          user: payload.user,
          token: payload.access_token,
          refreshToken: payload.refresh_token,
        })
      );
      const target =
        next && next.startsWith('/') && !next.startsWith('//')
          ? next
          : roleHomePathFor(payload.user);
      navigate(target, { replace: true });
    } catch (err: unknown) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ bgcolor: 'primary.darker' }}>
        <Container maxWidth="lg">
          <Box sx={{ py: 1.5 }}>
            <BrandLogo light compact product="afyatna" />
          </Box>
        </Container>
      </Box>

      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4, bgcolor: 'grey.50' }}>
        <Container maxWidth="xs">
          <Card elevation={2} sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 4 }}>
              <Stack spacing={3} alignItems="center">
                <Box sx={{ p: 1.5, borderRadius: '50%', bgcolor: 'primary.main', color: 'white', display: 'flex' }}>
                  <HealthAndSafetyIcon fontSize="large" />
                </Box>
                <Typography variant="h5" fontWeight={700} textAlign="center">
                  دخول المسافر
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  سجّل دخولك لإدارة رحلتك ومتابعة طلبك
                </Typography>

                {error && <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert>}

                <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
                  <Stack spacing={2.5}>
                    <TextField
                      label="البريد الإلكتروني"
                      type="email"
                      fullWidth
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      inputProps={{ dir: 'ltr', autoComplete: 'email' }}
                    />
                    <TextField
                      label="كلمة المرور"
                      type={showPassword ? 'text' : 'password'}
                      fullWidth
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      inputProps={{ dir: 'ltr', autoComplete: 'current-password' }}
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
                    <Button
                      type="submit"
                      variant="contained"
                      fullWidth
                      size="large"
                      disabled={submitting}
                      sx={{ py: 1.5, fontWeight: 600 }}
                    >
                      {submitting ? <CircularProgress size={24} color="inherit" /> : 'تسجيل الدخول'}
                    </Button>
                  </Stack>
                </Box>

                <Stack spacing={1.5} alignItems="center" sx={{ width: '100%' }}>
                  <Link
                    component={RouterLink}
                    to="/traveler/forgot-password"
                    variant="body2"
                    underline="hover"
                    color="primary.main"
                  >
                    نسيت كلمة المرور؟
                  </Link>
                  <Divider sx={{ width: '100%' }} />
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      ليس لديك حساب؟
                    </Typography>
                    <Link
                      component={RouterLink}
                      to="/traveler/signup"
                      variant="body2"
                      fontWeight={600}
                      underline="hover"
                    >
                      أنشئ حساباً جديداً
                    </Link>
                  </Stack>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Stack direction="row" justifyContent="center" sx={{ mt: 2 }}>
            <Button
              component={RouterLink}
              to="/"
              startIcon={<ArrowBackIcon />}
              size="small"
              sx={{ textTransform: 'none' }}
            >
              العودة للرئيسية
            </Button>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
};

export default TravelerLoginPage;