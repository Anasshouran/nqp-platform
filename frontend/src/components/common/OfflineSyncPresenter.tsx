import { useEffect } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { notifyInfo, notifySuccess } from '../../utils/toast';

/**
 * مُقدّم حالة المزامنة المركزية.
 *
 * يسترد أحداث قائمة الانتظار ويخاطب المستخدم مباشرة عبر الإشعارات، ويعرض
 * شريطاً دائماً عند وجود عمليات محفوظة محلياً بانتظار المزامنة أو عند انقطاع
 * الاتصال — دون إيهام المستخدم بأن العملية حُفِظت على الخادم.
 */
const OfflineSyncPresenter = () => {
  const { online, pending, lastSyncedCount } = useOfflineSync();

  useEffect(() => {
    if (pending > 0) {
      notifyInfo('تم حفظ العملية محلياً وستتم مزامنتها عند عودة الاتصال.');
    }
  }, [pending]);

  useEffect(() => {
    if (lastSyncedCount > 0) {
      notifySuccess(`تمت مزامنة ${lastSyncedCount} ${lastSyncedCount === 1 ? 'عملية' : 'عمليات'} مع الخادم.`);
    }
  }, [lastSyncedCount]);

  if (online && pending === 0) return null;

  const showQueued = pending > 0;
  const Icon = !online ? CloudOffIcon : showQueued ? CloudSyncIcon : CheckCircleIcon;
  const label = !online
    ? 'غير متصل بالإنترنت'
    : showQueued
      ? `${pending} ${pending === 1 ? 'عملية' : 'عمليات'} بانتظار المزامنة`
      : 'تمت المزامنة';

  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        position: 'fixed',
        bottom: 92,
        right: 16,
        zIndex: 1400,
        maxWidth: { xs: 'calc(100vw - 32px)', sm: 420 },
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        <Chip
          icon={<Icon sx={{ fontSize: 18 }} />}
          label={label}
          color={!online || showQueued ? 'warning' : 'success'}
          size="medium"
          sx={{
            fontWeight: 700,
            px: 1,
            backdropFilter: 'blur(8px)',
            boxShadow: (t) => t.shadows[2],
            '& .MuiChip-label': { display: 'inline-flex', alignItems: 'center', gap: 0.5 },
          }}
        />
        {showQueued && (
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, bgcolor: 'background.paper', px: 1, py: 0.5, borderRadius: 1, boxShadow: (t) => t.shadows[1] }}>
            محفوظة محلياً
          </Typography>
        )}
      </Stack>
    </Box>
  );
};

export default OfflineSyncPresenter;