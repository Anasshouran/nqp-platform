import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LockResetIcon from '@mui/icons-material/LockReset';
import BrandLogo from '../../components/common/BrandLogo';
import { staffForgotPassword } from '../../api/endpoints/auth';

const StaffForgotPasswordPage = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await staffForgotPassword(email.trim());
      setSuccess(true);
    } catch {
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
                    {t('login.forgotStaff.successTitle')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" textAlign="center">
                    <span dangerouslySetInnerHTML={{ __html: t('login.forgotStaff.successMessage').replace('{{email}}', email) }} />
                  </Typography>
                  <Typography variant="caption" color="text.secondary" textAlign="center">
                    {t('login.forgotStaff.successNote')}
                  </Typography>
                  <Button component={RouterLink} to="/login" variant="outlined" fullWidth sx={{ mt: 1 }}>
                    {t('login.forgotStaff.backToLogin')}
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
                  {t('login.forgotStaff.title')}
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  {t('login.forgotStaff.subtitle')}
                </Typography>

                <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
                  <Stack spacing={2.5}>
                    <TextField
                      label={t('login.forgotStaff.emailLabel')}
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
                      {submitting ? <CircularProgress size={24} color="inherit" /> : t('login.forgotStaff.submit')}
                    </Button>
                  </Stack>
                </Box>

                <Link component={RouterLink} to="/login" variant="body2" underline="hover" color="primary.main">
                  {t('login.forgotStaff.backToLogin')}
                </Link>
              </Stack>
            </CardContent>
          </Card>

          <Stack direction="row" justifyContent="center" sx={{ mt: 2 }}>
            <Button component={RouterLink} to="/" startIcon={<ArrowBackIcon />} size="small" sx={{ textTransform: 'none' }}>
              {t('login.forgotStaff.backToHome')}
            </Button>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
};

export default StaffForgotPasswordPage;
