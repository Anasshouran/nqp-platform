import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import AddIcon from '@mui/icons-material/Add';
import PeopleIcon from '@mui/icons-material/People';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import KeyIcon from '@mui/icons-material/Key';
import EditIcon from '@mui/icons-material/Edit';
import ScienceIcon from '@mui/icons-material/Science';
import {
  DataTable,
  StatusChip,
  FormDialog,
  FormSelect,
  FormTextField,
  AppButton,
  ConfirmDialog,
  ExportButton,
} from '../../components/uikit';
import KpiCard from '../../components/dashboard/KpiCard';
import DashboardHero from '../../components/dashboard/DashboardHero';
import type { DataTableColumn, StatusTone } from '../../components/uikit';
import { useServerTable } from '../../hooks/useServerTable';
import { useAuth } from '../../hooks/useAuth';
import { useLabScope } from '../../hooks/useLabSectors';
import {
  createLabUser,
  getLabRoles,
  getLabUsers,
  resetLabUserPassword,
  updateLabUser,
} from '../../api/endpoints/laboratory';
import type { ApiResponse, PaginatedResponse } from '../../types/api';
import type { LabRole, LabUser, LabUserInput } from '../../types/laboratory';
import { formatDateTime } from '../../utils/formatters';
import { notifyError, notifySuccess } from '../../utils/toast';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';

const todayArabic = () => new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const roleTone: Record<string, StatusTone> = {
  LAB_DIRECTOR: 'error',
  LAB_MANAGER: 'primary',
  LAB_TECHNICIAN: 'success',
  LAB_RECEPTIONIST: 'warning',
  LAB_COORDINATOR: 'info',
};

interface ForState {
  id?: string | null;
  email: string;
  full_name: string;
  phone: string;
  role: string;
  password: string;
}

const emptyForm: ForState = { id: null, email: '', full_name: '', phone: '', role: 'LAB_TECHNICIAN', password: '' };

const SECTIONS = [
  { id: 'overview', label: 'نظرة عامة', icon: <PeopleIcon fontSize="small" /> },
  { id: 'users', label: 'المستخدمون', icon: <ScienceIcon fontSize="small" /> },
] as const;

const fetchLabUsersPaginated = async (params: Record<string, unknown>): Promise<{ data: ApiResponse<PaginatedResponse<LabUser>> }> => {
  const res = await getLabUsers(params);
  const results = Array.isArray(res.data.data) ? res.data.data : [];
  return {
    data: {
      status: res.data.status,
      message: res.data.message,
      data: { count: results.length, next: null, previous: null, results },
    },
  };
};

const NqlisUsers = () => {
  const { user: currentUser } = useAuth();
  const { sector } = useLabScope();
  const table = useServerTable<LabUser>({ fetchData: fetchLabUsersPaginated });
  const {
    rows, count, loading, error, refresh, page, rowsPerPage, setPage,
    setRowsPerPage, pageSizeOptions, searchInput, setSearchInput, setFilter,
  } = table;

  useEffect(() => {
    setFilter('sector', sector ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sector]);

  const [roles, setRoles] = useState<LabRole[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, disabled: 0 });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<ForState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [confirmUser, setConfirmUser] = useState<LabUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetUser, setResetUser] = useState<LabUser | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);

  const { active, register, scrollTo } = useCommandSections(SECTIONS as unknown as CommandSectionDef[], [loading]);

  const canManage = !!currentUser && (currentUser.role === 'LAB_DIRECTOR' || currentUser.role === 'LAB_MANAGER');

  const loadMeta = useCallback(() => {
    getLabUsers().then((r) => {
      const list = Array.isArray(r.data.data) ? r.data.data : [];
      setStats({
        total: list.length,
        active: list.filter((u) => u.is_active).length,
        disabled: list.filter((u) => !u.is_active).length,
      });
    }).catch(() => undefined);
    getLabRoles().then((r) => setRoles(Array.isArray(r.data.data) ? r.data.data : [])).catch(() => undefined);
  }, []);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  const roleName = (code: string | null) => {
    const r = roles.find((x) => x.code === code);
    return r ? r.name_ar : code || '—';
  };

  const openCreate = () => {
    setForm(emptyForm);
    setDialogOpen(true);
  };
  const openEdit = (u: LabUser) => {
    setForm({ id: u.id, email: u.email, full_name: u.full_name, phone: u.phone || '', role: u.role || 'LAB_TECHNICIAN', password: '' });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload: LabUserInput = {
        email: form.email.trim(),
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || undefined,
        role: form.role,
        ...(form.password ? { password: form.password } : {}),
      };
      if (form.id) {
        await updateLabUser(form.id, payload);
        notifySuccess('تم تحديث بيانات المستخدم');
      } else {
        await createLabUser(payload);
        notifySuccess('تم إنشاء المستخدم');
      }
      setDialogOpen(false);
      refresh();
      loadMeta();
    } catch {
      notifyError('تعذر حفظ المستخدم');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async () => {
    if (!confirmUser) return;
    setBusy(true);
    try {
      await updateLabUser(confirmUser.id, { is_active: !confirmUser.is_active });
      notifySuccess(confirmUser.is_active ? 'تم تعطيل الحساب' : 'تم تفعيل الحساب');
      refresh();
      loadMeta();
    } catch {
      notifyError('تعذر تنفيذ العملية');
    } finally {
      setBusy(false);
      setConfirmUser(null);
    }
  };

  const handleResetPassword = async () => {
    if (!resetUser) return;
    if (resetPassword.length < 8) {
      notifyError('كلمة المرور يجب ألا تقل عن 8 أحرف');
      return;
    }
    setResetSubmitting(true);
    try {
      await resetLabUserPassword(resetUser.id, resetPassword);
      notifySuccess('تم إعادة تعيين كلمة المرور');
      setResetUser(null);
      setResetPassword('');
    } catch {
      notifyError('تعذر إعادة تعيين كلمة المرور');
    } finally {
      setResetSubmitting(false);
    }
  };

  const columns = useMemo<DataTableColumn<LabUser>[]>(
    () => [
      { key: 'full_name', label: 'الاسم', render: (u) => <Typography fontWeight={700}>{u.full_name}</Typography> },
      { key: 'email', label: 'البريد الإلكتروني', hideOnMobile: true },
      { key: 'phone', label: 'الجوال', render: (u) => u.phone || '—', hideOnMobile: true },
      { key: 'role', label: 'الدور', render: (u) => {
          if (!u.role) return <StatusChip label="—" tone="neutral" />;
          const r = roles.find((x) => x.code === u.role);
          return <StatusChip label={r ? r.name_ar : u.role} tone={roleTone[u.role] || 'neutral'} />;
        } },
      { key: 'is_active', label: 'الحالة', render: (u) => (u.is_active ? <StatusChip label="نشط" tone="success" /> : <StatusChip label="معطل" tone="neutral" />) },
      { key: 'last_login', label: 'آخر دخول', render: (u) => (u.last_login ? formatDateTime(u.last_login) : '—'), hideOnMobile: true },
      { key: 'created_at', label: 'تاريخ الإنشاء', render: (u) => formatDateTime(u.created_at), hideOnMobile: true },
    ],
    [roles]
  );

  return (
    <Box>
      <DashboardHero
        eyebrow="NQLIS Users"
        title="مستخدمو المختبر"
        subtitle="فريق عمل المعمل القومي للحجر الصحي — الحسابات والأدوار والصلاحيات"
        gradient="emerald"
        avatarLabel={(currentUser?.full_name || 'م').slice(0, 1)}
        chips={[
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>{todayArabic()}</Box>,
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#8ff5d4', flexShrink: 0 }} />
            مباشر
          </Box>,
        ]}
      />

      <Grid container spacing={0} sx={{ mt: 3 }} columnSpacing={3}>
        <Grid item xs={12} md={2.2} lg={1.8}>
          <CommandSectionRail
            sections={SECTIONS as unknown as CommandSectionDef[]}
            active={active}
            onNavigate={scrollTo}
            accent="primary.main"
            label="أقسام الصفحة"
          />
        </Grid>
        <Grid item xs={12} md={9.8} lg={10.2}>

      <Box component="section" ref={register('overview')} data-section="overview" sx={{ scrollMarginTop: '80px' }}>
      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        {[
          { icon: <PeopleIcon />, value: stats.total, label: 'إجمالي المستخدمين', accent: 'primary.main' },
          { icon: <VerifiedUserIcon />, value: stats.active, label: 'حسابات نشطة', accent: 'success.main' },
          { icon: <BlockIcon />, value: stats.disabled, label: 'حسابات معطلة', accent: 'error.main' },
          { icon: <ScienceIcon />, value: roles.length, label: 'أدوار المختبر', accent: 'info.main' },
        ].map((k) => (
          <Grid item xs={12} sm={6} md={3} key={k.label}>
            <KpiCard icon={k.icon} value={k.value} label={k.label} accent={k.accent} />
          </Grid>
        ))}
      </Grid>
      </Box>

      <Box component="section" ref={register('users')} data-section="users" sx={{ scrollMarginTop: '80px' }}>
      <DataTable<LabUser>
        columns={columns}
        rows={rows}
        rowKey={(u) => u.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title="قائمة مستخدمي المختبر"
        subtitle={`${count} مستخدم`}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="بحث بالاسم أو البريد أو الجوال..."
        filters={[
          { key: 'role', label: 'الدور', options: roles.map((r) => ({ value: r.code, label: r.name_ar })), value: '', onChange: (v) => setFilter('role', v) },
          { key: 'is_active', label: 'الحالة', options: [{ value: 'true', label: 'نشط' }, { value: 'false', label: 'معطل' }], value: '', onChange: (v) => setFilter('is_active', v) },
        ]}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        toolbar={
          <Stack direction="row" spacing={1}>
            <ExportButton
              filename={`nql-users-${new Date().toISOString().slice(0, 10)}`}
              headers={['الاسم', 'البريد الإلكتروني', 'الجوال', 'الدور', 'الحالة', 'آخر دخول', 'تاريخ الإنشاء']}
              rows={rows.map((u) => [u.full_name, u.email, u.phone || '', roleName(u.role), u.is_active ? 'نشط' : 'معطل', u.last_login ? formatDateTime(u.last_login) : '', formatDateTime(u.created_at)])}
            />
            {canManage && (
              <AppButton variant="primary" startIcon={<AddIcon />} onClick={openCreate}>مستخدم جديد</AppButton>
            )}
          </Stack>
        }
        emptyTitle="لا يوجد مستخدمو مختبر"
        emptyDescription="أضف مستخدماً جديداً لفريق المختبر"
        actions={(u) =>
          canManage ? (
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="إعادة تعيين كلمة المرور">
                <IconButton aria-label="كلمة المرور" size="small" color="warning" onClick={() => { setResetUser(u); setResetPassword(''); }}>
                  <KeyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={u.is_active ? 'تعطيل الحساب' : 'تفعيل الحساب'}>
                <IconButton aria-label="إيقاف" size="small" color={u.is_active ? 'error' : 'success'} onClick={() => setConfirmUser(u)}>
                  {u.is_active ? <BlockIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
              <Tooltip title="تعديل">
                <IconButton aria-label="تعديل" size="small" onClick={() => openEdit(u)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          ) : null
        }
      />

      </Box>
        </Grid>
      </Grid>

      <FormDialog
        open={dialogOpen}
        title={form.id ? 'تعديل مستخدم' : 'مستخدم جديد'}
        icon={<PeopleIcon />}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
        loading={submitting}
        submitLabel={form.id ? 'حفظ التعديلات' : 'إنشاء المستخدم'}
      >
        <FormTextField label="الاسم الكامل" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
        <Box sx={{ height: 16 }} />
        <FormTextField label="البريد الإلكتروني" value={form.email} type="email" onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <Box sx={{ height: 16 }} />
        <FormTextField label="الجوال" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Box sx={{ height: 16 }} />
        <FormSelect
          label="الدور"
          value={form.role}
          options={roles.map((r) => ({ value: r.code, label: r.name_ar }))}
          onChange={(v) => setForm({ ...form, role: v })}
        />
        <Box sx={{ height: 16 }} />
        <FormTextField
          label={form.id ? 'كلمة مرور جديدة (اختياري)' : 'كلمة المرور'}
          value={form.password}
          type="password"
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          helperText="8 أحرف على الأقل"
        />
      </FormDialog>

      <ConfirmDialog
        open={!!confirmUser}
        title={confirmUser?.is_active ? 'تعطيل الحساب' : 'تفعيل الحساب'}
        message={`هل أنت متأكد من ${confirmUser?.is_active ? 'تعطيل' : 'تفعيل'} حساب "${confirmUser?.full_name}"؟`}
        confirmLabel={confirmUser?.is_active ? 'تعطيل' : 'تفعيل'}
        loading={busy}
        onConfirm={handleToggleActive}
        onClose={() => !busy && setConfirmUser(null)}
      />

      <FormDialog
        open={!!resetUser}
        title="إعادة تعيين كلمة المرور"
        icon={<KeyIcon />}
        onClose={() => setResetUser(null)}
        onSubmit={handleResetPassword}
        loading={resetSubmitting}
        submitLabel="إعادة التعيين"
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          مستخدم: <strong>{resetUser?.full_name}</strong> ({resetUser?.email})
        </Typography>
        <FormTextField
          label="كلمة المرور الجديدة"
          value={resetPassword}
          type="password"
          onChange={(e) => setResetPassword(e.target.value)}
          helperText="8 أحرف على الأقل"
        />
      </FormDialog>
    </Box>
  );
};

export default NqlisUsers;