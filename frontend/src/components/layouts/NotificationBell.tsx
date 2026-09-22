import { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Badge from '@mui/material/Badge';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import NotificationsIcon from '@mui/icons-material/Notifications';
import {
  getUnreadNotificationCount,
  NOTIFICATIONS_CHANGED_EVENT,
} from '../../api/endpoints/notifications';
import NotificationPanel from '../uikit/NotificationPanel';

const POLL_INTERVAL_MS = 60_000;

interface NotificationBellProps {
  /** لون أيقونة الجرس في شريط التطبيق */
  iconColor?: string;
}

/** جرس إشعارات موحّد: عدّاد غير المقروء + لوحة فورية (تُحدَّث عبر الأحداث والاستطلاع). */
const NotificationBell = ({ iconColor = 'text.secondary' }: NotificationBellProps) => {
  const [count, setCount] = useState(0);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const refresh = useCallback(() => {
    getUnreadNotificationCount()
      .then((r) => setCount(r.data?.data?.unread_count ?? 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, POLL_INTERVAL_MS);
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, refresh);
    };
  }, [refresh]);

  return (
    <>
      <Tooltip title={`الإشعارات${count ? ` (${count} غير مقروء)` : ''}`}>
        <IconButton
          aria-label="الإشعارات"
          aria-haspopup="true"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{ color: iconColor }}
        >
          <Badge badgeContent={count} max={99} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { mt: 1, width: 400, maxWidth: '92vw', borderRadius: 4, overflow: 'hidden' } } }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2.5, pt: 2, pb: 1 }}>
          <Stack spacing={0.25}>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
              الإشعارات
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {count > 0 ? `${count} غير مقروء` : 'لا توجد إشعارات غير مقروءة'}
            </Typography>
          </Stack>
          <Box sx={{ fontSize: 12, fontWeight: 700, color: 'primary.main', bgcolor: 'primary.lighter', px: 1.25, py: 0.5, borderRadius: 2 }}>
            {count > 0 ? 'جديد' : 'مقروء'}
          </Box>
        </Stack>
        <NotificationPanel height={384} />
      </Popover>
    </>
  );
};

export default NotificationBell;