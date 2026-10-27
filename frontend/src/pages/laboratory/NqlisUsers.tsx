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
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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

  const sections = useMemo<CommandSectionDef[]>(
    () => [
      { id: 'overview', label: t('laboratory.shared.overview'), icon: <PeopleIcon fontSize="small" /> },
      { id: 'users', label: t('laboratory.nqlisUsers.sectionUsers'), icon: <ScienceIcon fontSize="small" /> },
    ],
    [t],
  );

  const { active, register, scrollTo } = useCommandSections(sections, [loading, sections]);

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
        notifySuccess(t('laboratory.nqlisUsers.updated'));
      } else {
        await createLabUser(payload);
        notifySuccess(t('laboratory.nqlisUsers.created'));
      }
      setDialogOpen(false);
      refresh();
      loadMeta();
    } catch {
      notifyError(t('laboratory.nqlisUsers.saveError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async () => {
    if (!confirmUser) return;
    setBusy(true);
    try {
      await updateLabUser(confirmUser.id, { is_active: !confirmUser.is_active });
      notifySuccess(confirmUser.is_active ? t('laboratory.nqlisUsers.disabledMsg') : t('laboratory.nqlisUsers.enabledMsg'));
      refresh();
      loadMeta();
    } catch {
      notifyError(t('laboratory.nqlisUsers.toggleError'));
    } finally {
      setBusy(false);
      setConfirmUser(null);
    }
  };

  const handleResetPassword = async () => {
    if (!resetUser) return;
    if (resetPassword.length < 8) {
      notifyError(t('laboratory.nqlisUsers.pwdTooShort'));
      return;
    }
    setResetSubmitting(true);
    try {
      await resetLabUserPassword(resetUser.id, resetPassword);
      notifySuccess(t('laboratory.nqlisUsers.resetDone'));
      setResetUser(null);
      setResetPassword('');
    } catch {
      notifyError(t('laboratory.nqlisUsers.resetError'));
    } finally {
      setResetSubmitting(false);
    }
  };

  const exportHeaders = useMemo(
    () => [
      t('laboratory.nqlisUsers.colName'),
      t('laboratory.nqlisUsers.colEmail'),
      t('laboratory.nqlisUsers.colPhone'),
      t('laboratory.nqlisUsers.colRole'),
      t('laboratory.shared.colStatus'),
      t('laboratory.nqlisUsers.colLastLogin'),
      t('laboratory.nqlisUsers.colCreated'),
    ],
    [t],
  );

  const activeLabel = t('laboratory.nqlisUsers.active');
  const disabledLabel = t('laboratory.nqlisUsers.disabled');

  const columns = useMemo<DataTableColumn<LabUser>[]>(
    () => [
      { key: 'full_name', label: t('laboratory.nqlisUsers.colName'), render: (u) => <Typography fontWeight={700}>{u.full_name}</Typography> },
      { key: 'email', label: t('laboratory.nqlisUsers.colEmail'), hideOnMobile: true },
      { key: 'phone', label: t('laboratory.nqlisUsers.colPhone'), render: (u) => u.phone || '—', hideOnMobile: true },
      { key: 'role', label: t('laboratory.nqlisUsers.colRole'), render: (u) => {
          if (!u.role) return <StatusChip label="—" tone="neutral" />;
          const r = roles.find((x) => x.code === u.role);
          return <StatusChip label={r ? r.name_ar : u.role} tone={roleTone[u.role] || 'neutral'} />;
        } },
      { key: 'is_active', label: t('laboratory.shared.colStatus'), render: (u) => (u.is_active ? <StatusChip label={activeLabel} tone="success" /> : <StatusChip label={disabledLabel} tone="neutral" />) },
      { key: 'last_login', label: t('laboratory.nqlisUsers.colLastLogin'), render: (u) => (u.last_login ? formatDateTime(u.last_login) : '—'), hideOnMobile: true },
      { key: 'created_at', label: t('laboratory.nqlisUsers.colCreated'), render: (u) => formatDateTime(u.created_at), hideOnMobile: true },
    ],
    [roles, t, activeLabel, disabledLabel]
  );

  const isAdmin = Boolean(confirmUser?.is_active);
  const confirmTitle = isAdmin ? t('laboratory.nqlisUsers.disableAccount') : t('laboratory.nqlisUsers.enableAccount');
  const confirmMessage = isAdmin
    ? t('laboratory.nqlisUsers.confirmDisable', { name: confirmUser?.full_name ?? '' })
    : t('laboratory.nqlisUsers.confirmEnable', { name: confirmUser?.full_name ?? '' });
  const confirmLabel = isAdmin ? t('laboratory.nqlisUsers.disable') : t('laboratory.nqlisUsers.enable');

  return (
    <Box>
      <DashboardHero
        eyebrow="NQLIS Users"
        title={t('laboratory.nqlisUsers.title')}
        subtitle={t('laboratory.nqlisUsers.subtitle')}
        gradient="emerald"
        avatarLabel={(currentUser?.full_name || t('laboratory.nqlisUsers.avatarFallback')).slice(0, 1)}
        chips={[
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>{todayArabic()}</Box>,
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#8ff5d4', flexShrink: 0 }} />
            {t('laboratory.shared.live')}
          </Box>,
        ]}
      />

      <Grid container spacing={0} sx={{ mt: 3 }} columnSpacing={3}>
        <Grid item xs={12} md={2.2} lg={1.8}>
          <CommandSectionRail
            sections={sections}
            active={active}
            onNavigate={scrollTo}
            accent="primary.main"
            label={t('laboratory.nqlisUsers.railLabel')}
          />
        </Grid>
        <Grid item xs={12} md={9.8} lg={10.2}>

      <Box component="section" ref={register('overview')} data-section="overview" sx={{ scrollMarginTop: '80px' }}>
      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        {[
          { icon: <PeopleIcon />, value: stats.total, label: t('laboratory.nqlisUsers.kpiTotal'), accent: 'primary.main' },
          { icon: <VerifiedUserIcon />, value: stats.active, label: t('laboratory.nqlisUsers.kpiActive'), accent: 'success.main' },
          { icon: <BlockIcon />, value: stats.disabled, label: t('laboratory.nqlisUsers.kpiDisabled'), accent: 'error.main' },
          { icon: <ScienceIcon />, value: roles.length, label: t('laboratory.nqlisUsers.kpiRoles'), accent: 'info.main' },
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
        title={t('laboratory.nqlisUsers.tableTitle')}
        subtitle={t('laboratory.nqlisUsers.tableSubtitle', { count })}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder={t('laboratory.nqlisUsers.searchPlaceholder')}
        filters={[
          { key: 'role', label: t('laboratory.nqlisUsers.colRole'), options: roles.map((r) => ({ value: r.code, label: r.name_ar })), value: '', onChange: (v) => setFilter('role', v) },
          { key: 'is_active', label: t('laboratory.shared.colStatus'), options: [{ value: 'true', label: activeLabel }, { value: 'false', label: disabledLabel }], value: '', onChange: (v) => setFilter('is_active', v) },
        ]}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        toolbar={
          <Stack direction="row" spacing={1}>
            <ExportButton
              filename={`nql-users-${new Date().toISOString().slice(0, 10)}`}
              headers={exportHeaders}
              rows={rows.map((u) => [u.full_name, u.email, u.phone || '', roleName(u.role), u.is_active ? activeLabel : disabledLabel, u.last_login ? formatDateTime(u.last_login) : '', formatDateTime(u.created_at)])}
            />
            {canManage && (
              <AppButton variant="primary" startIcon={<AddIcon />} onClick={openCreate}>{t('laboratory.nqlisUsers.newUser')}</AppButton>
            )}
          </Stack>
        }
        emptyTitle={t('laboratory.nqlisUsers.emptyTitle')}
        emptyDescription={t('laboratory.nqlisUsers.emptyDescription')}
        actions={(u) =>
          canManage ? (
            <Stack direction="row" spacing={0.5}>
              <Tooltip title={t('laboratory.nqlisUsers.resetTip')}>
                <IconButton aria-label={t('laboratory.nqlisUsers.pwdLabel')} size="small" color="warning" onClick={() => { setResetUser(u); setResetPassword(''); }}>
                  <KeyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={u.is_active ? t('laboratory.nqlisUsers.disableAccount') : t('laboratory.nqlisUsers.enableAccount')}>
                <IconButton aria-label={t('laboratory.nqlisUsers.toggleAria')} size="small" color={u.is_active ? 'error' : 'success'} onClick={() => setConfirmUser(u)}>
                  {u.is_active ? <BlockIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
              <Tooltip title={t('laboratory.nqlisUsers.editTip')}>
                <IconButton aria-label={t('laboratory.nqlisUsers.editTip')} size="small" onClick={() => openEdit(u)}>
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
        title={form.id ? t('laboratory.nqlisUsers.dialogEdit') : t('laboratory.nqlisUsers.newUser')}
        icon={<PeopleIcon />}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
        loading={submitting}
        submitLabel={form.id ? t('laboratory.nqlisUsers.submitEdit') : t('laboratory.nqlisUsers.submitCreate')}
      >
        <FormTextField label={t('laboratory.nqlisUsers.lblFullName')} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
        <Box sx={{ height: 16 }} />
        <FormTextField label={t('laboratory.nqlisUsers.colEmail')} value={form.email} type="email" onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <Box sx={{ height: 16 }} />
        <FormTextField label={t('laboratory.nqlisUsers.colPhone')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Box sx={{ height: 16 }} />
        <FormSelect
          label={t('laboratory.nqlisUsers.colRole')}
          value={form.role}
          options={roles.map((r) => ({ value: r.code, label: r.name_ar }))}
          onChange={(v) => setForm({ ...form, role: v })}
        />
        <Box sx={{ height: 16 }} />
        <FormTextField
          label={form.id ? t('laboratory.nqlisUsers.pwdNewOptional') : t('laboratory.nqlisUsers.pwdLabel')}
          value={form.password}
          type="password"
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          helperText={t('laboratory.nqlisUsers.pwdHint')}
        />
      </FormDialog>

      <ConfirmDialog
        open={!!confirmUser}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel={confirmLabel}
        loading={busy}
        onConfirm={handleToggleActive}
        onClose={() => !busy && setConfirmUser(null)}
      />

      <FormDialog
        open={!!resetUser}
        title={t('laboratory.nqlisUsers.resetTip')}
        icon={<KeyIcon />}
        onClose={() => setResetUser(null)}
        onSubmit={handleResetPassword}
        loading={resetSubmitting}
        submitLabel={t('laboratory.nqlisUsers.resetSubmit')}
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {t('laboratory.nqlisUsers.resetUserPrefix')} <strong>{resetUser?.full_name}</strong> ({resetUser?.email})
        </Typography>
        <FormTextField
          label={t('laboratory.nqlisUsers.pwdNew')}
          value={resetPassword}
          type="password"
          onChange={(e) => setResetPassword(e.target.value)}
          helperText={t('laboratory.nqlisUsers.pwdHint')}
        />
      </FormDialog>
    </Box>
  );
};

export default NqlisUsers;