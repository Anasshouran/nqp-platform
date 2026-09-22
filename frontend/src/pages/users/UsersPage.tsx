import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PeopleIcon from '@mui/icons-material/People';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import BusinessIcon from '@mui/icons-material/Business';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { DataTable, StatusChip, ExportButton, ConfirmDialog } from '../../components/uikit';
import KpiCard from '../../components/dashboard/KpiCard';
import DashboardHero from '../../components/dashboard/DashboardHero';
import { useServerTable } from '../../hooks/useServerTable';
import { getUsers, updateUser, getRoles } from '../../api/endpoints/users';
import type { User } from '../../types/user';
import UserFormDialog from '../../components/forms/UserFormDialog';
import UserPermissionsDialog from '../../components/users/UserPermissionsDialog';
import UserAssignmentsDialog from '../../components/users/UserAssignmentsDialog';
import UserProfileDialog from '../../components/users/UserProfileDialog';
import { userType } from '../../utils/status';
import { formatDateTime } from '../../utils/formatters';
import { notifyError, notifySuccess } from '../../utils/toast';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, ChartTooltip, Legend, Filler);

const todayArabic = () => new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const userTypeOptions = Object.entries(userType).map(([value, meta]) => ({
  value,
  label: meta.label,
}));

interface UserStats {
  total: number;
  active: number;
  disabled: number;
  newThisWeek: number;
  govCount: number;
  typeCounts: Record<string, number>;
  series: { labels: string[]; counts: number[] };
}

const buildStats = (users: User[]): UserStats => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 6);

  const buckets: Date[] = [];
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    buckets.push(d);
  }
  const series: UserStats['series'] = {
    labels: buckets.map((d) => d.toLocaleDateString('ar', { weekday: 'short', day: 'numeric' })),
    counts: buckets.map((b) => 0),
  };

  const typeCounts: Record<string, number> = {};
  let newThisWeek = 0;

  users.forEach((u) => {
    const t = u.user_type || 'UNKNOWN';
    typeCounts[t] = (typeCounts[t] ?? 0) + 1;
    if (u.created_at) {
      const day = new Date(u.created_at);
      day.setHours(0, 0, 0, 0);
      if (day >= weekAgo) newThisWeek += 1;
      const idx = buckets.findIndex((b) => b.getTime() === day.getTime());
      if (idx >= 0) series.counts[idx] += 1;
    }
  });

  return {
    total: users.length,
    active: users.filter((u) => u.is_active).length,
    disabled: users.filter((u) => !u.is_active).length,
    newThisWeek,
    govCount: typeCounts.GOVERNMENT ?? 0,
    typeCounts,
    series,
  };
};

const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { rtl: true, backgroundColor: '#14312a', titleFont: { family: 'IBM Plex Sans Arabic' }, bodyFont: { family: 'IBM Plex Sans Arabic' } },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { family: 'IBM Plex Sans Arabic' }, color: '#5b6f68' } },
    y: { beginAtZero: true, ticks: { precision: 0, font: { family: 'IBM Plex Sans Arabic' }, color: '#5b6f68' }, grid: { color: 'rgba(16,40,34,0.06)' } },
  },
};

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '64%',
  plugins: {
    legend: { position: 'bottom' as const, rtl: true, labels: { font: { family: 'IBM Plex Sans Arabic' }, boxWidth: 12, padding: 12, color: '#5b6f68' } },
    tooltip: { rtl: true, backgroundColor: '#14312a', bodyFont: { family: 'IBM Plex Sans Arabic' } },
  },
};

const doughnutColors = ['#0c7f6a', '#a98a2e', '#2f6dd0', '#c63a3a', '#8a5a00', '#425a53', '#7c3aed'];

const SECTIONS = [
  { id: 'overview', label: 'إحصائيات', icon: <PeopleIcon fontSize="small" /> },
  { id: 'charts', label: 'الرسوم البيانية', icon: <TrendingUpIcon fontSize="small" /> },
  { id: 'table', label: 'قائمة المستخدمين', icon: <AssignmentIndIcon fontSize="small" /> },
] as const;

const UsersPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [permsUser, setPermsUser] = useState<User | null>(null);
  const [assignUser, setAssignUser] = useState<User | null>(null);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [confirmUser, setConfirmUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [rolesCount, setRolesCount] = useState(0);
  const [busy, setBusy] = useState(false);

  const table = useServerTable<User>({ fetchData: getUsers });
  const { rows, count, loading, error, searchInput, setSearchInput, sortBy, sortOrder, setSorting, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, setFilter } = table;

  const { active, register, scrollTo } = useCommandSections(SECTIONS as unknown as CommandSectionDef[], [loading]);

  const loadStats = () => {
    getUsers({ page_size: 500 })
      .then((r) => setStats(buildStats(r.data.data.results || [])))
      .catch(() => undefined);
    getRoles()
      .then((r) => setRolesCount(Array.isArray(r.data.data) ? r.data.data.length : 0))
      .catch(() => undefined);
  };

  useEffect(() => {
    loadStats();
  }, []);

  const openCreate = () => {
    setEditingUser(null);
    setDialogOpen(true);
  };
  const openEdit = (user: User) => {
    setEditingUser(user);
    setDialogOpen(true);
  };

  const handleToggleActive = async () => {
    if (!confirmUser) return;
    setBusy(true);
    try {
      await updateUser(confirmUser.id, { is_active: !confirmUser.is_active });
      notifySuccess(confirmUser.is_active ? 'تم تعطيل الحساب' : 'تم تفعيل الحساب');
      refresh();
      loadStats();
    } catch {
      notifyError('تعذر تنفيذ العملية');
    } finally {
      setBusy(false);
      setConfirmUser(null);
    }
  };

  const chartData = useMemo(() => {
    if (!stats) return null;
    const entries = Object.entries(stats.typeCounts).sort((a, b) => b[1] - a[1]);
    return {
      labels: entries.map(([k]) => userType[k]?.label || k),
      counts: entries.map(([, v]) => v),
    };
  }, [stats]);

  return (
    <Box>
      <DashboardHero
        eyebrow="Identity & Access"
        title="نظام إدارة المستخدمين"
        subtitle="إدارة حسابات الموظفين والأدوار والصلاحيات — عرض، إنشاء، تعديل، تفعيل/تعطيل"
        gradient="emerald"
        avatarLabel="ن"
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
            label="أقسام اللوحة"
          />
        </Grid>
        <Grid item xs={12} md={9.8} lg={10.2}>
      <Box component="section" ref={register('overview')} data-section="overview" sx={{ scrollMarginTop: '80px' }}>
      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        {[
          { icon: <PeopleIcon />, value: stats ? stats.total : '…', label: 'إجمالي المستخدمين', accent: 'primary.main' },
          { icon: <VerifiedUserIcon />, value: stats ? stats.active : '…', label: 'حسابات نشطة', accent: 'success.main' },
          { icon: <BlockIcon />, value: stats ? stats.disabled : '…', label: 'حسابات معطلة', accent: 'error.main' },
          { icon: <PersonAddIcon />, value: stats ? stats.newThisWeek : '…', label: 'جدد هذا الأسبوع', accent: 'info.main' },
          { icon: <BusinessIcon />, value: stats ? stats.govCount : '…', label: 'جهات حكومية', accent: 'warning.main' },
        ].map((k) => (
          <Grid item xs={12} sm={6} md={2.4} key={k.label}>
            <KpiCard icon={k.icon} value={k.value} label={k.label} accent={k.accent} />
          </Grid>
        ))}
      </Grid>
      </Box>

      <Box component="section" ref={register('charts')} data-section="charts" sx={{ scrollMarginTop: '80px' }}>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  إنشاء الحسابات (آخر 14 يوم)
                </Typography>
                <TrendingUpIcon color="primary" />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                وتيرة نمو الحسابات في المنصة
              </Typography>
              <Box sx={{ height: 260, mt: 2 }}>
                {!stats ? (
                  <Skeleton variant="rounded" width="100%" height={260} />
                ) : (
                  <Line
                    data={{
                      labels: stats.series.labels,
                      datasets: [
                        {
                          label: 'مستخدمو',
                          data: stats.series.counts,
                          borderColor: '#0c7f6a',
                          backgroundColor: 'rgba(12,127,106,0.14)',
                          fill: true,
                          tension: 0.4,
                          pointRadius: 3,
                          pointHoverRadius: 6,
                        },
                      ],
                    }}
                    options={lineOptions}
                  />
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} lg={4}>
          <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                توزيع أنواع المستخدمين
              </Typography>
              <Typography variant="caption" color="text.secondary">
                مواطن، مسافر، مستورد، جهات حكومية...
              </Typography>
              <Box sx={{ height: 220, mt: 2, display: 'grid', placeItems: 'center' }}>
                {!chartData || chartData.labels.length === 0 ? (
                  <Skeleton variant="circular" width={180} height={180} />
                ) : (
                  <Doughnut
                    data={{
                      labels: chartData.labels,
                      datasets: [
                        {
                          data: chartData.counts,
                          backgroundColor: chartData.labels.map((_, i) => doughnutColors[i % doughnutColors.length]),
                          borderColor: '#fff',
                          borderWidth: 3,
                        },
                      ],
                    }}
                    options={doughnutOptions}
                  />
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      </Box>

      <Box component="section" ref={register('table')} data-section="table" sx={{ scrollMarginTop: '80px' }}>
      <DataTable<User>
        columns={[
          { key: 'full_name', label: 'الاسم', sortable: true, render: (u) => <Typography sx={{ fontWeight: 700 }}>{u.full_name}</Typography> },
          { key: 'username', label: 'اسم المستخدم', sortable: true, render: (u) => u.username || '—', hideOnMobile: true },
          { key: 'email', label: 'البريد الإلكتروني', sortable: true, hideOnMobile: true },
          { key: 'phone', label: 'الجوال', hideOnMobile: true },
          { key: 'user_type', label: 'نوع المستخدم', render: (u) => { const meta = u.user_type ? userType[u.user_type] : undefined; return meta ? <StatusChip label={meta.label} tone={meta.tone} /> : <StatusChip label="—" tone="neutral" />; }, hideOnMobile: true },
          { key: 'role', label: 'الدور', render: (u) => (u.role ? <StatusChip label={u.role} tone="primary" variant="outlined" /> : '—'), hideOnMobile: true },
          { key: 'primary_org', label: 'القطاع/النقطة', render: (u) => {
              const org = u.primary_org;
              if (!org) return <Typography variant="caption" color="text.secondary">—</Typography>;
              const parts = [org.sector_name, org.entry_point_name, org.department_name].filter(Boolean);
              return <Typography variant="body2">{parts.join(' · ') || '—'}</Typography>;
            }, hideOnMobile: true },
          { key: 'employee_number', label: 'الرقم الوظيفي', render: (u) => u.employee_number || '—', hideOnMobile: true },
          { key: 'permissions', label: 'تجاوزات', render: (u) => {
              const extra = (u.extra_permissions || []).length;
              const blocked = (u.blocked_permissions || []).length;
              if (!extra && !blocked) return <Typography variant="caption" color="text.secondary">—</Typography>;
              return (
                <Stack direction="row" spacing={0.5}>
                  {extra > 0 && <StatusChip label={`+${extra}`} tone="success" variant="outlined" />}
                  {blocked > 0 && <StatusChip label={`−${blocked}`} tone="error" variant="outlined" />}
                </Stack>
              );
            }, hideOnMobile: true },
          { key: 'is_active', label: 'الحالة', render: (u) => (u.is_active ? <StatusChip label="نشط" tone="success" /> : <StatusChip label="معطل" tone="neutral" />) },
          { key: 'last_login', label: 'آخر دخول', sortable: true, render: (u) => (u.last_login ? formatDateTime(u.last_login) : '—'), hideOnMobile: true },
          { key: 'created_at', label: 'تاريخ الإنشاء', sortable: true, render: (u) => formatDateTime(u.created_at), hideOnMobile: true },
        ]}
        rows={rows}
        rowKey={(u) => u.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title="قائمة المستخدمين"
        subtitle={`${count} مستخدم · ${rolesCount} دور`}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="بحث بالاسم أو البريد أو الجوال..."
        filters={[
          { key: 'user_type', label: 'نوع المستخدم', options: userTypeOptions, value: '', onChange: (v) => setFilter('user_type', v) },
          { key: 'is_active', label: 'الحالة', options: [{ value: 'true', label: 'نشط' }, { value: 'false', label: 'معطل' }], value: '', onChange: (v) => setFilter('is_active', v) },
        ]}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSorting}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        toolbar={<ExportButton filename={`users-${new Date().toISOString().slice(0, 10)}`} headers={['الاسم', 'اسم المستخدم', 'البريد الإلكتروني', 'الجوال', 'نوع المستخدم', 'الدور', 'القطاع/النقطة', 'الرقم الوظيفي', 'الحالة', 'آخر دخول', 'تاريخ الإنشاء']} rows={rows.map((u) => [u.full_name, u.username || '', u.email, u.phone || '', u.user_type ? userType[u.user_type]?.label || u.user_type : '', u.role || '', [u.primary_org?.sector_name, u.primary_org?.entry_point_name, u.primary_org?.department_name].filter(Boolean).join(' · '), u.employee_number || '', u.is_active ? 'نشط' : 'معطل', u.last_login ? formatDateTime(u.last_login) : '', formatDateTime(u.created_at)])} />}
        emptyTitle="لا يوجد مستخدمون"
        emptyDescription="ابدأ بإضافة مستخدم جديد"
        actions={(u) => (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="الملف الشخصي الكامل">
              <IconButton
                aria-label="الملف الشخصي الكامل"
                size="small"
                color="info"
                onClick={() => setProfileUser(u)}
              >
                <PersonSearchIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="الصلاحيات الفعلية">
              <IconButton
                aria-label="الصلاحيات الفعلية"
                size="small"
                color="primary"
                onClick={() => setPermsUser(u)}
              >
                <AdminPanelSettingsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="تعيينات الأدوار والتعيينات الهيكلية">
              <IconButton
                aria-label="التعيينات"
                size="small"
                color="primary"
                onClick={() => setAssignUser(u)}
              >
                <AssignmentIndIcon fontSize="small" />
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
        )}
      />

      </Box>
        </Grid>
      </Grid>

      <UserFormDialog
        open={dialogOpen}
        user={editingUser}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          setDialogOpen(false);
          refresh();
          loadStats();
        }}
      />

      <UserPermissionsDialog open={!!permsUser} user={permsUser} onClose={() => setPermsUser(null)} />

      <UserAssignmentsDialog open={!!assignUser} user={assignUser} onClose={() => setAssignUser(null)} onSaved={refresh} />

      <UserProfileDialog open={!!profileUser} user={profileUser} onClose={() => setProfileUser(null)} />

      <ConfirmDialog
        open={!!confirmUser}
        title={confirmUser?.is_active ? 'تعطيل الحساب' : 'تفعيل الحساب'}
        message={`هل أنت متأكد من ${confirmUser?.is_active ? 'تعطيل' : 'تفعيل'} حساب "${confirmUser?.full_name}"؟`}
        confirmLabel={confirmUser?.is_active ? 'تعطيل' : 'تفعيل'}
        loading={busy}
        onConfirm={handleToggleActive}
        onClose={() => !busy && setConfirmUser(null)}
      />
    </Box>
  );
};

export default UsersPage;
