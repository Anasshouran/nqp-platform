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
import { register } from '../../api/endpoints/auth';
import { setCredentials } from '../../store/slices/authSlice';
import type { AppDispatch } from '../../store/store';
import { roleHomePathFor } from '../../utils/roleHome';

const TravelerSignupPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next') || undefined;
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.full_name = 'الاسم الكامل مطلوب';
    if (!email.trim()) errs.email = 'البريد الإلكتروني مطلوب';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'البريد الإلكتروني غير صحيح';
    if (password.length < 8) errs.password = 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';
    if (password !== confirmPassword) errs.confirm_password = 'كلمتا المرور غير متطابقتين';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    setSubmitting(true);

    try {
      const { data: res } = await register({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        confirm_password: confirmPassword,
        phone: phone.trim() || undefined,
        user_type: 'TRAVELER',
      });
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
      const axiosErr = err as { response?: { data?: Record<string, unknown> & { detail?: unknown } } };
      const data = axiosErr.response?.data;
      if (data && typeof data === 'object' && !Array.isArray(data.detail)) {
        const fieldEntries = Object.entries(data).filter(
          ([k]) => k !== 'detail' && k !== 'message' && Array.isArray(data[k])
        );
        if (fieldEntries.length > 0) {
          const errs: Record<string, string> = {};
          fieldEntries.forEach(([k, v]) => { errs[k] = (v as string[])[0]; });
          setFieldErrors(errs);
          setError('يرجى تصحيح الأخطاء أدناه');
        } else {
          const detail = data.detail;
          setError(typeof detail === 'string' ? detail : 'حدث خطأ أثناء إنشاء الحساب');
        }
      } else {
        const detail = (data?.detail as string | string[] | undefined);
        setError(
          Array.isArray(detail) ? String(detail[0]) : detail || 'حدث خطأ أثناء إنشاء الحساب'
        );
      }
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
                  إنشاء حساب مسافر
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  أنشئ حسابك لتتمكن من تسجيل رحلتك ومتابعتها
                </Typography>

                {error && <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert>}

                <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
                  <Stack spacing={2.5}>
                    <TextField
                      label="الاسم الكامل"
                      fullWidth
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      error={!!fieldErrors.full_name}
                      helperText={fieldErrors.full_name}
                      inputProps={{ autoComplete: 'name' }}
                    />
                    <TextField
                      label="البريد الإلكتروني"
                      type="email"
                      fullWidth
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      error={!!fieldErrors.email}
                      helperText={fieldErrors.email}
                      inputProps={{ dir: 'ltr', autoComplete: 'email' }}
                    />
                    <TextField
                      label="رقم الجوال (اختياري)"
                      fullWidth
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      error={!!fieldErrors.phone}
                      helperText={fieldErrors.phone}
                      placeholder="+249..."
                      inputProps={{ dir: 'ltr', autoComplete: 'tel' }}
                    />
                    <TextField
                      label="كلمة المرور"
                      type={showPassword ? 'text' : 'password'}
                      fullWidth
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      error={!!fieldErrors.password}
                      helperText={fieldErrors.password || '8 أحرف على الأقل'}
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
                      error={!!fieldErrors.confirm_password}
                      helperText={fieldErrors.confirm_password}
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
                      {submitting ? <CircularProgress size={24} color="inherit" /> : 'إنشاء الحساب'}
                    </Button>
                  </Stack>
                </Box>

                <Stack spacing={1.5} alignItems="center" sx={{ width: '100%' }}>
                  <Divider sx={{ width: '100%' }} />
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      لديك حساب بالفعل؟
                    </Typography>
                    <Link
                      component={RouterLink}
                      to="/traveler/login"
                      variant="body2"
                      fontWeight={600}
                      underline="hover"
                    >
                      سجّل الدخول
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

export default TravelerSignupPage;