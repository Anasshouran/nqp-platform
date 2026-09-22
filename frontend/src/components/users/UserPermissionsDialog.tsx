import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import ShieldIcon from '@mui/icons-material/Shield';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import BlockIcon from '@mui/icons-material/Block';
import UndoIcon from '@mui/icons-material/Undo';
import { getUserPermissionAudit } from '../../api/endpoints/users';
import { StatusChip } from '../ui';
import { permissionAction, permissionResource } from '../../utils/status';
import { formatDateTime } from '../../utils/formatters';
import type { PermissionAuditEntry, User } from '../../types/user';
import type { StatusTone } from '../ui/StatusChip';

interface Props {
  open: boolean;
  user: User | null;
  onClose: () => void;
}

const AUDIT_META: Record<string, { label: string; tone: StatusTone; icon: React.ReactNode }> = {
  GRANT: { label: 'منح', tone: 'success', icon: <AddCircleIcon fontSize="small" /> },
  DENY: { label: 'منع', tone: 'error', icon: <BlockIcon fontSize="small" /> },
  REVOKE: { label: 'إلغاء', tone: 'neutral', icon: <UndoIcon fontSize="small" /> },
};

const UserPermissionsDialog = ({ open, user, onClose }: Props) => {
  const [audit, setAudit] = useState<PermissionAuditEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setLoadingAudit(true);
    getUserPermissionAudit(user.id)
      .then((r) => setAudit(Array.isArray(r.data.data) ? r.data.data : []))
      .catch(() => setAudit([]))
      .finally(() => setLoadingAudit(false));
  }, [open, user]);

  const extraSet = useMemo(() => new Set(user?.extra_permissions || []), [user]);
  const blockedSet = useMemo(() => new Set(user?.blocked_permissions || []), [user]);
  const effectiveSet = useMemo(() => new Set(user?.permissions || []), [user]);

  const resources = useMemo(() => {
    const codes = new Set<string>([...(user?.permissions || []), ...(user?.blocked_permissions || [])]);
    const map: Record<string, string[]> = {};
    for (const code of codes) {
      const [resource, action] = code.split(':');
      if (!resource || !action) continue;
      if (!map[resource]) map[resource] = [];
      if (!map[resource].includes(action)) map[resource].push(action);
    }
    return Object.keys(map)
      .map((res) => ({ res, actions: map[res].sort() }))
      .sort((a, b) => (permissionResource[a.res] || a.res).localeCompare(permissionResource[b.res] || b.res, 'ar'));
  }, [user]);

  const sourceMeta = (code: string): { label: string; tone: StatusTone } | null => {
    if (blockedSet.has(code)) return { label: 'محظور', tone: 'error' };
    if (extraSet.has(code)) return { label: 'منح', tone: 'success' };
    if (effectiveSet.has(code)) return { label: 'الدور', tone: 'primary' };
    return null;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'primary.light',
            color: 'primary.dark',
            flexShrink: 0,
          }}
        >
          <ShieldIcon />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            الصلاحيات الفعلية
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {user?.full_name} — {user?.email}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Chip
            label={`${effectiveSet.size} صلاحية سارية`}
            color="primary"
            variant="outlined"
            size="small"
          />
          {extraSet.size > 0 && <Chip label={`+${extraSet.size} منح مباشر`} color="success" size="small" />}
          {blockedSet.size > 0 && <Chip label={`−${blockedSet.size} محظور`} color="error" size="small" />}
        </Stack>

        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
          الصلاحيات حسب الوحدة
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          مصدر كل صلاحية: الدور (بدون علامة) · منح · محظور
        </Typography>

        {resources.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            لا توجد صلاحيات مسجلة لهذا المستخدم.
          </Typography>
        ) : (
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, mb: 3 }}>
            {resources.map(({ res, actions }) => (
              <Box
                key={res}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  p: 1.25,
                  bgcolor: 'background.paper',
                }}
              >
                <Typography sx={{ fontWeight: 700, fontSize: 13.5, mb: 0.5 }}>
                  {permissionResource[res] || res}
                </Typography>
                <Stack direction="row" flexWrap="wrap" spacing={0.5}>
                  {actions.map((action) => {
                    const src = sourceMeta(`${res}:${action}`);
                    return (
                      <StatusChip
                        key={action}
                        label={`${permissionAction[action] || action}${src && src.label !== 'الدور' ? ` (${src.label})` : ''}`}
                        tone={src?.tone || 'neutral'}
                        variant={src?.label === 'الدور' ? 'outlined' : undefined}
                      />
                    );
                  })}
                </Stack>
              </Box>
            ))}
          </Box>
        )}

        <Divider sx={{ mb: 2 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
          سجل التدقيق (آخر 50 عملية)
        </Typography>

        {loadingAudit ? (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 3 }}>
            <CircularProgress size={26} />
          </Box>
        ) : audit.length === 0 ? (
          <Alert severity="info">لا توجد سجلات تدقيق بعد.</Alert>
        ) : (
          <Stack direction="column" spacing={0.5}>
            {audit.map((entry) => {
              const meta = AUDIT_META[entry.action] || { label: entry.action, tone: 'neutral' as StatusTone, icon: <UndoIcon fontSize="small" /> };
              return (
                <Box
                  key={entry.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1.5,
                    px: 1.25,
                    py: 0.8,
                  }}
                >
                  <StatusChip label={meta.label} tone={meta.tone} />
                  <Typography sx={{ fontWeight: 700, fontSize: 13, ml: 1 }}>{entry.permission_code}</Typography>
                  {entry.ip_address && (
                    <Typography variant="caption" color="text.secondary">
                      {entry.ip_address}
                    </Typography>
                  )}
                  <Box sx={{ flexGrow: 1 }} />
                  <Typography variant="caption" color="text.secondary">
                    {formatDateTime(entry.created_at)}
                  </Typography>
                </Box>
              );
            })}
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UserPermissionsDialog;