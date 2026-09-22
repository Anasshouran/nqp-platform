import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useAuth } from '../../hooks/useAuth';
import type { Service } from '../../api/endpoints/services';

interface ServiceAuthGateProps {
  service: Service;
  returnRoute?: string;
  children: React.ReactNode;
}

/**
 * حارس دخول الخدمات حسب تعريف الخدمة (requires_auth/identity_provider):
 * - خدمة عامة → تُفتح مباشرة.
 * - خدمة تتطلب هوية والمستخدم موثّق → تُفتح مباشرة.
 * - خدمة تتطلب هوية وغير موثّق → التوجيه لصفحة الدخول المناسبة مع العودة للخدمة.
 */
const loginRouteFor = (service: Service, currentPath?: string): string => {
  const target = currentPath || service.route || '/services';
  if (service.audience === 'INDIVIDUAL') {
    return `/traveler/login?next=${encodeURIComponent(target)}`;
  }
  return `/login?next=${encodeURIComponent(target)}`;
};

const ServiceAuthGate = ({ service, returnRoute, children }: ServiceAuthGateProps) => {
  const { isAuthenticated } = useAuth();

  if (!service.requires_auth || isAuthenticated) {
    return <>{children}</>;
  }

  const target = returnRoute || service.route || '/services';

  return (
    <Box
      sx={{
        borderRadius: 3,
        border: '1px dashed',
        borderColor: 'divider',
        bgcolor: 'action.hover',
        p: { xs: 2.5, md: 3 },
      }}
    >
      <Stack spacing={2} alignItems={{ xs: 'stretch', md: 'center' }} direction={{ xs: 'column', md: 'row' }}>
        <Box
          sx={{
            width: 52,
            height: 52,
            borderRadius: 3,
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'primary.main',
            color: '#fff',
            flexShrink: 0,
          }}
        >
          <LockOutlinedIcon />
        </Box>
        <Box sx={{ flex: 1, textAlign: { xs: 'center', md: 'right' } }}>
          <Typography variant="subtitle1" fontWeight={700}>
            هذه الخدمة تتطلب تسجيل الدخول
          </Typography>
          <Typography variant="body2" color="text.secondary">
            سجّل دخولك وسنعيدك إلى هذه الخدمة تلقائياً.
          </Typography>
        </Box>
        <Box sx={{ width: { xs: '100%', md: 340 } }}>
          <Button
            component={Link}
            to={loginRouteFor(service, target)}
            variant="contained"
            size="large"
            fullWidth
            sx={{ py: 1.2, fontWeight: 700, textTransform: 'none' }}
          >
            تسجيل الدخول لبدء الخدمة
          </Button>
        </Box>
      </Stack>
    </Box>
  );
};

export default ServiceAuthGate;