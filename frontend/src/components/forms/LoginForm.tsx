import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import { useDispatch } from 'react-redux';
import { login } from '../../api/endpoints/auth';
import { setCredentials } from '../../store/slices/authSlice';
import type { AppDispatch } from '../../store/store';
import { loginSchema, LoginFormValues } from './schemas/auth';
import { roleHomePathFor } from '../../utils/roleHome';

const loginMethods = [
  { value: 'email', label: 'البريد الإلكتروني', placeholder: 'name@example.com', dir: 'ltr' as const },
  { value: 'username', label: 'اسم المستخدم', placeholder: 'username', dir: 'ltr' as const },
  { value: 'phone', label: 'رقم الجوال', placeholder: '+2499XXXXXXXX', dir: 'ltr' as const },
];

interface LoginFormProps {
  /** مسار التوجيه بعد الدخول (افتراضياً حسب الدور). */
  redirectPath?: string;
}

const LoginForm = ({ redirectPath }: LoginFormProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [method, setMethod] = useState('email');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const activeMethod = loginMethods.find((m) => m.value === method) || loginMethods[0];

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitting(true);
    setError(null);
    try {
      const response = await login({ identifier: values.identifier.trim(), password: values.password });
      const data = response.data.data;
      dispatch(
        setCredentials({
          user: data.user,
          token: data.access_token,
          refreshToken: data.refresh_token,
        })
      );
      const target = redirectPath && redirectPath.startsWith('/') ? redirectPath : roleHomePathFor(data.user);
      navigate(target, { replace: true });
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { message?: string; detail?: string } } })
          ?.response?.data;
      setError(detail?.message || detail?.detail || 'فشل تسجيل الدخول، تأكد من البيانات');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ mt: 2 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Stack direction="row" spacing={1} alignItems="flex-start">
            <TextField
              select
              label="طريقة الدخول"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              sx={{ width: 150, flexShrink: 0 }}
            >
              {loginMethods.map((m) => (
                <MenuItem key={m.value} value={m.value}>
                  {m.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              {...register('identifier')}
              label={activeMethod.label}
              placeholder={activeMethod.placeholder}
              inputProps={{ dir: activeMethod.dir }}
              fullWidth
              autoComplete="username"
              margin="dense"
              error={!!errors.identifier}
              helperText={errors.identifier?.message}
            />
          </Stack>
          <TextField
            {...register('password')}
            label="كلمة المرور"
            type="password"
            fullWidth
            autoComplete="current-password"
            margin="dense"
            error={!!errors.password}
            helperText={errors.password?.message}
          />
          <Stack direction="row" justifyContent="flex-end" sx={{ mt: 0.5 }}>
            <Typography
              component={RouterLink}
              to="/forgot-password"
              variant="caption"
              color="primary.main"
              sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              نسيت كلمة المرور؟
            </Typography>
          </Stack>
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={submitting}
            sx={{ mt: 3, mb: 2, py: 1.2 }}
          >
            {submitting ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              <Typography component="span">تسجيل الدخول</Typography>
            )}
          </Button>
    </Box>
  );
};

export default LoginForm;
