import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Stack from '@mui/material/Stack';
import LinearProgress from '@mui/material/LinearProgress';
import StorageIcon from '@mui/icons-material/Storage';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import PeopleIcon from '@mui/icons-material/People';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import BackupIcon from '@mui/icons-material/Backup';
import BackupTableIcon from '@mui/icons-material/BackupTable';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import SpeedIcon from '@mui/icons-material/Speed';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import StorageUsageIcon from '@mui/icons-material/Storage';
import BuildIcon from '@mui/icons-material/Build';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import SecurityIcon from '@mui/icons-material/Security';
import HistoryIcon from '@mui/icons-material/History';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import RefreshIcon from '@mui/icons-material/Refresh';
import { PageHeader, EmptyState } from '../../components/common';
import { DataTable, StatusChip } from '../../components/ui';
import DashboardHero from '../../components/dashboard/DashboardHero';
import KpiCard from '../../components/dashboard/KpiCard';
import { useServerTable } from '../../hooks/useServerTable';
import { useTableExport } from '../../hooks/useTableExport';
import {
  acknowledgeAlert,
  getActivityLogs,
  getAuditLogs,
  getBackups,
  getDatabases,
  getDbAlerts,
  getDbOverview,
  getDbPermissions,
  getDbRoles,
  getDbSettings,
  getDbUsers,
  getDisasterRecoveryPlans,
  getMaintenanceJobs,
  getPerformance,
  getPerformanceLatest,
  getQueries,
  getReplicationNodes,
  getRestores,
  getSchemas,
  getSecurityPolicies,
  getSlowQueries,
  getStorageUsage,
  resolveAlert,
  runMaintenanceJob,
} from '../../api/endpoints/dbAdmin';
import type {
  ActivityLog,
  AuditLog,
  Backup,
  Database,
  DbAdminOverview,
  DbAlert,
  DbPermission,
  DbRole,
  DbSchema,
  DbUser,
  DisasterRecoveryPlan,
  MaintenanceJob,
  PerformanceMetric,
  QueryStatistic,
  ReplicationNode,
  RestoreHistory,
  SecurityPolicy,
  StorageUsage,
} from '../../types/dbAdmin';
import {
  backupStatus,
  backupType,
  dbAlertSeverity,
  dbAlertStatus,
  dbAlertType,
  dbSettingGroup,
  dbStatus,
  dbType,
  dbUserType,
  drPlanStatus,
  maintenanceJobType,
  maintenanceStatus,
  replicationNodeType,
  replicationStatus,
  restoreStatus,
  syncMode,
} from '../../utils/status';
import { formatDateTime } from '../../utils/formatters';
import { notifySuccess, notifyError } from '../../utils/toast';
import type { StatusMeta } from '../../utils/status';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';

const todayArabic = () => new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const dbStatusOptions = Object.entries(dbStatus).map(([v, m]) => ({ value: v, label: m.label }));
const dbTypeOptions = Object.entries(dbType).map(([v, m]) => ({ value: v, label: m.label }));
const backupTypeOptions = Object.entries(backupType).map(([v, m]) => ({ value: v, label: m.label }));
const backupStatusOptions = Object.entries(backupStatus).map(([v, m]) => ({ value: v, label: m.label }));
const replicationStatusOptions = Object.entries(replicationStatus).map(([v, m]) => ({ value: v, label: m.label }));
const maintenanceTypeOptions = Object.entries(maintenanceJobType).map(([v, m]) => ({ value: v, label: m.label }));
const maintenanceStatusOptions = Object.entries(maintenanceStatus).map(([v, m]) => ({ value: v, label: m.label }));
const alertTypeOptions = Object.entries(dbAlertType).map(([v, m]) => ({ value: v, label: m.label }));
const alertSeverityOptions = Object.entries(dbAlertSeverity).map(([v, m]) => ({ value: v, label: m.label }));
const alertStatusOptions = Object.entries(dbAlertStatus).map(([v, m]) => ({ value: v, label: m.label }));

const statusChip = (meta: StatusMeta | undefined, value: string) =>
  meta ? <StatusChip label={meta.label} tone={meta.tone} /> : value;

const DashboardTab = () => {
  const [overview, setOverview] = useState<DbAdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);

  const load = () => {
    setLoading(true);
    getDbOverview()
      .then((r) => setOverview(r.data.data))
      .finally(() => setLoading(false));
    getPerformanceLatest().then((r) => setMetrics(r.data.data)).catch(() => undefined);
  };

  useEffect(load, []);

  if (loading && !overview) {
    return <LinearProgress sx={{ mt: 2, borderRadius: 2 }} />;
  }
  if (!overview) {
    return <EmptyState title="لا توجد بيانات" description="تعذر تحميل لوحة معلومات قواعد البيانات" />;
  }

  const latest = metrics[0];
  const bars = [
    { label: 'CPU', value: latest?.cpu_usage ?? overview.performance.cpu },
    { label: 'الذاكرة', value: latest?.memory_usage ?? overview.performance.memory },
    { label: 'نسبة الكسر', value: latest?.cache_hit_ratio ?? overview.performance.cache_hit },
    { label: 'الاتصالات', value: overview.performance.connections },
  ];

  return (
    <Box>
      <Grid container spacing={1.5}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<StorageIcon />} value={overview.database_count} label="قواعد البيانات" accent="primary.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<StorageOutlinedIcon />} value={`${overview.online_count} / ${overview.database_count}`} label="قواعد متصلة" accent="success.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<BackupIcon />} value={overview.backup_total} label="النسخ الاحتياطية" accent="info.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<NotificationsActiveIcon />} value={overview.critical_alerts} label="تنبيهات حرجة" accent="error.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<PeopleIcon />} value={overview.db_user_count} label="مستخدمي قواعد البيانات" accent="warning.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<AdminPanelSettingsIcon />} value={overview.db_role_count} label="الأدوار" accent="secondary.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<SyncAltIcon />} value={`${overview.replication_active} / ${overview.replication_total}`} label="عقد نسخ نشطة" accent="primary.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<BuildIcon />} value={overview.maintenance_due} label="مهام صيانة مجدولة" accent="info.main" />
        </Grid>
      </Grid>

      <Box sx={{ mt: 4, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>مؤشرات الأداء الحالية</Typography>
        <Button size="small" startIcon={<RefreshIcon />} onClick={load}>تحديث</Button>
      </Box>
      <Grid container spacing={2}>
        {bars.map((bar) => (
          <Grid item xs={12} sm={6} md={3} key={bar.label}>
            <Box
              sx={{
                p: 2.5,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'rgba(255,255,255,0.6)',
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{bar.label}</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>
                {typeof bar.value === 'number' ? `${bar.value.toFixed(1)}%` : bar.value}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, Number(bar.value))}
                sx={{ mt: 1.5, borderRadius: 2, height: 7 }}
              />
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

const DatabasesTab = () => {
  const table = useServerTable<Database>({ fetchData: getDatabases });
  const { rows, count, loading, error, searchInput, setSearchInput, sortBy, sortOrder, setSorting, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, setFilter } = table;

  const { exporting, exportAll } = useTableExport(table.fetchAllRows);

  const handleExport = () =>
    exportAll({
      filename: `db-databases-${new Date().toISOString().slice(0, 10)}.csv`,
      headers: ['الاسم', 'النوع', 'الإصدار', 'المضيف', 'الحالة', 'الحجم (م.ب)', 'المخططات', 'النسخ'],
      mapRow: (r: Database) => [
        r.name, dbType[r.db_type]?.label || r.db_type, r.version || '', r.host || '',
        dbStatus[r.status]?.label || r.status, r.size_mb, r.schema_count ?? 0, r.backup_count ?? 0,
      ],
      message: 'تم تصدير قواعد البيانات',
    });

  return (
    <DataTable<Database>
      columns={[
        {
          key: 'name',
          label: 'اسم القاعدة',
          render: (r) => (
            <Box>
              <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.name}</Typography>
              <Typography variant="caption" color="text.secondary">{r.engine || r.db_type}</Typography>
            </Box>
          ),
        },
        { key: 'db_type', label: 'النوع', render: (r) => statusChip(dbType[r.db_type], r.db_type) },
        { key: 'version', label: 'الإصدار', render: (r) => r.version || '—', hideOnMobile: true },
        { key: 'status', label: 'الحالة', render: (r) => statusChip(dbStatus[r.status], r.status) },
        { key: 'size_mb', label: 'الحجم (م.ب)', sortable: true, render: (r) => r.size_mb.toLocaleString(), hideOnMobile: true },
        { key: 'schema_count', label: 'المخططات', render: (r) => r.schema_count ?? 0, hideOnMobile: true },
        { key: 'backup_count', label: 'النسخ', render: (r) => r.backup_count ?? 0, hideOnMobile: true },
      ]}
      rows={rows}
      rowKey={(r) => r.id}
      count={count}
      page={page}
      rowsPerPage={rowsPerPage}
      pageSizeOptions={pageSizeOptions}
      loading={loading}
      error={error}
      title="قواعد البيانات"
      subtitle={`${count} قاعدة`}
      searchInput={searchInput}
      onSearchChange={setSearchInput}
      searchPlaceholder="بحث بالاسم أو المضيف..."
      filters={[
        { key: 'status', label: 'الحالة', options: dbStatusOptions, value: '', onChange: (v) => setFilter('status', v) },
        { key: 'db_type', label: 'النوع', options: dbTypeOptions, value: '', onChange: (v) => setFilter('db_type', v) },
      ]}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSortChange={setSorting}
      onPageChange={setPage}
      onRowsPerPageChange={setRowsPerPage}
      onExport={handleExport}
      exporting={exporting}
      onRefresh={refresh}
      emptyTitle="لا توجد قواعد بيانات"
      emptyDescription="قواعد البيانات المسجلة في النظام تظهر هنا"
    />
  );
};

const SchemasTab = () => {
  const table = useServerTable<DbSchema>({ fetchData: getSchemas });
  const { rows, count, loading, error, searchInput, setSearchInput, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions } = table;

  return (
    <DataTable<DbSchema>
      columns={[
        { key: 'name', label: 'اسم المخطط', render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.name}</Typography> },
        { key: 'database_name', label: 'القاعدة', render: (r) => r.database_name || '—' },
        { key: 'object_count', label: 'الكائنات', render: (r) => r.object_count, hideOnMobile: true },
        { key: 'size_mb', label: 'الحجم (م.ب)', render: (r) => r.size_mb, hideOnMobile: true },
        { key: 'last_analyzed_at', label: 'آخر تحليل', render: (r) => (r.last_analyzed_at ? formatDateTime(r.last_analyzed_at) : '—'), hideOnMobile: true },
      ]}
      rows={rows}
      rowKey={(r) => r.id}
      count={count}
      page={page}
      rowsPerPage={rowsPerPage}
      pageSizeOptions={pageSizeOptions}
      loading={loading}
      error={error}
      title="إدارة المخططات"
      subtitle={`${count} مخطط`}
      searchInput={searchInput}
      onSearchChange={setSearchInput}
      searchPlaceholder="بحث باسم المخطط..."
      onPageChange={setPage}
      onRowsPerPageChange={setRowsPerPage}
      onRefresh={refresh}
      emptyTitle="لا توجد مخططات"
      emptyDescription="المخططات والجداول والوظائف تظهر هنا"
    />
  );
};

const UsersRolesTab = () => {
  const [tab, setTab] = useState(0);
  const users = useServerTable<DbUser>({ fetchData: getDbUsers });
  const roles = useServerTable<DbRole>({ fetchData: getDbRoles });
  const perms = useServerTable<DbPermission>({ fetchData: getDbPermissions });

  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="مستخدمي قواعد البيانات" />
        <Tab label="الأدوار" />
        <Tab label="الصلاحيات" />
      </Tabs>
      {tab === 0 && (
        <DataTable<DbUser>
          columns={[
            { key: 'username', label: 'اسم المستخدم', render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.username}</Typography> },
            { key: 'full_name', label: 'الاسم الكامل', render: (r) => r.full_name || '—' },
            { key: 'role_code', label: 'الدور', render: (r) => r.role_code ? <StatusChip label={r.role_code} tone="primary" /> : '—' },
            { key: 'is_superuser', label: 'النوع', render: (r) => r.is_superuser ? statusChip(dbUserType.SUPERUSER, 'نعم') : statusChip(dbUserType.NORMAL, 'عادي') },
            { key: 'connection_limit', label: 'حد الاتصالات', render: (r) => r.connection_limit, hideOnMobile: true },
            { key: 'last_login_at', label: 'آخر دخول', render: (r) => (r.last_login_at ? formatDateTime(r.last_login_at) : '—'), hideOnMobile: true },
          ]}
          rows={users.rows}
          rowKey={(r) => r.id}
          count={users.count}
          page={users.page}
          rowsPerPage={users.rowsPerPage}
          pageSizeOptions={users.pageSizeOptions}
          loading={users.loading}
          error={users.error}
          title="مستخدمي قواعد البيانات"
          subtitle={`${users.count} مستخدم`}
          searchInput={users.searchInput}
          onSearchChange={users.setSearchInput}
          searchPlaceholder="بحث باسم المستخدم..."
          onPageChange={users.setPage}
          onRowsPerPageChange={users.setRowsPerPage}
          onRefresh={users.refresh}
          emptyTitle="لا يوجد مستخدمون"
          emptyDescription="مستخدمي PostgreSQL المسجلين يظهرون هنا"
        />
      )}
      {tab === 1 && (
        <DataTable<DbRole>
          columns={[
            { key: 'code', label: 'الكود', render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.code}</Typography> },
            { key: 'name_ar', label: 'الاسم' },
            { key: 'is_superuser', label: 'سوبر', render: (r) => (r.is_superuser ? 'نعم' : 'لا') },
            { key: 'can_login', label: 'دخول', render: (r) => (r.can_login ? 'نعم' : 'لا'), hideOnMobile: true },
            { key: 'user_count', label: 'المستخدمون', render: (r) => r.user_count ?? 0, hideOnMobile: true },
            { key: 'permission_count', label: 'الصلاحيات', render: (r) => r.permission_count ?? 0, hideOnMobile: true },
          ]}
          rows={roles.rows}
          rowKey={(r) => r.id}
          count={roles.count}
          page={roles.page}
          rowsPerPage={roles.rowsPerPage}
          pageSizeOptions={roles.pageSizeOptions}
          loading={roles.loading}
          error={roles.error}
          title="أدوار قواعد البيانات"
          subtitle={`${roles.count} دور`}
          searchInput={roles.searchInput}
          onSearchChange={roles.setSearchInput}
          searchPlaceholder="بحث بالكود أو الاسم..."
          onPageChange={roles.setPage}
          onRowsPerPageChange={roles.setRowsPerPage}
          onRefresh={roles.refresh}
          emptyTitle="لا توجد أدوار"
          emptyDescription="أدوار PostgreSQL تظهر هنا"
        />
      )}
      {tab === 2 && (
        <DataTable<DbPermission>
          columns={[
            { key: 'role_code', label: 'الدور', render: (r) => r.role_code ? <StatusChip label={r.role_code} tone="primary" /> : '—' },
            { key: 'database_name', label: 'القاعدة', render: (r) => r.database_name || '—' },
            { key: 'table_name', label: 'الجدول', render: (r) => <Typography sx={{ fontFamily: 'monospace' }}>{r.table_name || '*'}</Typography> },
            { key: 'action', label: 'العملية', render: (r) => <StatusChip label={r.action} tone="info" /> },
            { key: 'granted', label: 'الحالة', render: (r) => (r.granted ? <StatusChip label="ممنوحة" tone="success" /> : <StatusChip label="محظورة" tone="error" />) },
          ]}
          rows={perms.rows}
          rowKey={(r) => r.id}
          count={perms.count}
          page={perms.page}
          rowsPerPage={perms.rowsPerPage}
          pageSizeOptions={perms.pageSizeOptions}
          loading={perms.loading}
          error={perms.error}
          title="صلاحيات قواعد البيانات"
          subtitle={`${perms.count} صلاحية`}
          onPageChange={perms.setPage}
          onRowsPerPageChange={perms.setRowsPerPage}
          onRefresh={perms.refresh}
          emptyTitle="لا توجد صلاحيات"
          emptyDescription="صلاحيات الأدوار على الجداول والمخططات تظهر هنا"
        />
      )}
    </Box>
  );
};

const SecurityTab = () => {
  const policies = useServerTable<SecurityPolicy>({ fetchData: getSecurityPolicies });

  return (
    <Box>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>سياسات الأمن</Typography>
        </Grid>
      </Grid>
      <DataTable<SecurityPolicy>
        columns={[
          { key: 'name', label: 'السياسة', render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.name}</Typography> },
          { key: 'ssl_enabled', label: 'تشفير SSL', render: (r) => (r.ssl_enabled ? <StatusChip label="مفعّل" tone="success" /> : <StatusChip label="معطّل" tone="error" />) },
          { key: 'encryption_enabled', label: 'تشفير البيانات', render: (r) => (r.encryption_enabled ? <StatusChip label="مفعّل" tone="success" /> : <StatusChip label="معطّل" tone="error" />) },
          { key: 'row_level_security', label: 'RLS', render: (r) => (r.row_level_security ? 'مفعّل' : 'معطّل'), hideOnMobile: true },
          { key: 'password_policy', label: 'سياسة كلمات المرور', render: (r) => r.password_policy, hideOnMobile: true },
          { key: 'ip_whitelist', label: 'قائمة IP', render: (r) => r.ip_whitelist?.length ?? 0, hideOnMobile: true },
        ]}
        rows={policies.rows}
        rowKey={(r) => r.id}
        count={policies.count}
        page={policies.page}
        rowsPerPage={policies.rowsPerPage}
        pageSizeOptions={policies.pageSizeOptions}
        loading={policies.loading}
        error={policies.error}
        title="إدارة الأمن"
        subtitle={`${policies.count} سياسة`}
        onPageChange={policies.setPage}
        onRowsPerPageChange={policies.setRowsPerPage}
        onRefresh={policies.refresh}
        emptyTitle="لا توجد سياسات أمن"
        emptyDescription="سياسات الأمن والتشفير والوصول تظهر هنا"
      />
    </Box>
  );
};

const BackupsTab = () => {
  const [tab, setTab] = useState(0);
  const backups = useServerTable<Backup>({ fetchData: getBackups });
  const restores = useServerTable<RestoreHistory>({ fetchData: getRestores });

  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="النسخ الاحتياطية" />
        <Tab label="سجل الاستعادة" />
      </Tabs>
      {tab === 0 && (
        <DataTable<Backup>
          columns={[
            { key: 'database_name', label: 'القاعدة', render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.database_name}</Typography> },
            { key: 'backup_type', label: 'النوع', render: (r) => statusChip(backupType[r.backup_type], r.backup_type) },
            { key: 'status', label: 'الحالة', render: (r) => statusChip(backupStatus[r.status], r.status) },
            { key: 'storage', label: 'التخزين', render: (r) => r.storage, hideOnMobile: true },
            { key: 'size_mb', label: 'الحجم (م.ب)', render: (r) => r.size_mb.toLocaleString(), hideOnMobile: true },
            { key: 'started_at', label: 'بدأت', sortable: true, render: (r) => formatDateTime(r.started_at) },
          ]}
          rows={backups.rows}
          rowKey={(r) => r.id}
          count={backups.count}
          page={backups.page}
          rowsPerPage={backups.rowsPerPage}
          pageSizeOptions={backups.pageSizeOptions}
          loading={backups.loading}
          error={backups.error}
          title="النسخ الاحتياطية"
          subtitle={`${backups.count} نسخة`}
          filters={[
            { key: 'backup_type', label: 'النوع', options: backupTypeOptions, value: '', onChange: (v) => backups.setFilter('backup_type', v) },
            { key: 'status', label: 'الحالة', options: backupStatusOptions, value: '', onChange: (v) => backups.setFilter('status', v) },
          ]}
          onPageChange={backups.setPage}
          onRowsPerPageChange={backups.setRowsPerPage}
          onRefresh={backups.refresh}
          emptyTitle="لا توجد نسخ احتياطية"
          emptyDescription="النسخ الكاملة والتزايدية تظهر هنا"
        />
      )}
      {tab === 1 && (
        <DataTable<RestoreHistory>
          columns={[
            { key: 'database_name', label: 'القاعدة', render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.database_name}</Typography> },
            { key: 'target_database', label: 'الهدف', render: (r) => r.target_database },
            { key: 'backup_type', label: 'نوع النسخة', render: (r) => r.backup_type || '—', hideOnMobile: true },
            { key: 'status', label: 'الحالة', render: (r) => statusChip(restoreStatus[r.status], r.status) },
            { key: 'started_at', label: 'بدأت', render: (r) => formatDateTime(r.started_at) },
            { key: 'restored_by', label: 'نفذها', render: (r) => r.restored_by || '—', hideOnMobile: true },
          ]}
          rows={restores.rows}
          rowKey={(r) => r.id}
          count={restores.count}
          page={restores.page}
          rowsPerPage={restores.rowsPerPage}
          pageSizeOptions={restores.pageSizeOptions}
          loading={restores.loading}
          error={restores.error}
          title="سجل الاستعادة"
          subtitle={`${restores.count} عملية`}
          filters={[
            { key: 'status', label: 'الحالة', options: Object.entries(restoreStatus).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => restores.setFilter('status', v) },
          ]}
          onPageChange={restores.setPage}
          onRowsPerPageChange={restores.setRowsPerPage}
          onRefresh={restores.refresh}
          emptyTitle="لا توجد عمليات استعادة"
          emptyDescription="سجلات عمليات الاستعادة تظهر هنا"
        />
      )}
    </Box>
  );
};

const ReplicationTab = () => {
  const table = useServerTable<ReplicationNode>({ fetchData: getReplicationNodes });
  const { rows, count, loading, error, searchInput, setSearchInput, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, setFilter } = table;

  return (
    <DataTable<ReplicationNode>
      columns={[
        { key: 'name', label: 'العقدة', render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.name}</Typography> },
        { key: 'database_name', label: 'القاعدة', render: (r) => r.database_name || '—' },
        { key: 'node_type', label: 'النوع', render: (r) => statusChip(replicationNodeType[r.node_type], r.node_type) },
        { key: 'sync_mode', label: 'الوضع', render: (r) => statusChip(syncMode[r.sync_mode], r.sync_mode) },
        { key: 'status', label: 'الحالة', render: (r) => statusChip(replicationStatus[r.status], r.status) },
        { key: 'replication_lag_seconds', label: 'التأخر (ثانية)', sortable: true, render: (r) => r.replication_lag_seconds, hideOnMobile: true },
        { key: 'host', label: 'المضيف', render: (r) => r.host, hideOnMobile: true },
      ]}
      rows={rows}
      rowKey={(r) => r.id}
      count={count}
      page={page}
      rowsPerPage={rowsPerPage}
      pageSizeOptions={pageSizeOptions}
      loading={loading}
      error={error}
      title="عقد النسخ المتماثلة"
      subtitle={`${count} عقدة`}
      searchInput={searchInput}
      onSearchChange={setSearchInput}
      searchPlaceholder="بحث بالاسم أو المضيف..."
      filters={[
        { key: 'node_type', label: 'النوع', options: Object.entries(replicationNodeType).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => setFilter('node_type', v) },
        { key: 'status', label: 'الحالة', options: replicationStatusOptions, value: '', onChange: (v) => setFilter('status', v) },
      ]}
      onPageChange={setPage}
      onRowsPerPageChange={setRowsPerPage}
      onRefresh={refresh}
      emptyTitle="لا توجد عقد نسخ"
      emptyDescription="عقد النسخ المتماثلة والأساسية تظهر هنا"
    />
  );
};

const PerformanceTab = () => {
  const table = useServerTable<PerformanceMetric>({ fetchData: getPerformance });
  const { rows, count, loading, error, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions } = table;

  return (
    <DataTable<PerformanceMetric>
      columns={[
        { key: 'recorded_at', label: 'الوقت', render: (r) => formatDateTime(r.recorded_at) },
        { key: 'database_name', label: 'القاعدة', render: (r) => r.database_name || '—', hideOnMobile: true },
        { key: 'cpu_usage', label: 'CPU %', sortable: true, render: (r) => `${r.cpu_usage}%` },
        { key: 'memory_usage', label: 'الذاكرة %', render: (r) => `${r.memory_usage}%`, hideOnMobile: true },
        { key: 'connections', label: 'الاتصالات', render: (r) => r.connections, hideOnMobile: true },
        { key: 'cache_hit_ratio', label: 'نسبة الكسر', render: (r) => `${r.cache_hit_ratio}%`, hideOnMobile: true },
        { key: 'transaction_rate', label: 'المعاملات/ث', render: (r) => r.transaction_rate, hideOnMobile: true },
        { key: 'deadlocks_count', label: 'أقفال ميتة', render: (r) => (r.deadlocks_count > 0 ? <StatusChip label={String(r.deadlocks_count)} tone="error" /> : '0'), hideOnMobile: true },
      ]}
      rows={rows}
      rowKey={(r) => r.id}
      count={count}
      page={page}
      rowsPerPage={rowsPerPage}
      pageSizeOptions={pageSizeOptions}
      loading={loading}
      error={error}
      title="مراقبة الأداء"
      subtitle={`${count} مقياس`}
      onPageChange={setPage}
      onRowsPerPageChange={setRowsPerPage}
      onRefresh={refresh}
      emptyTitle="لا توجد مقاييس أداء"
      emptyDescription="مقاييس الأداء المسجلة تظهر هنا"
    />
  );
};

const QueriesTab = () => {
  const [tab, setTab] = useState(0);
  const queries = useServerTable<QueryStatistic>({ fetchData: getQueries });
  const [slowQueries, setSlowQueries] = useState<QueryStatistic[]>([]);

  useEffect(() => {
    if (tab === 1) {
      getSlowQueries().then((r) => setSlowQueries(r.data.data)).catch(() => undefined);
    }
  }, [tab]);

  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="إحصائيات الاستعلامات" />
        <Tab label="الاستعلامات البطيئة" />
      </Tabs>
      {tab === 0 && (
        <DataTable<QueryStatistic>
          columns={[
            { key: 'query_text', label: 'الاستعلام', render: (r) => <Typography sx={{ fontFamily: 'monospace', fontSize: 12, maxWidth: 420 }}>{r.query_text.slice(0, 80)}{r.query_text.length > 80 ? '…' : ''}</Typography> },
            { key: 'calls', label: 'الاستدعاءات', sortable: true, render: (r) => r.calls, hideOnMobile: true },
            { key: 'total_time_ms', label: 'الزمن الكلي (مللي)', sortable: true, render: (r) => r.total_time_ms.toLocaleString() },
            { key: 'mean_time_ms', label: 'المتوسط (مللي)', sortable: true, render: (r) => r.mean_time_ms.toFixed(2) },
            { key: 'rows', label: 'الصفوف', render: (r) => r.rows, hideOnMobile: true },
            { key: 'is_slow', label: 'بطيء', render: (r) => (r.is_slow ? <StatusChip label="نعم" tone="error" /> : <StatusChip label="لا" tone="success" />) },
            { key: 'is_indexed', label: 'مفهرس', render: (r) => (r.is_indexed ? <StatusChip label="نعم" tone="success" /> : <StatusChip label="لا" tone="warning" />), hideOnMobile: true },
          ]}
          rows={queries.rows}
          rowKey={(r) => r.id}
          count={queries.count}
          page={queries.page}
          rowsPerPage={queries.rowsPerPage}
          pageSizeOptions={queries.pageSizeOptions}
          loading={queries.loading}
          error={queries.error}
          title="تحليل أداء الاستعلامات"
          subtitle={`${queries.count} استعلام`}
          onPageChange={queries.setPage}
          onRowsPerPageChange={queries.setRowsPerPage}
          onRefresh={queries.refresh}
          emptyTitle="لا توجد استعلامات"
          emptyDescription="إحصائيات الاستعلامات المنفذة تظهر هنا"
        />
      )}
      {tab === 1 && (
        <DataTable<QueryStatistic>
          columns={[
            { key: 'query_text', label: 'الاستعلام', render: (r) => <Typography sx={{ fontFamily: 'monospace', fontSize: 12 }}>{r.query_text.slice(0, 100)}{r.query_text.length > 100 ? '…' : ''}</Typography> },
            { key: 'database_name', label: 'القاعدة', render: (r) => r.database_name || '—' },
            { key: 'mean_time_ms', label: 'المتوسط (مللي)', render: (r) => <StatusChip label={`${r.mean_time_ms.toFixed(2)} ms`} tone={r.mean_time_ms > 5 ? 'error' : 'warning'} /> },
            { key: 'calls', label: 'الاستدعاءات', render: (r) => r.calls, hideOnMobile: true },
            { key: 'rows', label: 'الصفوف', render: (r) => r.rows, hideOnMobile: true },
            { key: 'is_indexed', label: 'مفهرس', render: (r) => (r.is_indexed ? <StatusChip label="نعم" tone="success" /> : <StatusChip label="غير مفهرس" tone="warning" />) },
          ]}
          rows={slowQueries}
          rowKey={(r) => r.id}
          count={slowQueries.length}
          page={1}
          rowsPerPage={slowQueries.length}
          loading={slowQueries.length === 0}
          title="الاستعلامات البطيئة"
          subtitle="أعلى الاستعلامات استهلاكاً للوقت"
          emptyTitle="لا توجد استعلامات بطيئة"
          emptyDescription="الاستعلامات التي تتجاوز حد الأداء تظهر هنا"
        />
      )}
    </Box>
  );
};

const StorageTab = () => {
  const table = useServerTable<StorageUsage>({ fetchData: getStorageUsage });
  const { rows, count, loading, error, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, setFilter } = table;

  return (
    <DataTable<StorageUsage>
      columns={[
        { key: 'table_name', label: 'الجدول', render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.table_name || '*'}</Typography> },
        { key: 'schema_name', label: 'المخطط', render: (r) => r.schema_name || '—' },
        { key: 'database_name', label: 'القاعدة', render: (r) => r.database_name || '—', hideOnMobile: true },
        { key: 'table_size_mb', label: 'حجم الجدول (م.ب)', sortable: true, render: (r) => r.table_size_mb.toLocaleString() },
        { key: 'index_size_mb', label: 'الفهارس (م.ب)', render: (r) => r.index_size_mb.toLocaleString(), hideOnMobile: true },
        { key: 'rows_count', label: 'الصفوف', render: (r) => r.rows_count.toLocaleString(), hideOnMobile: true },
        { key: 'bloat_estimate', label: 'التضخم (م.ب)', render: (r) => (r.bloat_estimate > 10 ? <StatusChip label={`${r.bloat_estimate.toFixed(1)} م.ب`} tone="warning" /> : r.bloat_estimate.toFixed(1)), hideOnMobile: true },
      ]}
      rows={rows}
      rowKey={(r) => r.id}
      count={count}
      page={page}
      rowsPerPage={rowsPerPage}
      pageSizeOptions={pageSizeOptions}
      loading={loading}
      error={error}
      title="إدارة التخزين"
      subtitle={`${count} جدول`}
      filters={[
        { key: 'schema_name', label: 'المخطط', options: [], value: '', onChange: (v) => setFilter('schema_name', v) },
      ]}
      onPageChange={setPage}
      onRowsPerPageChange={setRowsPerPage}
      onRefresh={refresh}
      emptyTitle="لا توجد بيانات تخزين"
      emptyDescription="حجم الجداول والفهارس والمساحة المتبقية تظهر هنا"
    />
  );
};

const MaintenanceTab = () => {
  const table = useServerTable<MaintenanceJob>({ fetchData: getMaintenanceJobs });
  const { rows, count, loading, error, searchInput, setSearchInput, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, setFilter } = table;

  const handleRun = async (id: string) => {
    try {
      await runMaintenanceJob(id);
      notifySuccess('تم تنفيذ المهمة بنجاح');
      refresh();
    } catch {
      notifyError('تعذر تنفيذ المهمة');
    }
  };

  return (
    <DataTable<MaintenanceJob>
      columns={[
        { key: 'name', label: 'المهمة', render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.name}</Typography> },
        { key: 'job_type', label: 'النوع', render: (r) => statusChip(maintenanceJobType[r.job_type], r.job_type) },
        { key: 'frequency', label: 'التكرار', render: (r) => r.frequency, hideOnMobile: true },
        { key: 'database_name', label: 'القاعدة', render: (r) => r.database_name || '—', hideOnMobile: true },
        { key: 'next_run_at', label: 'التشغيل القادم', render: (r) => (r.next_run_at ? formatDateTime(r.next_run_at) : '—'), hideOnMobile: true },
        { key: 'status', label: 'الحالة', render: (r) => statusChip(maintenanceStatus[r.status], r.status) },
      ]}
      rows={rows}
      rowKey={(r) => r.id}
      count={count}
      page={page}
      rowsPerPage={rowsPerPage}
      pageSizeOptions={pageSizeOptions}
      loading={loading}
      error={error}
      title="مجدول الصيانة"
      subtitle={`${count} مهمة`}
      searchInput={searchInput}
      onSearchChange={setSearchInput}
      searchPlaceholder="بحث باسم المهمة..."
      filters={[
        { key: 'job_type', label: 'النوع', options: maintenanceTypeOptions, value: '', onChange: (v) => setFilter('job_type', v) },
        { key: 'status', label: 'الحالة', options: maintenanceStatusOptions, value: '', onChange: (v) => setFilter('status', v) },
      ]}
      onPageChange={setPage}
      onRowsPerPageChange={setRowsPerPage}
      onRefresh={refresh}
      actions={(r) =>
        r.status !== 'COMPLETED' ? (
          <Tooltip title="تشغيل الآن">
            <IconButton aria-label="تشغيل" size="small" color="primary" onClick={() => handleRun(r.id)}>
              <BuildIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : null
      }
      emptyTitle="لا توجد مهام صيانة"
      emptyDescription="مهام VACUUM وANALYZE وREINDEX المجدولة تظهر هنا"
    />
  );
};

const AlertsTab = () => {
  const table = useServerTable<DbAlert>({ fetchData: getDbAlerts });
  const { rows, count, loading, error, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, setFilter } = table;

  const handleAck = async (id: string) => {
    try {
      await acknowledgeAlert(id);
      notifySuccess('تم الإقرار بالتنبيه');
      refresh();
    } catch {
      notifyError('تعذر إقرار التنبيه');
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await resolveAlert(id);
      notifySuccess('تم حل التنبيه');
      refresh();
    } catch {
      notifyError('تعذر حل التنبيه');
    }
  };

  return (
    <DataTable<DbAlert>
      columns={[
        { key: 'title', label: 'التنبيه', render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.title}</Typography> },
        { key: 'alert_type', label: 'النوع', render: (r) => statusChip(dbAlertType[r.alert_type], r.alert_type) },
        { key: 'severity', label: 'الخطورة', render: (r) => statusChip(dbAlertSeverity[r.severity], r.severity) },
        { key: 'database_name', label: 'القاعدة', render: (r) => r.database_name || '—', hideOnMobile: true },
        { key: 'status', label: 'الحالة', render: (r) => statusChip(dbAlertStatus[r.status], r.status) },
        { key: 'created_at', label: 'الوقت', render: (r) => formatDateTime(r.created_at), hideOnMobile: true },
      ]}
      rows={rows}
      rowKey={(r) => r.id}
      count={count}
      page={page}
      rowsPerPage={rowsPerPage}
      pageSizeOptions={pageSizeOptions}
      loading={loading}
      error={error}
      title="مركز التنبيهات"
      subtitle={`${count} تنبيه`}
      filters={[
        { key: 'alert_type', label: 'النوع', options: alertTypeOptions, value: '', onChange: (v) => setFilter('alert_type', v) },
        { key: 'severity', label: 'الخطورة', options: alertSeverityOptions, value: '', onChange: (v) => setFilter('severity', v) },
        { key: 'status', label: 'الحالة', options: alertStatusOptions, value: '', onChange: (v) => setFilter('status', v) },
      ]}
      onPageChange={setPage}
      onRowsPerPageChange={setRowsPerPage}
      onRefresh={refresh}
      actions={(r) => (
        <Stack direction="row" spacing={0.5}>
          {r.status === 'NEW' && (
            <Tooltip title="إقرار">
              <IconButton aria-label="إشعار بالاستلام" size="small" color="info" onClick={() => handleAck(r.id)}>
                <VerifiedUserIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {r.status !== 'RESOLVED' && (
            <Tooltip title="حل">
              <IconButton aria-label="تحديث" size="small" color="success" onClick={() => handleResolve(r.id)}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      )}
      emptyTitle="لا توجد تنبيهات"
      emptyDescription="تنبيهات التخزين والنسخ والأداء والأمن تظهر هنا"
    />
  );
};

const AuditTab = () => {
  const [tab, setTab] = useState(0);
  const audits = useServerTable<AuditLog>({ fetchData: getAuditLogs });
  const activities = useServerTable<ActivityLog>({ fetchData: getActivityLogs });

  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="سجلات التدقيق" />
        <Tab label="سجلات النشاط" />
      </Tabs>
      {tab === 0 && (
        <DataTable<AuditLog>
          columns={[
            { key: 'action', label: 'الإجراء', render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.action}</Typography> },
            { key: 'user_email', label: 'المستخدم', render: (r) => r.user_email || '—' },
            { key: 'resource_type', label: 'المورد', render: (r) => r.resource_type || '—', hideOnMobile: true },
            { key: 'success', label: 'النتيجة', render: (r) => (r.success ? <StatusChip label="ناجح" tone="success" /> : <StatusChip label="فشل" tone="error" />) },
            { key: 'created_at', label: 'الوقت', render: (r) => formatDateTime(r.created_at), hideOnMobile: true },
          ]}
          rows={audits.rows}
          rowKey={(r) => r.id}
          count={audits.count}
          page={audits.page}
          rowsPerPage={audits.rowsPerPage}
          pageSizeOptions={audits.pageSizeOptions}
          loading={audits.loading}
          error={audits.error}
          title="سجلات التدقيق"
          subtitle={`${audits.count} سجل`}
          onPageChange={audits.setPage}
          onRowsPerPageChange={audits.setRowsPerPage}
          onRefresh={audits.refresh}
          emptyTitle="لا توجد سجلات تدقيق"
          emptyDescription="عمليات إنشاء وحذف القواعد وتعديل الصلاحيات تظهر هنا"
        />
      )}
      {tab === 1 && (
        <DataTable<ActivityLog>
          columns={[
            { key: 'description', label: 'الوصف', render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.description}</Typography> },
            { key: 'activity_type', label: 'النوع', render: (r) => <StatusChip label={r.type_label || r.activity_type} tone="info" /> },
            { key: 'user_email', label: 'المستخدم', render: (r) => r.user_email || '—' },
            { key: 'performed_at', label: 'الوقت', render: (r) => formatDateTime(r.performed_at), hideOnMobile: true },
          ]}
          rows={activities.rows}
          rowKey={(r) => r.id}
          count={activities.count}
          page={activities.page}
          rowsPerPage={activities.rowsPerPage}
          pageSizeOptions={activities.pageSizeOptions}
          loading={activities.loading}
          error={activities.error}
          title="سجلات النشاط"
          subtitle={`${activities.count} سجل`}
          onPageChange={activities.setPage}
          onRowsPerPageChange={activities.setRowsPerPage}
          onRefresh={activities.refresh}
          emptyTitle="لا توجد سجلات نشاط"
          emptyDescription="نشاطات الدخول والنسخ وتعديل الصلاحيات تظهر هنا"
        />
      )}
    </Box>
  );
};

const ReportingTab = () => {
  const plans = useServerTable<DisasterRecoveryPlan>({ fetchData: getDisasterRecoveryPlans });
  const settings = useServerTable<import('../../types/dbAdmin').DbSetting>({ fetchData: getDbSettings });

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <DataTable<DisasterRecoveryPlan>
            columns={[
              { key: 'name', label: 'الخطة', render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.name}</Typography> },
              { key: 'status', label: 'الحالة', render: (r) => statusChip(drPlanStatus[r.status], r.status) },
              { key: 'recovery_time_objective', label: 'RTO (ساعة)', render: (r) => r.recovery_time_objective, hideOnMobile: true },
              { key: 'recovery_point_objective', label: 'RPO (ساعة)', render: (r) => r.recovery_point_objective, hideOnMobile: true },
              { key: 'backup_site', label: 'موقع النسخ', render: (r) => r.backup_site || '—', hideOnMobile: true },
              { key: 'tested_at', label: 'آخر اختبار', render: (r) => (r.tested_at ? formatDateTime(r.tested_at) : '—'), hideOnMobile: true },
            ]}
            rows={plans.rows}
            rowKey={(r) => r.id}
            count={plans.count}
            page={plans.page}
            rowsPerPage={plans.rowsPerPage}
            pageSizeOptions={plans.pageSizeOptions}
            loading={plans.loading}
            error={plans.error}
            title="خطط التعافي من الكوارث"
            subtitle={`${plans.count} خطة`}
            onPageChange={plans.setPage}
            onRowsPerPageChange={plans.setRowsPerPage}
            onRefresh={plans.refresh}
            emptyTitle="لا توجد خطط تعافي"
            emptyDescription="خطط التعافي من الكوارث وإجراءات الطوارئ تظهر هنا"
          />
        </Grid>
        <Grid item xs={12}>
          <DataTable<import('../../types/dbAdmin').DbSetting>
            columns={[
              { key: 'key', label: 'المفتاح', render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.key}</Typography> },
              { key: 'label', label: 'التسمية' },
              { key: 'value', label: 'القيمة', render: (r) => (r.is_encrypted ? '••••••' : r.value || '—') },
              { key: 'group', label: 'المجموعة', render: (r) => <StatusChip label={dbSettingGroup[r.group] || r.group} tone="info" /> },
              { key: 'is_encrypted', label: 'مشفر', render: (r) => (r.is_encrypted ? 'نعم' : 'لا'), hideOnMobile: true },
            ]}
            rows={settings.rows}
            rowKey={(r) => r.id}
            count={settings.count}
            page={settings.page}
            rowsPerPage={settings.rowsPerPage}
            pageSizeOptions={settings.pageSizeOptions}
            loading={settings.loading}
            error={settings.error}
            title="إعدادات النظام"
            subtitle={`${settings.count} إعداد`}
            onPageChange={settings.setPage}
            onRowsPerPageChange={settings.setRowsPerPage}
            onRefresh={settings.refresh}
            emptyTitle="لا توجد إعدادات"
            emptyDescription="إعدادات النسخ والأمن والصيانة تظهر هنا"
          />
        </Grid>
      </Grid>
    </Box>
  );
};

const tabItems = [
  { label: 'لوحة المعلومات', icon: <StorageIcon /> },
  { label: 'قواعد البيانات', icon: <StorageOutlinedIcon /> },
  { label: 'المخططات', icon: <BackupTableIcon /> },
  { label: 'المستخدمون والأدوار', icon: <PeopleIcon /> },
  { label: 'الأمن', icon: <SecurityIcon /> },
  { label: 'النسخ والاستعادة', icon: <BackupIcon /> },
  { label: 'النسخ المتماثل', icon: <SyncAltIcon /> },
  { label: 'الأداء', icon: <SpeedIcon /> },
  { label: 'الاستعلامات', icon: <QueryStatsIcon /> },
  { label: 'التخزين', icon: <StorageUsageIcon /> },
  { label: 'الصيانة', icon: <BuildIcon /> },
  { label: 'التنبيهات', icon: <NotificationsActiveIcon /> },
  { label: 'التدقيق', icon: <HistoryIcon /> },
  { label: 'التقارير والإعدادات', icon: <AdminPanelSettingsIcon /> },
];

const SECTIONS = [
  { id: 'overview', label: 'لوحة المعلومات', icon: <StorageIcon fontSize="small" /> },
  { id: 'databases', label: 'قواعد البيانات', icon: <StorageOutlinedIcon fontSize="small" /> },
  { id: 'schemas', label: 'المخططات', icon: <BackupTableIcon fontSize="small" /> },
  { id: 'users-roles', label: 'المستخدمون والأدوار', icon: <PeopleIcon fontSize="small" /> },
  { id: 'security', label: 'الأمن', icon: <SecurityIcon fontSize="small" /> },
  { id: 'backups', label: 'النسخ والاستعادة', icon: <BackupIcon fontSize="small" /> },
  { id: 'replication', label: 'النسخ المتماثل', icon: <SyncAltIcon fontSize="small" /> },
  { id: 'performance', label: 'الأداء', icon: <SpeedIcon fontSize="small" /> },
  { id: 'queries', label: 'الاستعلامات', icon: <QueryStatsIcon fontSize="small" /> },
  { id: 'storage', label: 'التخزين', icon: <StorageUsageIcon fontSize="small" /> },
  { id: 'maintenance', label: 'الصيانة', icon: <BuildIcon fontSize="small" /> },
  { id: 'alerts', label: 'التنبيهات', icon: <NotificationsActiveIcon fontSize="small" /> },
  { id: 'audit', label: 'التدقيق', icon: <HistoryIcon fontSize="small" /> },
  { id: 'reporting', label: 'التقارير والإعدادات', icon: <AdminPanelSettingsIcon fontSize="small" /> },
] as const;

const DbAdminPage = () => {
  const [tab, setTab] = useState(0);

  const { active, register, scrollTo } = useCommandSections(SECTIONS as unknown as CommandSectionDef[], [tab]);

  const handleSectionNavigate = (id: string) => {
    const idx = SECTIONS.findIndex((s) => s.id === id);
    if (idx >= 0 && idx !== tab) {
      setTab(idx);
      requestAnimationFrame(() => requestAnimationFrame(() => scrollTo(id)));
    } else {
      scrollTo(id);
    }
  };

  return (
    <Box>
      <DashboardHero
        eyebrow="البنية التحتية"
        title="نظام إدارة قواعد البيانات"
        subtitle="إدارة ومراقبة قواعد بيانات المنصة: النسخ الاحتياطي، الأداء، الأمن، النسخ المتماثل، والتعافي من الكوارث"
        gradient="ocean"
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
            onNavigate={handleSectionNavigate}
            accent="primary.main"
            label="أقسام اللوحة"
          />
        </Grid>
        <Grid item xs={12} md={9.8} lg={10.2}>
      <PageHeader
        title="نظام إدارة قواعد البيانات"
        subtitle="إدارة ومراقبة قواعد بيانات المنصة: النسخ الاحتياطي، الأداء، الأمن، النسخ المتماثل، والتعافي من الكوارث"
        eyebrow="البنية التحتية"
      />
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3, '& .MuiTab-root': { borderRadius: 2, minHeight: 46 } }}
      >
        {tabItems.map((item) => (
          <Tab key={item.label} icon={item.icon} iconPosition="start" label={item.label} sx={{ fontSize: 12.5 }} />
        ))}
      </Tabs>
      {tab === 0 && (
        <Box component="section" ref={register('overview')} data-section="overview" sx={{ scrollMarginTop: '80px' }}>
          <DashboardTab />
        </Box>
      )}
      {tab === 1 && (
        <Box component="section" ref={register('databases')} data-section="databases" sx={{ scrollMarginTop: '80px' }}>
          <DatabasesTab />
        </Box>
      )}
      {tab === 2 && (
        <Box component="section" ref={register('schemas')} data-section="schemas" sx={{ scrollMarginTop: '80px' }}>
          <SchemasTab />
        </Box>
      )}
      {tab === 3 && (
        <Box component="section" ref={register('users-roles')} data-section="users-roles" sx={{ scrollMarginTop: '80px' }}>
          <UsersRolesTab />
        </Box>
      )}
      {tab === 4 && (
        <Box component="section" ref={register('security')} data-section="security" sx={{ scrollMarginTop: '80px' }}>
          <SecurityTab />
        </Box>
      )}
      {tab === 5 && (
        <Box component="section" ref={register('backups')} data-section="backups" sx={{ scrollMarginTop: '80px' }}>
          <BackupsTab />
        </Box>
      )}
      {tab === 6 && (
        <Box component="section" ref={register('replication')} data-section="replication" sx={{ scrollMarginTop: '80px' }}>
          <ReplicationTab />
        </Box>
      )}
      {tab === 7 && (
        <Box component="section" ref={register('performance')} data-section="performance" sx={{ scrollMarginTop: '80px' }}>
          <PerformanceTab />
        </Box>
      )}
      {tab === 8 && (
        <Box component="section" ref={register('queries')} data-section="queries" sx={{ scrollMarginTop: '80px' }}>
          <QueriesTab />
        </Box>
      )}
      {tab === 9 && (
        <Box component="section" ref={register('storage')} data-section="storage" sx={{ scrollMarginTop: '80px' }}>
          <StorageTab />
        </Box>
      )}
      {tab === 10 && (
        <Box component="section" ref={register('maintenance')} data-section="maintenance" sx={{ scrollMarginTop: '80px' }}>
          <MaintenanceTab />
        </Box>
      )}
      {tab === 11 && (
        <Box component="section" ref={register('alerts')} data-section="alerts" sx={{ scrollMarginTop: '80px' }}>
          <AlertsTab />
        </Box>
      )}
      {tab === 12 && (
        <Box component="section" ref={register('audit')} data-section="audit" sx={{ scrollMarginTop: '80px' }}>
          <AuditTab />
        </Box>
      )}
      {tab === 13 && (
        <Box component="section" ref={register('reporting')} data-section="reporting" sx={{ scrollMarginTop: '80px' }}>
          <ReportingTab />
        </Box>
      )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default DbAdminPage;