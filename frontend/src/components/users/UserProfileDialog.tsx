import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import { getUserProfile } from '../../api/endpoints/users';
import { StatusChip } from '../uikit';
import { userType, scopeType } from '../../utils/status';
import { formatDateTime } from '../../utils/formatters';
import type { User, UserProfile } from '../../types/user';

interface Props {
  open: boolean;
  user: User | null;
  onClose: () => void;
}

const InfoRow = ({ label, value }: { label: string; value?: string | number | null }) => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 2,
      py: 0.65,
      borderBottom: '1px dashed',
      borderColor: 'divider',
    }}
  >
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'end' }}>{value ?? '—'}</Typography>
  </Box>
);

const UserProfileDialog = ({ open, user, onClose }: Props) => {
  const [tab, setTab] = useState(0);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    setTab(0);
    setProfile(null);
    setError(null);
    setLoading(true);
    getUserProfile(user.id)
      .then((r) => setProfile(r.data.data))
      .catch(() => setError('تعذر تحميل ملف المستخدم'))
      .finally(() => setLoading(false));
  }, [open, user]);

  const p = profile;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <Box
        className="gradient-shift"
        sx={{ borderTopLeftRadius: 8, borderTopRightRadius: 8, p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}
      >
        <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.18)', width: 52, height: 52, fontWeight: 700 }}>
          {(user?.full_name || '?').slice(0, 2)}
        </Avatar>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{user?.full_name}</Typography>
          <Typography variant="body2" sx={{ opacity: 0.85 }}>{user?.email}</Typography>
        </Box>
        <Box sx={{ flex: 1 }} />
        {user ? (
          user.is_active ? <StatusChip label="نشط" tone="success" /> : <StatusChip label="معطل" tone="neutral" />
        ) : null}
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider' }}
        variant="fullWidth"
      >
        <Tab icon={<BadgeOutlinedIcon fontSize="small" />} iconPosition="start" label="الحساب والوظيفي" />
        <Tab icon={<WorkspacePremiumOutlinedIcon fontSize="small" />} iconPosition="start" label="الأدوار والصلاحيات" />
        <Tab icon={<AccountTreeOutlinedIcon fontSize="small" />} iconPosition="start" label="التنظيم" />
      </Tabs>

      <DialogContent sx={{ minHeight: 320 }}>
        {loading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 260 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : !p ? null : tab === 0 ? (
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>بيانات الحساب</Typography>
              <InfoRow label="البريد الإلكتروني" value={p.user.email} />
              <InfoRow label="اسم المستخدم" value={p.user.username} />
              <InfoRow label="الجوال" value={p.user.phone} />
              <InfoRow label="الرقم الوطني" value={p.user.national_id} />
              <InfoRow label="نوع المستخدم" value={p.user.user_type ? userType[p.user.user_type]?.label ?? p.user.user_type : null} />
              <InfoRow label="الجهة" value={p.user.organization_name} />
              <InfoRow label="التوثيق الثنائي" value={p.security.is_mfa_enabled ? 'مفعّل' : 'غير مفعّل'} />
              <InfoRow label="انتهاء الحساب" value={p.security.account_expires_at ? formatDateTime(p.security.account_expires_at) : null} />
              <InfoRow label="آخر دخول" value={p.security.last_login ? formatDateTime(p.security.last_login) : null} />
              <InfoRow label="تاريخ الإنشاء" value={p.security.created_at ? formatDateTime(p.security.created_at) : null} />
            </Box>
            <Divider />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>بيانات الموظف</Typography>
              <InfoRow label="الرقم الوظيفي" value={p.profile.employee_number ?? p.user.employee_number} />
              <InfoRow label="المنصب" value={p.profile.job_title} />
              <InfoRow label="الاسم (عربي)" value={p.profile.full_name_ar} />
              <InfoRow label="الاسم (إنجليزي)" value={p.profile.full_name_en} />
              <InfoRow label="الجنس" value={p.profile.gender} />
              <InfoRow label="تاريخ الميلاد" value={p.profile.birth_date} />
              <InfoRow label="تاريخ التعيين" value={p.profile.hire_date} />
              <InfoRow label="حالة التوظيف" value={p.profile.employment_status} />
              <InfoRow label="الهاتف الداخلي" value={p.profile.internal_phone} />
              <InfoRow label="المكتب" value={p.profile.office} />
              <InfoRow label="اللغة" value={p.profile.language} />
              <InfoRow label="السمة" value={p.profile.theme} />
              <InfoRow label="المنطقة الزمنية" value={p.profile.timezone} />
              <InfoRow label="التوقيع الرقمي" value={p.profile.signature_status} />
            </Box>
          </Stack>
        ) : tab === 1 ? (
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                تعيينات الأدوار ({p.roles.length})
              </Typography>
              {p.roles.length === 0 ? (
                <Alert severity="info" sx={{ mb: 1 }}>لا توجد أدوار معيّنة لهذا المستخدم</Alert>
              ) : (
                p.roles.map((r, i) => (
                  <Stack key={i} direction="row" alignItems="center" spacing={1} sx={{ py: 1, borderBottom: '1px dashed', borderColor: 'divider' }}>
                    <Chip label={r.role_name} color="primary" variant="outlined" size="small" />
                    {r.scope_type && <Chip label={scopeType[r.scope_type] ?? r.scope_type} size="small" variant="outlined" />}
                    {r.is_active ? <Chip label="نشط" color="success" size="small" /> : <Chip label="غير نشط" size="small" />}
                    {r.start_date && <Typography variant="caption" color="text.secondary">من {r.start_date}</Typography>}
                    <Box sx={{ flex: 1 }} />
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{r.role}</Typography>
                  </Stack>
                ))
              )}
            </Box>
            <Divider />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                الصلاحيات الفعلية ({p.effective_permissions.length})
              </Typography>
              {p.effective_permissions.length === 0 ? (
                <Alert severity="info">لا يمتلك هذا المستخدم صلاحيات فاعلة</Alert>
              ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {p.effective_permissions.map((code) => (
                    <Chip key={code} label={code} size="small" sx={{ fontFamily: 'monospace' }} />
                  ))}
                </Box>
              )}
            </Box>
          </Stack>
        ) : (
          <Stack spacing={1}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
              التعيينات الهيكلية ({p.organization.length})
            </Typography>
            {p.organization.length === 0 ? (
              <Alert severity="info">لا توجد تعيينات هيكلية لهذا المستخدم</Alert>
            ) : (
              p.organization.map((o, i) => {
                const parts = [o.sector, o.department, o.station, o.position].filter(Boolean);
                return (
                  <Stack key={i} direction="row" alignItems="center" spacing={1} sx={{ py: 1, borderBottom: '1px dashed', borderColor: 'divider' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{parts.join(' · ') || '—'}</Typography>
                    {o.is_primary && <Chip label="أساسي" color="success" size="small" />}
                    <Box sx={{ flex: 1 }} />
                    {o.lab && <Chip label={`مختبر: ${o.lab}`} size="small" variant="outlined" />}
                  </Stack>
                );
              })
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إغلاق</Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserProfileDialog;