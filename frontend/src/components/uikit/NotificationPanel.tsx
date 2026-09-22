import { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ScheduleIcon from '@mui/icons-material/Schedule';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NOTIFICATIONS_CHANGED_EVENT,
  notifyNotificationsChanged,
  type AppNotification,
  type NotificationStatus,
} from '../../api/endpoints/notifications';
import { formatDateTime } from '../../utils/formatters';

const statusMeta: Record<NotificationStatus, { label: string; color: string; bg: string; icon: React.ReactElement }> = {
  sent: { label: 'أُرسلت', color: '#17684a', bg: '#e7f5ed', icon: <CheckCircleIcon /> },
  failed: { label: 'فشلت', color: '#b3261e', bg: '#fdeaea', icon: <CancelIcon /> },
  pending: { label: 'قيد الإرسال', color: '#8a5a00', bg: '#fdf3e0', icon: <ScheduleIcon /> },
};

const channelLabel: Record<string, string> = {
  email: 'بريد',
  sms: 'رسالة',
  push: 'إشعار',
  websocket: 'مباشر',
};

export interface NotificationPanelProps {
  title?: string;
  subtitle?: string;
  height?: number | string;
  onOpen?: (notification: AppNotification) => void;
}

const NotificationPanel = ({
  title = 'الإشعارات',
  subtitle = 'آخر تنبيهات النظام',
  height = 420,
  onOpen,
}: NotificationPanelProps) => {
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    getNotifications()
      .then((r) => {
        setItems(Array.isArray(r.data.data) ? r.data.data : []);
        setError(false);
      })
      .catch(() => {
        setError(true);
        setItems([]);
      });
  }, []);

  useEffect(() => {
    load();
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, load);
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, load);
  }, [load]);

  const handleMarkAll = async () => {
    try {
      await markAllNotificationsRead();
    } catch {
      // حدث الخطأ بصمت — تُحدَّث اللوحة من الحدث فقط عند النجاح
      return;
    }
    notifyNotificationsChanged();
  };

  const handleItemClick = async (n: AppNotification) => {
    if (!n.is_read) {
      try {
        await markNotificationRead(n.id);
        notifyNotificationsChanged();
      } catch {
        // تجاهل فشل وضع علامة القراءة
      }
    }
    onOpen?.(n);
  };

  const failedCount = (items ?? []).filter((n) => n.status === 'failed').length;

  return (
    <Card
      sx={{
        borderRadius: 4,
        border: '1px solid rgba(16,40,34,0.07)',
        bgcolor: 'rgba(255,255,255,0.86)',
        backdropFilter: 'blur(18px) saturate(1.35)',
        boxShadow: '0 1px 2px rgba(16,40,34,0.03), 0 10px 30px rgba(16,40,34,0.06)',
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 2.5, pt: 2.5, pb: 1.5, gap: 1 }}
      >
        <Stack spacing={0.25}>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {subtitle}
            {failedCount > 0 && (
              <Box component="span" sx={{ color: 'error.main', fontWeight: 700 }}>
                {' · '}{failedCount} فشل
              </Box>
            )}
          </Typography>
        </Stack>
        <Tooltip title="تحديد الكل كمقروء">
          <IconButton aria-label="تأكيد"
            size="small"
            onClick={handleMarkAll}
            disabled={!items || items.length === 0}
            sx={{ color: 'primary.main' }}
          >
            <DoneAllIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
      <Divider />
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          height,
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(16,40,34,0.18)', borderRadius: 3 },
        }}
      >
        {items === null ? (
          <Stack spacing={1.5} sx={{ p: 2 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={64} />
            ))}
          </Stack>
        ) : items.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <NotificationsNoneIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">
              {error ? 'تعذر تحميل الإشعارات' : 'لا توجد إشعارات'}
            </Typography>
          </Box>
        ) : (
          items.map((n) => {
            const meta = statusMeta[n.status];
            const unread = !n.is_read;
            return (
              <Box
                key={n.id}
                onClick={() => void handleItemClick(n)}
                sx={{
                  px: 2.5,
                  py: 1.75,
                  cursor: onOpen ? 'pointer' : 'default',
                  bgcolor: unread ? 'rgba(12,127,106,0.05)' : 'transparent',
                  borderBottom: '1px solid rgba(16,40,34,0.06)',
                  transition: 'background-color 150ms ease',
                  '&:hover': { bgcolor: 'rgba(12,127,106,0.07)' },
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 2.5,
                      display: 'grid',
                      placeItems: 'center',
                      color: meta.color,
                      bgcolor: meta.bg,
                      flexShrink: 0,
                      mt: 0.25,
                    }}
                  >
                    {meta.icon}
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                      <Typography
                        variant="body2"
                        noWrap
                        sx={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}
                      >
                        {n.subject || 'إشعار النظام'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                        {channelLabel[n.channel] || n.channel}
                      </Typography>
                    </Stack>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        mt: 0.25,
                      }}
                    >
                      {n.body}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                      <Box
                        component="span"
                        sx={{ fontSize: '0.72rem', fontWeight: 700, color: meta.color, bgcolor: meta.bg, px: 1, py: 0.25, borderRadius: 1.5 }}
                      >
                        {meta.label}
                      </Box>
                      {n.sent_at && (
                        <Typography variant="caption" color="text.disabled">
                          {formatDateTime(n.sent_at)}
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                  {onOpen && <MoreHorizIcon sx={{ color: 'text.disabled', fontSize: 18, mt: 0.5 }} />}
                </Stack>
              </Box>
            );
          })
        )}
      </Box>
      <Divider />
      <Box sx={{ p: 1, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          بوابة الإشعارات · {items ? items.length : '—'} سجل
        </Typography>
      </Box>
    </Card>
  );
};

export default NotificationPanel;
