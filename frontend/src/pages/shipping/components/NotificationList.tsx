/**
 * الإشعارات — typed notifications list (client-side).
 *
 * `notifications.getNotifications` returns a bare array (no server pagination),
 * so this page uses `useApi` + client-side search / unread filter / sort
 * (newest first) instead of `useServerTable`.
 */
import { useMemo, useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableContainer from '@mui/material/TableContainer';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import {
  PageHeader,
  SectionCard,
  StatusChip,
  EmptyState,
} from '../../../components/uikit';
import type { StatusTone } from '../../../components/uikit';
import { ErrorState } from '../../../components/common';
import { useApi } from '../../../hooks/useApi';
import { getNotifications } from '../../../api/endpoints/notifications';
import type { AppNotification } from '../../../api/endpoints/notifications';

const STATUS_META: Record<string, { label: string; tone: StatusTone }> = {
  sent: { label: 'أُرسل', tone: 'success' },
  pending: { label: 'قيد الإرسال', tone: 'warning' },
  failed: { label: 'فشل', tone: 'error' },
  DEFAULT: { label: 'غير معروف', tone: 'neutral' },
};

const CHANNEL_META: Record<string, string> = {
  email: 'بريد إلكتروني',
  sms: 'رسالة نصية',
  push: 'إشعار فوري',
  websocket: 'بث مباشر',
};

const statusMeta = (status: string) => STATUS_META[status] ?? STATUS_META.DEFAULT;
const channelLabel = (channel: string) => (CHANNEL_META[channel] ?? channel) || '—';

const formatDate = (iso?: string | null) => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ar-EG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const DetailRow = ({ label, value }: { label: string; value: ReactNode }) => (
  <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'space-between' }}>
    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>{label}</Typography>
    <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'left', whiteSpace: 'pre-wrap' }}>
      {value || '—'}
    </Typography>
  </Stack>
);

export const NotificationList = () => {
  const { data, loading, error, retry } = useApi<AppNotification[]>(() =>
    getNotifications().then((response) => response.data.data),
  );
  const notifications = useMemo(() => data ?? [], [data]);

  const [search, setSearch] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [detail, setDetail] = useState<AppNotification | null>(null);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications],
  );

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return notifications
      .filter((n) => (unreadOnly ? !n.is_read : true))
      .filter((n) => {
        if (!query) return true;
        return [n.subject, n.body, n.recipient, n.template]
          .some((field) => (field ?? '').toLowerCase().includes(query));
      })
      .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
  }, [notifications, search, unreadOnly]);

  return (
    <Box>
      <PageHeader
        eyebrow="الشحن البحري"
        title="الإشعارات"
        subtitle="سجل الإشعارات المرسلة والمعلّقة"
      />

      <SectionCard
        title="الإشعارات"
        subtitle={unreadCount > 0 ? `${unreadCount} غير مقروء من ${notifications.length}` : `${notifications.length} إشعار`}
        action={(
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
            <TextField
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث في الإشعارات..."
              size="small"
              sx={{ minWidth: 220 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <FormControlLabel
              control={(
                <Switch
                  checked={unreadOnly}
                  onChange={(e) => setUnreadOnly(e.target.checked)}
                />
              )}
              label="غير مقروء فقط"
            />
          </Stack>
        )}
      >
        {loading ? (
          <TableContainer>
            <Table size="small">
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    {Array.from({ length: 4 }).map((__, c) => (
                      <TableCell key={`cell-${c}`}>
                        <Skeleton variant="text" width={c === 0 ? '70%' : '50%'} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : error ? (
          <ErrorState onRetry={retry} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<NotificationsNoneIcon sx={{ fontSize: 40 }} />}
            title="لا توجد إشعارات"
            description="الإشعارات الواردة تظهر هنا"
          />
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>العنوان</TableCell>
                  <TableCell>القناة</TableCell>
                  <TableCell>التاريخ</TableCell>
                  <TableCell>الحالة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((n) => {
                  const meta = statusMeta(n.status);
                  return (
                    <TableRow
                      key={n.id}
                      hover
                      onClick={() => setDetail(n)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>
                        <Stack spacing={0.25}>
                          <Typography sx={{ fontWeight: n.is_read ? 500 : 700 }}>
                            {n.subject || '—'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {n.recipient || '—'}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>{channelLabel(n.channel)}</TableCell>
                      <TableCell>{formatDate(n.created_at)}</TableCell>
                      <TableCell>
                        <StatusChip label={meta.label} tone={meta.tone} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </SectionCard>

      {/* Detail */}
      <Dialog open={detail !== null} onClose={() => setDetail(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>تفاصيل الإشعار</DialogTitle>
        <DialogContent dividers>
          {detail && (
            <Stack spacing={1.25}>
              <DetailRow label="العنوان" value={detail.subject} />
              <DetailRow label="النص" value={detail.body} />
              <DetailRow label="القناة" value={channelLabel(detail.channel)} />
              <DetailRow label="المستلم" value={detail.recipient} />
              <DetailRow
                label="الحالة"
                value={(
                  <StatusChip
                    label={statusMeta(detail.status).label}
                    tone={statusMeta(detail.status).tone}
                  />
                )}
              />
              <DetailRow label="مقروء" value={detail.is_read ? 'نعم' : 'لا'} />
              <DetailRow label="التاريخ" value={formatDate(detail.created_at)} />
              {detail.error_message ? (
                <DetailRow label="رسالة الخطأ" value={detail.error_message} />
              ) : null}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetail(null)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NotificationList;