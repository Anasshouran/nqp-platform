import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import BlockIcon from '@mui/icons-material/Block';
import HomeIcon from '@mui/icons-material/Home';
import LogoutIcon from '@mui/icons-material/Logout';
import { logout } from '../../store/slices/authSlice';
import { roleHomePath } from '../../utils/roleHome';
import type { AppDispatch } from '../../store/store';

interface WorkspaceUnavailableProps {
  /** رمز دور المستخدم (قد يكون غير معروفاً في إعدادات الواجهة). */
  role?: string | null;
}

/**
 * الحالة الصريحة لدور مسجّل الدخول بلا مساحة عمل معرَّفة في الواجهة.
 *
 * بديل «ارجع إلى /login»: المستخدم موثَّق أصلاً، وإعادته لصفحة الدخول
 * تُسقطه في حلقة توجيه لا نهاية لها. تشرح له الحالة سبب التوقف وتُبقيه
 * قادراً على الخروج أو الوصول لمساره الرئيسي إن كان خارج هذا التخطيط.
 */
const WorkspaceUnavailable = ({ role }: WorkspaceUnavailableProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const home = role ? roleHomePath(role) : '/app';
  /** مسار خارج تخطيط `/app` (مثل بوابة المسافر) لا يُعيد الحالة نفسها. */
  const hasOutsideHome = home !== '/app' && !home.startsWith('/app');

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#F4F6F9',
        p: 2,
      }}
    >
      <Container maxWidth="sm">
        <Card sx={{ borderRadius: 4, border: '1px solid rgba(16,40,34,0.08)' }}>
          <CardContent sx={{ p: { xs: 3, md: 4 }, textAlign: 'center' }}>
            <BlockIcon color="warning" sx={{ fontSize: 48, mb: 1 }} />
            <Typography variant="h4" sx={{ mb: 1 }}>
              لا توجد مساحة عمل متاحة لدورك
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2, lineHeight: 2 }}>
              أنت مسجّل الدخول بنجاح، لكن الدور المعرَّف في حسابك غير مدعوم في
              واجهة المنصة بعد. تواصل مع مسؤول النظام لترقية صلاحياتك.
            </Typography>
            {role && (
              <Typography
                variant="body2"
                sx={{ mb: 2, fontFamily: 'monospace', direction: 'ltr', color: 'text.disabled' }}
              >
                {role}
              </Typography>
            )}
            <Stack spacing={1.5}>
              {hasOutsideHome && (
                <Button
                  variant="contained"
                  startIcon={<HomeIcon />}
                  onClick={() => navigate(home, { replace: true })}
                >
                  الذهاب للصفحة الرئيسية لحسابي
                </Button>
              )}
              <Button variant="outlined" onClick={() => navigate('/', { replace: true })}>
                العودة للموقع العام
              </Button>
              <Button
                variant="text"
                color="inherit"
                startIcon={<LogoutIcon />}
                onClick={() => {
                  dispatch(logout());
                  navigate('/login', { replace: true });
                }}
              >
                تسجيل الخروج
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default WorkspaceUnavailable;
