import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
    return <EmptyState title={t('food.dbAdmin.dashboardTab.empty.title')} description={t('food.dbAdmin.dashboardTab.empty.desc')} />;
  }

  const latest = metrics[0];
  const bars = [
    { label: 'CPU', value: latest?.cpu_usage ?? overview.performance.cpu },
    { label: t('food.dbAdmin.dashboardTab.metrics.memory'), value: latest?.memory_usage ?? overview.performance.memory },
    { label: t('food.dbAdmin.dashboardTab.metrics.cpuBreakdown'), value: latest?.cache_hit_ratio ?? overview.performance.cache_hit },
    { label: t('food.dbAdmin.dashboardTab.metrics.connections'), value: overview.performance.connections },
  ];

  return (
    <Box>
      <Grid container spacing={1.5}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<StorageIcon />} value={overview.database_count} label={t('food.dbAdmin.dashboardTab.kpi.databases')} accent="primary.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<StorageOutlinedIcon />} value={`${overview.online_count} / ${overview.database_count}`} label={t('food.dbAdmin.dashboardTab.kpi.connected')} accent="success.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<BackupIcon />} value={overview.backup_total} label={t('food.dbAdmin.dashboardTab.kpi.backups')} accent="info.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<NotificationsActiveIcon />} value={overview.critical_alerts} label={t('food.dbAdmin.dashboardTab.kpi.alerts')} accent="error.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<PeopleIcon />} value={overview.db_user_count} label={t('food.dbAdmin.dashboardTab.kpi.users')} accent="warning.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<AdminPanelSettingsIcon />} value={overview.db_role_count} label={t('food.dbAdmin.dashboardTab.kpi.roles')} accent="secondary.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<SyncAltIcon />} value={`${overview.replication_active} / ${overview.replication_total}`} label={t('food.dbAdmin.dashboardTab.kpi.replication')} accent="primary.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<BuildIcon />} value={overview.maintenance_due} label={t('food.dbAdmin.dashboardTab.kpi.maintenance')} accent="info.main" />
        </Grid>
      </Grid>

      <Box sx={{ mt: 4, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>{t('food.dbAdmin.dashboardTab.performanceTitle')}</Typography>
        <Button size="small" startIcon={<RefreshIcon />} onClick={load}>{t('food.dbAdmin.dashboardTab.refresh')}</Button>
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
  const { t } = useTranslation();
  const table = useServerTable<Database>({ fetchData: getDatabases });
  const { rows, count, loading, error, searchInput, setSearchInput, sortBy, sortOrder, setSorting, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, setFilter } = table;

  const { exporting, exportAll } = useTableExport(table.fetchAllRows);

  const handleExport = () =>
    exportAll({
      filename: t('food.dbAdmin.databasesTab.export.filename', { date: new Date().toISOString().slice(0, 10) }),
      headers: t('food.dbAdmin.databasesTab.export.headers', { returnObjects: true }) as string[],
      mapRow: (r: Database) => [
        r.name, dbType[r.db_type]?.label || r.db_type, r.version || '', r.host || '',
        dbStatus[r.status]?.label || r.status, r.size_mb, r.schema_count ?? 0, r.backup_count ?? 0,
      ],
      message: t('food.dbAdmin.databasesTab.export.message'),
    });

  return (
    <DataTable<Database>
      columns={[
        {
          key: 'name',
          label: t('food.dbAdmin.databasesTab.col.name'),
          render: (r) => (
            <Box>
              <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.name}</Typography>
              <Typography variant="caption" color="text.secondary">{r.engine || r.db_type}</Typography>
            </Box>
          ),
        },
        { key: 'db_type', label: t('food.dbAdmin.databasesTab.col.type'), render: (r) => statusChip(dbType[r.db_type], r.db_type) },
        { key: 'version', label: t('food.dbAdmin.databasesTab.col.version'), render: (r) => r.version || '—', hideOnMobile: true },
        { key: 'status', label: t('food.dbAdmin.databasesTab.col.status'), render: (r) => statusChip(dbStatus[r.status], r.status) },
        { key: 'size_mb', label: t('food.dbAdmin.databasesTab.col.sizeMb'), sortable: true, render: (r) => r.size_mb.toLocaleString(), hideOnMobile: true },
        { key: 'schema_count', label: t('food.dbAdmin.databasesTab.col.schemas'), render: (r) => r.schema_count ?? 0, hideOnMobile: true },
        { key: 'backup_count', label: t('food.dbAdmin.databasesTab.col.backups'), render: (r) => r.backup_count ?? 0, hideOnMobile: true },
      ]}
      rows={rows}
      rowKey={(r) => r.id}
      count={count}
      page={page}
      rowsPerPage={rowsPerPage}
      pageSizeOptions={pageSizeOptions}
      loading={loading}
      error={error}
      title={t('food.dbAdmin.databasesTab.screenTitle')}
      subtitle={t('food.dbAdmin.databasesTab.subtitle', { count })}
      searchInput={searchInput}
      onSearchChange={setSearchInput}
      searchPlaceholder={t('food.dbAdmin.databasesTab.searchPlaceholder')}
      filters={[
        { key: 'status', label: t('food.dbAdmin.databasesTab.filter.status'), options: dbStatusOptions, value: '', onChange: (v) => setFilter('status', v) },
        { key: 'db_type', label: t('food.dbAdmin.databasesTab.filter.type'), options: dbTypeOptions, value: '', onChange: (v) => setFilter('db_type', v) },
      ]}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSortChange={setSorting}
      onPageChange={setPage}
      onRowsPerPageChange={setRowsPerPage}
      onExport={handleExport}
      exporting={exporting}
      onRefresh={refresh}
      emptyTitle={t('food.dbAdmin.databasesTab.emptyTitle')}
      emptyDescription={t('food.dbAdmin.databasesTab.emptyDesc')}
    />
  );
};

const SchemasTab = () => {
  const { t } = useTranslation();
  const table = useServerTable<DbSchema>({ fetchData: getSchemas });
  const { rows, count, loading, error, searchInput, setSearchInput, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions } = table;

  return (
    <DataTable<DbSchema>
      columns={[
        { key: 'name', label: t('food.dbAdmin.schemasTab.col.name'), render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.name}</Typography> },
        { key: 'database_name', label: t('food.dbAdmin.schemasTab.col.dbName'), render: (r) => r.database_name || '—' },
        { key: 'object_count', label: t('food.dbAdmin.schemasTab.col.objectCount'), render: (r) => r.object_count, hideOnMobile: true },
        { key: 'size_mb', label: t('food.dbAdmin.schemasTab.col.sizeMb'), render: (r) => r.size_mb, hideOnMobile: true },
        { key: 'last_analyzed_at', label: t('food.dbAdmin.schemasTab.col.lastAnalyzed'), render: (r) => (r.last_analyzed_at ? formatDateTime(r.last_analyzed_at) : '—'), hideOnMobile: true },
      ]}
      rows={rows}
      rowKey={(r) => r.id}
      count={count}
      page={page}
      rowsPerPage={rowsPerPage}
      pageSizeOptions={pageSizeOptions}
      loading={loading}
      error={error}
      title={t('food.dbAdmin.schemasTab.screenTitle')}
      subtitle={t('food.dbAdmin.schemasTab.subtitle', { count })}
      searchInput={searchInput}
      onSearchChange={setSearchInput}
      searchPlaceholder={t('food.dbAdmin.schemasTab.searchPlaceholder')}
      onPageChange={setPage}
      onRowsPerPageChange={setRowsPerPage}
      onRefresh={refresh}
      emptyTitle={t('food.dbAdmin.schemasTab.empty.title')}
      emptyDescription={t('food.dbAdmin.schemasTab.empty.desc')}
    />
  );
};

const UsersRolesTab = () => {
  const { t } = useTranslation();
  const [tab, setTab] = useState(0);
  const users = useServerTable<DbUser>({ fetchData: getDbUsers });
  const roles = useServerTable<DbRole>({ fetchData: getDbRoles });
  const perms = useServerTable<DbPermission>({ fetchData: getDbPermissions });

  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label={t('food.dbAdmin.usersRolesTab.tabs.users')} />
        <Tab label={t('food.dbAdmin.usersRolesTab.tabs.roles')} />
        <Tab label={t('food.dbAdmin.usersRolesTab.tabs.perms')} />
      </Tabs>
      {tab === 0 && (
        <DataTable<DbUser>
          columns={[
            { key: 'username', label: t('food.dbAdmin.usersRolesTab.users.col.username'), render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.username}</Typography> },
            { key: 'full_name', label: t('food.dbAdmin.usersRolesTab.users.col.fullName'), render: (r) => r.full_name || '\u2014' },
            { key: 'role_code', label: t('food.dbAdmin.usersRolesTab.users.col.role'), render: (r) => r.role_code ? <StatusChip label={r.role_code} tone="primary" /> : '\u2014' },
            { key: 'is_superuser', label: t('food.dbAdmin.usersRolesTab.users.col.type'), render: (r) => r.is_superuser ? statusChip(dbUserType.SUPERUSER, t('food.dbAdmin.usersRolesTab.users.type.superuser')) : statusChip(dbUserType.NORMAL, t('food.dbAdmin.usersRolesTab.users.type.normal')) },
            { key: 'connection_limit', label: t('food.dbAdmin.usersRolesTab.users.col.connLimit'), render: (r) => r.connection_limit, hideOnMobile: true },
            { key: 'last_login_at', label: t('food.dbAdmin.usersRolesTab.users.col.lastLogin'), render: (r) => (r.last_login_at ? formatDateTime(r.last_login_at) : '\u2014'), hideOnMobile: true },
          ]}
          rows={users.rows}
          rowKey={(r) => r.id}
          count={users.count}
          page={users.page}
          rowsPerPage={users.rowsPerPage}
          pageSizeOptions={users.pageSizeOptions}
          loading={users.loading}
          error={users.error}
          title={t('food.dbAdmin.usersRolesTab.users.screenTitle')}
          subtitle={t('food.dbAdmin.usersRolesTab.users.subtitle', { count: users.count })}
          searchInput={users.searchInput}
          onSearchChange={users.setSearchInput}
          searchPlaceholder={t('food.dbAdmin.usersRolesTab.users.searchPlaceholder')}
          onPageChange={users.setPage}
          onRowsPerPageChange={users.setRowsPerPage}
          onRefresh={users.refresh}
          emptyTitle={t('food.dbAdmin.usersRolesTab.users.emptyTitle')}
          emptyDescription={t('food.dbAdmin.usersRolesTab.users.emptyDesc')}
        />
      )}
      {tab === 1 && (
        <DataTable<DbRole>
          columns={[
            { key: 'code', label: t('food.dbAdmin.usersRolesTab.roles.col.code'), render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.code}</Typography> },
            { key: 'name_ar', label: t('food.dbAdmin.usersRolesTab.roles.col.name') },
            { key: 'is_superuser', label: t('food.dbAdmin.usersRolesTab.roles.col.super'), render: (r) => (r.is_superuser ? t('food.dbAdmin.usersRolesTab.roles.value.yes') : t('food.dbAdmin.usersRolesTab.roles.value.no')) },
            { key: 'can_login', label: t('food.dbAdmin.usersRolesTab.roles.col.login'), render: (r) => (r.can_login ? t('food.dbAdmin.usersRolesTab.roles.value.yes') : t('food.dbAdmin.usersRolesTab.roles.value.no')), hideOnMobile: true },
            { key: 'user_count', label: t('food.dbAdmin.usersRolesTab.roles.col.users'), render: (r) => r.user_count ?? 0, hideOnMobile: true },
            { key: 'permission_count', label: t('food.dbAdmin.usersRolesTab.roles.col.perms'), render: (r) => r.permission_count ?? 0, hideOnMobile: true },
          ]}
          rows={roles.rows}
          rowKey={(r) => r.id}
          count={roles.count}
          page={roles.page}
          rowsPerPage={roles.rowsPerPage}
          pageSizeOptions={roles.pageSizeOptions}
          loading={roles.loading}
          error={roles.error}
          title={t('food.dbAdmin.usersRolesTab.roles.screenTitle')}
          subtitle={t('food.dbAdmin.usersRolesTab.roles.subtitle', { count: roles.count })}
          searchInput={roles.searchInput}
          onSearchChange={roles.setSearchInput}
          searchPlaceholder={t('food.dbAdmin.usersRolesTab.roles.searchPlaceholder')}
          onPageChange={roles.setPage}
          onRowsPerPageChange={roles.setRowsPerPage}
          onRefresh={roles.refresh}
          emptyTitle={t('food.dbAdmin.usersRolesTab.roles.emptyTitle')}
          emptyDescription={t('food.dbAdmin.usersRolesTab.roles.emptyDesc')}
        />
      )}
      {tab === 2 && (
        <DataTable<DbPermission>
          columns={[
            { key: 'role_code', label: t('food.dbAdmin.usersRolesTab.perms.col.role'), render: (r) => r.role_code ? <StatusChip label={r.role_code} tone="primary" /> : '\u2014' },
            { key: 'database_name', label: t('food.dbAdmin.usersRolesTab.perms.col.db'), render: (r) => r.database_name || '\u2014' },
            { key: 'table_name', label: t('food.dbAdmin.usersRolesTab.perms.col.table'), render: (r) => <Typography sx={{ fontFamily: 'monospace' }}>{r.table_name || '*'}</Typography> },
            { key: 'action', label: t('food.dbAdmin.usersRolesTab.perms.col.action'), render: (r) => <StatusChip label={r.action} tone="info" /> },
            { key: 'granted', label: t('food.dbAdmin.usersRolesTab.perms.col.status'), render: (r) => (r.granted ? <StatusChip label={t('food.dbAdmin.usersRolesTab.perms.status.granted')} tone="success" /> : <StatusChip label={t('food.dbAdmin.usersRolesTab.perms.status.denied')} tone="error" />) },
          ]}
          rows={perms.rows}
          rowKey={(r) => r.id}
          count={perms.count}
          page={perms.page}
          rowsPerPage={perms.rowsPerPage}
          pageSizeOptions={perms.pageSizeOptions}
          loading={perms.loading}
          error={perms.error}
          title={t('food.dbAdmin.usersRolesTab.perms.screenTitle')}
          subtitle={t('food.dbAdmin.usersRolesTab.perms.subtitle', { count: perms.count })}
          onPageChange={perms.setPage}
          onRowsPerPageChange={perms.setRowsPerPage}
          onRefresh={perms.refresh}
          emptyTitle={t('food.dbAdmin.usersRolesTab.perms.emptyTitle')}
          emptyDescription={t('food.dbAdmin.usersRolesTab.perms.emptyDesc')}
        />
      )}
    </Box>
  );
};

const SecurityTab = () => {
  const { t } = useTranslation();
  const policies = useServerTable<SecurityPolicy>({ fetchData: getSecurityPolicies });

  return (
    <Box>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{t('food.dbAdmin.securityTab.overview')}</Typography>
        </Grid>
      </Grid>
      <DataTable<SecurityPolicy>
        columns={[
          { key: 'name', label: t('food.dbAdmin.securityTab.col.policy'), render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.name}</Typography> },
          { key: 'ssl_enabled', label: t('food.dbAdmin.securityTab.col.ssl'), render: (r) => (r.ssl_enabled ? <StatusChip label={t('food.dbAdmin.securityTab.opt.sslEnabledActive')} tone="success" /> : <StatusChip label={t('food.dbAdmin.securityTab.opt.sslEnabledInactive')} tone="error" />) },
          { key: 'encryption_enabled', label: t('food.dbAdmin.securityTab.col.encryption'), render: (r) => (r.encryption_enabled ? <StatusChip label={t('food.dbAdmin.securityTab.opt.encryptionActive')} tone="success" /> : <StatusChip label={t('food.dbAdmin.securityTab.opt.encryptionInactive')} tone="error" />) },
          { key: 'row_level_security', label: t('food.dbAdmin.securityTab.col.rls'), render: (r) => (r.row_level_security ? t('food.dbAdmin.securityTab.opt.rlsOn') : t('food.dbAdmin.securityTab.opt.rlsOff')), hideOnMobile: true },
          { key: 'password_policy', label: t('food.dbAdmin.securityTab.col.passwordPolicy'), render: (r) => r.password_policy, hideOnMobile: true },
          { key: 'ip_whitelist', label: t('food.dbAdmin.securityTab.col.ipWhitelist'), render: (r) => r.ip_whitelist?.length ?? 0, hideOnMobile: true },
        ]}
        rows={policies.rows}
        rowKey={(r) => r.id}
        count={policies.count}
        page={policies.page}
        rowsPerPage={policies.rowsPerPage}
        pageSizeOptions={policies.pageSizeOptions}
        loading={policies.loading}
        error={policies.error}
        title={t('food.dbAdmin.securityTab.screenTitle')}
        subtitle={t('food.dbAdmin.securityTab.subtitle', { count: policies.count })}
        onPageChange={policies.setPage}
        onRowsPerPageChange={policies.setRowsPerPage}
        onRefresh={policies.refresh}
        emptyTitle={t('food.dbAdmin.securityTab.emptyTitle')}
        emptyDescription={t('food.dbAdmin.securityTab.emptyDesc')}
      />
    </Box>
  );
};

const BackupsTab = () => {
  const { t } = useTranslation();
  const [tab, setTab] = useState(0);
  const backups = useServerTable<Backup>({ fetchData: getBackups });
  const restores = useServerTable<RestoreHistory>({ fetchData: getRestores });

  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label={t('food.dbAdmin.backupsTab.tabs.backup')} />
        <Tab label={t('food.dbAdmin.backupsTab.tabs.restore')} />
      </Tabs>
      {tab === 0 && (
        <DataTable<Backup>
          columns={[
            { key: 'database_name', label: t('food.dbAdmin.backupsTab.backup.col.dbName'), render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.database_name}</Typography> },
            { key: 'backup_type', label: t('food.dbAdmin.backupsTab.backup.col.type'), render: (r) => statusChip(backupType[r.backup_type], r.backup_type) },
            { key: 'status', label: t('food.dbAdmin.backupsTab.backup.col.status'), render: (r) => statusChip(backupStatus[r.status], r.status) },
            { key: 'storage', label: t('food.dbAdmin.backupsTab.backup.col.storage'), render: (r) => r.storage, hideOnMobile: true },
            { key: 'size_mb', label: t('food.dbAdmin.backupsTab.backup.col.sizeMb'), render: (r) => r.size_mb.toLocaleString(), hideOnMobile: true },
            { key: 'started_at', label: t('food.dbAdmin.backupsTab.backup.col.startedAt'), sortable: true, render: (r) => formatDateTime(r.started_at) },
          ]}
          rows={backups.rows}
          rowKey={(r) => r.id}
          count={backups.count}
          page={backups.page}
          rowsPerPage={backups.rowsPerPage}
          pageSizeOptions={backups.pageSizeOptions}
          loading={backups.loading}
          error={backups.error}
          title={t('food.dbAdmin.backupsTab.backup.screenTitle')}
          subtitle={t('food.dbAdmin.backupsTab.backup.subtitle', { count: backups.count })}
          filters={[
            { key: 'backup_type', label: t('food.dbAdmin.backupsTab.backup.col.type'), options: backupTypeOptions, value: '', onChange: (v) => backups.setFilter('backup_type', v) },
            { key: 'status', label: t('food.dbAdmin.backupsTab.backup.col.status'), options: backupStatusOptions, value: '', onChange: (v) => backups.setFilter('status', v) },
          ]}
          onPageChange={backups.setPage}
          onRowsPerPageChange={backups.setRowsPerPage}
          onRefresh={backups.refresh}
          emptyTitle={t('food.dbAdmin.backupsTab.backup.emptyTitle')}
          emptyDescription={t('food.dbAdmin.backupsTab.backup.emptyDesc')}
        />
      )}
      {tab === 1 && (
        <DataTable<RestoreHistory>
          columns={[
            { key: 'database_name', label: t('food.dbAdmin.backupsTab.restore.col.dbName'), render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.database_name}</Typography> },
            { key: 'target_database', label: t('food.dbAdmin.backupsTab.restore.col.target'), render: (r) => r.target_database },
            { key: 'backup_type', label: t('food.dbAdmin.backupsTab.restore.col.type'), render: (r) => r.backup_type || '\u2014', hideOnMobile: true },
            { key: 'status', label: t('food.dbAdmin.backupsTab.restore.col.status'), render: (r) => statusChip(restoreStatus[r.status], r.status) },
            { key: 'started_at', label: t('food.dbAdmin.backupsTab.restore.col.startedAt'), render: (r) => formatDateTime(r.started_at) },
            { key: 'restored_by', label: t('food.dbAdmin.backupsTab.restore.col.restoredBy'), render: (r) => r.restored_by || '\u2014', hideOnMobile: true },
          ]}
          rows={restores.rows}
          rowKey={(r) => r.id}
          count={restores.count}
          page={restores.page}
          rowsPerPage={restores.rowsPerPage}
          pageSizeOptions={restores.pageSizeOptions}
          loading={restores.loading}
          error={restores.error}
          title={t('food.dbAdmin.backupsTab.restore.screenTitle')}
          subtitle={t('food.dbAdmin.backupsTab.restore.subtitle', { count: restores.count })}
          filters={[
            { key: 'status', label: t('food.dbAdmin.backupsTab.restore.col.status'), options: Object.entries(restoreStatus).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => restores.setFilter('status', v) },
          ]}
          onPageChange={restores.setPage}
          onRowsPerPageChange={restores.setRowsPerPage}
          onRefresh={restores.refresh}
          emptyTitle={t('food.dbAdmin.backupsTab.restore.emptyTitle')}
          emptyDescription={t('food.dbAdmin.backupsTab.restore.emptyDesc')}
        />
      )}
    </Box>
  );
};

const ReplicationTab = () => {
  const { t } = useTranslation();
  const table = useServerTable<ReplicationNode>({ fetchData: getReplicationNodes });
  const { rows, count, loading, error, searchInput, setSearchInput, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, setFilter } = table;

  return (
    <DataTable<ReplicationNode>
      columns={[
        { key: 'name', label: t('food.dbAdmin.replicationTab.col.name'), render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.name}</Typography> },
        { key: 'database_name', label: t('food.dbAdmin.replicationTab.col.dbName'), render: (r) => r.database_name || '—' },
        { key: 'node_type', label: t('food.dbAdmin.replicationTab.col.nodeType'), render: (r) => statusChip(replicationNodeType[r.node_type], r.node_type) },
        { key: 'sync_mode', label: t('food.dbAdmin.replicationTab.col.syncMode'), render: (r) => statusChip(syncMode[r.sync_mode], r.sync_mode) },
        { key: 'status', label: t('food.dbAdmin.replicationTab.col.status'), render: (r) => statusChip(replicationStatus[r.status], r.status) },
        { key: 'replication_lag_seconds', label: t('food.dbAdmin.replicationTab.col.lag'), sortable: true, render: (r) => r.replication_lag_seconds, hideOnMobile: true },
        { key: 'host', label: t('food.dbAdmin.replicationTab.col.host'), render: (r) => r.host, hideOnMobile: true },
      ]}
      rows={rows}
      rowKey={(r) => r.id}
      count={count}
      page={page}
      rowsPerPage={rowsPerPage}
      pageSizeOptions={pageSizeOptions}
      loading={loading}
      error={error}
      title={t('food.dbAdmin.replicationTab.screenTitle')}
      subtitle={t('food.dbAdmin.replicationTab.subtitle', { count })}
      searchInput={searchInput}
      onSearchChange={setSearchInput}
      searchPlaceholder={t('food.dbAdmin.replicationTab.searchPlaceholder')}
      filters={[
        { key: 'node_type', label: t('food.dbAdmin.replicationTab.filter.nodeType'), options: Object.entries(replicationNodeType).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => setFilter('node_type', v) },
        { key: 'status', label: t('food.dbAdmin.replicationTab.filter.status'), options: replicationStatusOptions, value: '', onChange: (v) => setFilter('status', v) },
      ]}
      onPageChange={setPage}
      onRowsPerPageChange={setRowsPerPage}
      onRefresh={refresh}
      emptyTitle={t('food.dbAdmin.replicationTab.emptyTitle')}
      emptyDescription={t('food.dbAdmin.replicationTab.emptyDesc')}
    />
  );
};

const PerformanceTab = () => {
  const { t } = useTranslation();
  const table = useServerTable<PerformanceMetric>({ fetchData: getPerformance });
  const { rows, count, loading, error, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions } = table;

  return (
    <DataTable<PerformanceMetric>
      columns={[
        { key: 'recorded_at', label: t('food.dbAdmin.performanceTab.col.recordedAt'), render: (r) => formatDateTime(r.recorded_at) },
        { key: 'database_name', label: t('food.dbAdmin.performanceTab.col.dbName'), render: (r) => r.database_name || '—', hideOnMobile: true },
        { key: 'cpu_usage', label: t('food.dbAdmin.performanceTab.col.cpuUsage'), sortable: true, render: (r) => `${r.cpu_usage}%` },
        { key: 'memory_usage', label: t('food.dbAdmin.performanceTab.col.memoryUsage'), render: (r) => `${r.memory_usage}%`, hideOnMobile: true },
        { key: 'connections', label: t('food.dbAdmin.performanceTab.col.connections'), render: (r) => r.connections, hideOnMobile: true },
        { key: 'cache_hit_ratio', label: t('food.dbAdmin.performanceTab.col.cacheHitRatio'), render: (r) => `${r.cache_hit_ratio}%`, hideOnMobile: true },
        { key: 'transaction_rate', label: t('food.dbAdmin.performanceTab.col.transactionRate'), render: (r) => r.transaction_rate, hideOnMobile: true },
        { key: 'deadlocks_count', label: t('food.dbAdmin.performanceTab.col.deadlocks'), render: (r) => (r.deadlocks_count > 0 ? <StatusChip label={String(r.deadlocks_count)} tone="error" /> : '0'), hideOnMobile: true },
      ]}
      rows={rows}
      rowKey={(r) => r.id}
      count={count}
      page={page}
      rowsPerPage={rowsPerPage}
      pageSizeOptions={pageSizeOptions}
      loading={loading}
      error={error}
      title={t('food.dbAdmin.performanceTab.screenTitle')}
      subtitle={t('food.dbAdmin.performanceTab.subtitle', { count })}
      onPageChange={setPage}
      onRowsPerPageChange={setRowsPerPage}
      onRefresh={refresh}
      emptyTitle={t('food.dbAdmin.performanceTab.emptyTitle')}
      emptyDescription={t('food.dbAdmin.performanceTab.emptyDesc')}
    />
  );
};

const QueriesTab = () => {
  const { t } = useTranslation();
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
        <Tab label={t('food.dbAdmin.queriesTab.tabs.stats')} />
        <Tab label={t('food.dbAdmin.queriesTab.tabs.slow')} />
      </Tabs>
      {tab === 0 && (
        <DataTable<QueryStatistic>
          columns={[
            { key: 'query_text', label: t('food.dbAdmin.queriesTab.stats.col.query'), render: (r) => <Typography sx={{ fontFamily: 'monospace', fontSize: 12, maxWidth: 420 }}>{r.query_text.slice(0, 80)}{r.query_text.length > 80 ? '…' : ''}</Typography> },
            { key: 'calls', label: t('food.dbAdmin.queriesTab.stats.col.calls'), sortable: true, render: (r) => r.calls, hideOnMobile: true },
            { key: 'total_time_ms', label: t('food.dbAdmin.queriesTab.stats.col.totalTime'), sortable: true, render: (r) => r.total_time_ms.toLocaleString() },
            { key: 'mean_time_ms', label: t('food.dbAdmin.queriesTab.stats.col.meanTime'), sortable: true, render: (r) => r.mean_time_ms.toFixed(2) },
            { key: 'rows', label: t('food.dbAdmin.queriesTab.stats.col.rows'), render: (r) => r.rows, hideOnMobile: true },
            { key: 'is_slow', label: t('food.dbAdmin.queriesTab.stats.col.slow'), render: (r) => (r.is_slow ? <StatusChip label={t('food.dbAdmin.queriesTab.stats.value.yes')} tone="error" /> : <StatusChip label={t('food.dbAdmin.queriesTab.stats.value.no')} tone="success" />) },
            { key: 'is_indexed', label: t('food.dbAdmin.queriesTab.stats.col.indexed'), render: (r) => (r.is_indexed ? <StatusChip label={t('food.dbAdmin.queriesTab.stats.value.yes')} tone="success" /> : <StatusChip label={t('food.dbAdmin.queriesTab.stats.value.no')} tone="warning" />), hideOnMobile: true },
          ]}
          rows={queries.rows}
          rowKey={(r) => r.id}
          count={queries.count}
          page={queries.page}
          rowsPerPage={queries.rowsPerPage}
          pageSizeOptions={queries.pageSizeOptions}
          loading={queries.loading}
          error={queries.error}
          title={t('food.dbAdmin.queriesTab.stats.screenTitle')}
          subtitle={t('food.dbAdmin.queriesTab.stats.subtitle', { count: queries.count })}
          onPageChange={queries.setPage}
          onRowsPerPageChange={queries.setRowsPerPage}
          onRefresh={queries.refresh}
          emptyTitle={t('food.dbAdmin.queriesTab.stats.emptyTitle')}
          emptyDescription={t('food.dbAdmin.queriesTab.stats.emptyDesc')}
        />
      )}
      {tab === 1 && (
        <DataTable<QueryStatistic>
          columns={[
            { key: 'query_text', label: t('food.dbAdmin.queriesTab.slow.col.query'), render: (r) => <Typography sx={{ fontFamily: 'monospace', fontSize: 12 }}>{r.query_text.slice(0, 100)}{r.query_text.length > 100 ? '…' : ''}</Typography> },
            { key: 'database_name', label: t('food.dbAdmin.queriesTab.slow.col.dbName'), render: (r) => r.database_name || '—' },
            { key: 'mean_time_ms', label: t('food.dbAdmin.queriesTab.slow.col.meanTime'), render: (r) => <StatusChip label={`${r.mean_time_ms.toFixed(2)} ms`} tone={r.mean_time_ms > 5 ? 'error' : 'warning'} /> },
            { key: 'calls', label: t('food.dbAdmin.queriesTab.slow.col.calls'), render: (r) => r.calls, hideOnMobile: true },
            { key: 'rows', label: t('food.dbAdmin.queriesTab.slow.col.rows'), render: (r) => r.rows, hideOnMobile: true },
            { key: 'is_indexed', label: t('food.dbAdmin.queriesTab.slow.col.indexed'), render: (r) => (r.is_indexed ? <StatusChip label={t('food.dbAdmin.queriesTab.slow.value.yes')} tone="success" /> : <StatusChip label={t('food.dbAdmin.queriesTab.slow.value.no')} tone="warning" />) },
          ]}
          rows={slowQueries}
          rowKey={(r) => r.id}
          count={slowQueries.length}
          page={1}
          rowsPerPage={slowQueries.length}
          loading={slowQueries.length === 0}
          title={t('food.dbAdmin.queriesTab.slow.screenTitle')}
          subtitle={t('food.dbAdmin.queriesTab.slow.subtitle')}
          emptyTitle={t('food.dbAdmin.queriesTab.slow.emptyTitle')}
          emptyDescription={t('food.dbAdmin.queriesTab.slow.emptyDesc')}
        />
      )}
    </Box>
  );
};

const StorageTab = () => {
  const { t } = useTranslation();
  const table = useServerTable<StorageUsage>({ fetchData: getStorageUsage });
  const { rows, count, loading, error, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, setFilter } = table;

  return (
    <DataTable<StorageUsage>
      columns={[
        { key: 'table_name', label: t('food.dbAdmin.storageTab.col.tableName'), render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.table_name || '*'}</Typography> },
        { key: 'schema_name', label: t('food.dbAdmin.storageTab.col.schema'), render: (r) => r.schema_name || '—' },
        { key: 'database_name', label: t('food.dbAdmin.storageTab.col.dbName'), render: (r) => r.database_name || '—', hideOnMobile: true },
        { key: 'table_size_mb', label: t('food.dbAdmin.storageTab.col.tableSizeMb'), sortable: true, render: (r) => r.table_size_mb.toLocaleString() },
        { key: 'index_size_mb', label: t('food.dbAdmin.storageTab.col.indexSizeMb'), render: (r) => r.index_size_mb.toLocaleString(), hideOnMobile: true },
        { key: 'rows_count', label: t('food.dbAdmin.storageTab.col.rowsCount'), render: (r) => r.rows_count.toLocaleString(), hideOnMobile: true },
        { key: 'bloat_estimate', label: t('food.dbAdmin.storageTab.col.bloatEstimate'), render: (r) => (r.bloat_estimate > 10 ? <StatusChip label={`${r.bloat_estimate.toFixed(1)} MB`} tone="warning" /> : r.bloat_estimate.toFixed(1)), hideOnMobile: true },
      ]}
      rows={rows}
      rowKey={(r) => r.id}
      count={count}
      page={page}
      rowsPerPage={rowsPerPage}
      pageSizeOptions={pageSizeOptions}
      loading={loading}
      error={error}
      title={t('food.dbAdmin.storageTab.screenTitle')}
      subtitle={t('food.dbAdmin.storageTab.subtitle', { count })}
      filters={[
        { key: 'schema_name', label: t('food.dbAdmin.storageTab.col.schema'), options: [], value: '', onChange: (v) => setFilter('schema_name', v) },
      ]}
      onPageChange={setPage}
      onRowsPerPageChange={setRowsPerPage}
      onRefresh={refresh}
      emptyTitle={t('food.dbAdmin.storageTab.emptyTitle')}
      emptyDescription={t('food.dbAdmin.storageTab.emptyDesc')}
    />
  );
};

const MaintenanceTab = () => {
  const { t } = useTranslation();
  const table = useServerTable<MaintenanceJob>({ fetchData: getMaintenanceJobs });
  const { rows, count, loading, error, searchInput, setSearchInput, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, setFilter } = table;

  const handleRun = async (id: string) => {
    try {
      await runMaintenanceJob(id);
      notifySuccess(t('food.dbAdmin.maintenanceTab.toast.success'));
      refresh();
    } catch {
      notifyError(t('food.dbAdmin.maintenanceTab.toast.error'));
    }
  };

  return (
    <DataTable<MaintenanceJob>
      columns={[
        { key: 'name', label: t('food.dbAdmin.maintenanceTab.col.name'), render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.name}</Typography> },
        { key: 'job_type', label: t('food.dbAdmin.maintenanceTab.col.type'), render: (r) => statusChip(maintenanceJobType[r.job_type], r.job_type) },
        { key: 'frequency', label: t('food.dbAdmin.maintenanceTab.col.frequency'), render: (r) => r.frequency, hideOnMobile: true },
        { key: 'database_name', label: t('food.dbAdmin.maintenanceTab.col.dbName'), render: (r) => r.database_name || '—', hideOnMobile: true },
        { key: 'next_run_at', label: t('food.dbAdmin.maintenanceTab.col.nextRun'), render: (r) => (r.next_run_at ? formatDateTime(r.next_run_at) : '—'), hideOnMobile: true },
        { key: 'status', label: t('food.dbAdmin.maintenanceTab.col.status'), render: (r) => statusChip(maintenanceStatus[r.status], r.status) },
      ]}
      rows={rows}
      rowKey={(r) => r.id}
      count={count}
      page={page}
      rowsPerPage={rowsPerPage}
      pageSizeOptions={pageSizeOptions}
      loading={loading}
      error={error}
      title={t('food.dbAdmin.maintenanceTab.screenTitle')}
      subtitle={t('food.dbAdmin.maintenanceTab.subtitle', { count })}
      searchInput={searchInput}
      onSearchChange={setSearchInput}
      searchPlaceholder={t('food.dbAdmin.maintenanceTab.searchPlaceholder')}
      filters={[
        { key: 'job_type', label: t('food.dbAdmin.maintenanceTab.filter.type'), options: maintenanceTypeOptions, value: '', onChange: (v) => setFilter('job_type', v) },
        { key: 'status', label: t('food.dbAdmin.maintenanceTab.filter.status'), options: maintenanceStatusOptions, value: '', onChange: (v) => setFilter('status', v) },
      ]}
      onPageChange={setPage}
      onRowsPerPageChange={setRowsPerPage}
      onRefresh={refresh}
      actions={(r) =>
        r.status !== 'COMPLETED' ? (
          <Tooltip title={t('food.dbAdmin.maintenanceTab.action.run')}>
            <IconButton aria-label={t('food.dbAdmin.maintenanceTab.action.run')} size="small" color="primary" onClick={() => handleRun(r.id)}>
              <BuildIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : null
      }
      emptyTitle={t('food.dbAdmin.maintenanceTab.emptyTitle')}
      emptyDescription={t('food.dbAdmin.maintenanceTab.emptyDesc')}
    />
  );
};

const AlertsTab = () => {
  const { t } = useTranslation();
  const table = useServerTable<DbAlert>({ fetchData: getDbAlerts });
  const { rows, count, loading, error, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, setFilter } = table;

  const handleAck = async (id: string) => {
    try {
      await acknowledgeAlert(id);
      notifySuccess(t('food.dbAdmin.alertsTab.toast.ack'));
      refresh();
    } catch {
      notifyError(t('food.dbAdmin.alertsTab.toast.ackError'));
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await resolveAlert(id);
      notifySuccess(t('food.dbAdmin.alertsTab.toast.resolve'));
      refresh();
    } catch {
      notifyError(t('food.dbAdmin.alertsTab.toast.resolveError'));
    }
  };

  return (
    <DataTable<DbAlert>
      columns={[
        { key: 'title', label: t('food.dbAdmin.alertsTab.col.title'), render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.title}</Typography> },
        { key: 'alert_type', label: t('food.dbAdmin.alertsTab.col.type'), render: (r) => statusChip(dbAlertType[r.alert_type], r.alert_type) },
        { key: 'severity', label: t('food.dbAdmin.alertsTab.col.severity'), render: (r) => statusChip(dbAlertSeverity[r.severity], r.severity) },
        { key: 'database_name', label: t('food.dbAdmin.alertsTab.col.dbName'), render: (r) => r.database_name || '—', hideOnMobile: true },
        { key: 'status', label: t('food.dbAdmin.alertsTab.col.status'), render: (r) => statusChip(dbAlertStatus[r.status], r.status) },
        { key: 'created_at', label: t('food.dbAdmin.alertsTab.col.time'), render: (r) => formatDateTime(r.created_at), hideOnMobile: true },
      ]}
      rows={rows}
      rowKey={(r) => r.id}
      count={count}
      page={page}
      rowsPerPage={rowsPerPage}
      pageSizeOptions={pageSizeOptions}
      loading={loading}
      error={error}
      title={t('food.dbAdmin.alertsTab.screenTitle')}
      subtitle={t('food.dbAdmin.alertsTab.subtitle', { count })}
      filters={[
        { key: 'alert_type', label: t('food.dbAdmin.alertsTab.filter.type'), options: alertTypeOptions, value: '', onChange: (v) => setFilter('alert_type', v) },
        { key: 'severity', label: t('food.dbAdmin.alertsTab.filter.severity'), options: alertSeverityOptions, value: '', onChange: (v) => setFilter('severity', v) },
        { key: 'status', label: t('food.dbAdmin.alertsTab.filter.status'), options: alertStatusOptions, value: '', onChange: (v) => setFilter('status', v) },
      ]}
      onPageChange={setPage}
      onRowsPerPageChange={setRowsPerPage}
      onRefresh={refresh}
      actions={(r) => (
        <Stack direction="row" spacing={0.5}>
          {r.status === 'NEW' && (
            <Tooltip title={t('food.dbAdmin.alertsTab.action.ack')}>
              <IconButton aria-label={t('food.dbAdmin.alertsTab.action.ackAria')} size="small" color="info" onClick={() => handleAck(r.id)}>
                <VerifiedUserIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {r.status !== 'RESOLVED' && (
            <Tooltip title={t('food.dbAdmin.alertsTab.action.resolve')}>
              <IconButton aria-label={t('food.dbAdmin.alertsTab.action.resolveAria')} size="small" color="success" onClick={() => handleResolve(r.id)}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      )}
      emptyTitle={t('food.dbAdmin.alertsTab.emptyTitle')}
      emptyDescription={t('food.dbAdmin.alertsTab.emptyDesc')}
    />
  );
};

const AuditTab = () => {
  const { t } = useTranslation();
  const [tab, setTab] = useState(0);
  const audits = useServerTable<AuditLog>({ fetchData: getAuditLogs });
  const activities = useServerTable<ActivityLog>({ fetchData: getActivityLogs });

  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label={t('food.dbAdmin.auditTab.tabs.audit')} />
        <Tab label={t('food.dbAdmin.auditTab.tabs.activity')} />
      </Tabs>
      {tab === 0 && (
        <DataTable<AuditLog>
          columns={[
            { key: 'action', label: t('food.dbAdmin.auditTab.audit.col.action'), render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.action}</Typography> },
            { key: 'user_email', label: t('food.dbAdmin.auditTab.audit.col.user'), render: (r) => r.user_email || '—' },
            { key: 'resource_type', label: t('food.dbAdmin.auditTab.audit.col.resource'), render: (r) => r.resource_type || '—', hideOnMobile: true },
            { key: 'success', label: t('food.dbAdmin.auditTab.audit.col.result'), render: (r) => (r.success ? <StatusChip label={t('food.dbAdmin.auditTab.audit.result.success')} tone="success" /> : <StatusChip label={t('food.dbAdmin.auditTab.audit.result.fail')} tone="error" />) },
            { key: 'created_at', label: t('food.dbAdmin.auditTab.audit.col.time'), render: (r) => formatDateTime(r.created_at), hideOnMobile: true },
          ]}
          rows={audits.rows}
          rowKey={(r) => r.id}
          count={audits.count}
          page={audits.page}
          rowsPerPage={audits.rowsPerPage}
          pageSizeOptions={audits.pageSizeOptions}
          loading={audits.loading}
          error={audits.error}
          title={t('food.dbAdmin.auditTab.audit.screenTitle')}
          subtitle={t('food.dbAdmin.auditTab.audit.subtitle', { count: audits.count })}
          onPageChange={audits.setPage}
          onRowsPerPageChange={audits.setRowsPerPage}
          onRefresh={audits.refresh}
          emptyTitle={t('food.dbAdmin.auditTab.audit.emptyTitle')}
          emptyDescription={t('food.dbAdmin.auditTab.audit.emptyDesc')}
        />
      )}
      {tab === 1 && (
        <DataTable<ActivityLog>
          columns={[
            { key: 'description', label: t('food.dbAdmin.auditTab.activity.col.description'), render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.description}</Typography> },
            { key: 'activity_type', label: t('food.dbAdmin.auditTab.activity.col.type'), render: (r) => <StatusChip label={r.type_label || r.activity_type} tone="info" /> },
            { key: 'user_email', label: t('food.dbAdmin.auditTab.activity.col.user'), render: (r) => r.user_email || '—' },
            { key: 'performed_at', label: t('food.dbAdmin.auditTab.activity.col.time'), render: (r) => formatDateTime(r.performed_at), hideOnMobile: true },
          ]}
          rows={activities.rows}
          rowKey={(r) => r.id}
          count={activities.count}
          page={activities.page}
          rowsPerPage={activities.rowsPerPage}
          pageSizeOptions={activities.pageSizeOptions}
          loading={activities.loading}
          error={activities.error}
          title={t('food.dbAdmin.auditTab.activity.screenTitle')}
          subtitle={t('food.dbAdmin.auditTab.activity.subtitle', { count: activities.count })}
          onPageChange={activities.setPage}
          onRowsPerPageChange={activities.setRowsPerPage}
          onRefresh={activities.refresh}
          emptyTitle={t('food.dbAdmin.auditTab.activity.emptyTitle')}
          emptyDescription={t('food.dbAdmin.auditTab.activity.emptyDesc')}
        />
      )}
    </Box>
  );
};

const ReportingTab = () => {
  const { t } = useTranslation();
  const plans = useServerTable<DisasterRecoveryPlan>({ fetchData: getDisasterRecoveryPlans });
  const settings = useServerTable<import('../../types/dbAdmin').DbSetting>({ fetchData: getDbSettings });

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <DataTable<DisasterRecoveryPlan>
            columns={[
              { key: 'name', label: t('food.dbAdmin.reportingTab.plans.col.name'), render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.name}</Typography> },
              { key: 'status', label: t('food.dbAdmin.reportingTab.plans.col.status'), render: (r) => statusChip(drPlanStatus[r.status], r.status) },
              { key: 'recovery_time_objective', label: t('food.dbAdmin.reportingTab.plans.col.rto'), render: (r) => r.recovery_time_objective, hideOnMobile: true },
              { key: 'recovery_point_objective', label: t('food.dbAdmin.reportingTab.plans.col.rpo'), render: (r) => r.recovery_point_objective, hideOnMobile: true },
              { key: 'backup_site', label: t('food.dbAdmin.reportingTab.plans.col.backupSite'), render: (r) => r.backup_site || '—', hideOnMobile: true },
              { key: 'tested_at', label: t('food.dbAdmin.reportingTab.plans.col.testedAt'), render: (r) => (r.tested_at ? formatDateTime(r.tested_at) : '—'), hideOnMobile: true },
            ]}
            rows={plans.rows}
            rowKey={(r) => r.id}
            count={plans.count}
            page={plans.page}
            rowsPerPage={plans.rowsPerPage}
            pageSizeOptions={plans.pageSizeOptions}
            loading={plans.loading}
            error={plans.error}
            title={t('food.dbAdmin.reportingTab.plans.screenTitle')}
            subtitle={t('food.dbAdmin.reportingTab.plans.subtitle', { count: plans.count })}
            onPageChange={plans.setPage}
            onRowsPerPageChange={plans.setRowsPerPage}
            onRefresh={plans.refresh}
            emptyTitle={t('food.dbAdmin.reportingTab.plans.emptyTitle')}
            emptyDescription={t('food.dbAdmin.reportingTab.plans.emptyDesc')}
          />
        </Grid>
        <Grid item xs={12}>
          <DataTable<import('../../types/dbAdmin').DbSetting>
            columns={[
              { key: 'key', label: t('food.dbAdmin.reportingTab.settings.col.key'), render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.key}</Typography> },
              { key: 'label', label: t('food.dbAdmin.reportingTab.settings.col.label') },
              { key: 'value', label: t('food.dbAdmin.reportingTab.settings.col.value'), render: (r) => (r.is_encrypted ? t('food.dbAdmin.reportingTab.settings.value.encrypted') : r.value || '—') },
              { key: 'group', label: t('food.dbAdmin.reportingTab.settings.col.group'), render: (r) => <StatusChip label={dbSettingGroup[r.group] || r.group} tone="info" /> },
              { key: 'is_encrypted', label: t('food.dbAdmin.reportingTab.settings.col.encrypted'), render: (r) => (r.is_encrypted ? t('food.dbAdmin.reportingTab.settings.value.yes') : t('food.dbAdmin.reportingTab.settings.value.no')), hideOnMobile: true },
            ]}
            rows={settings.rows}
            rowKey={(r) => r.id}
            count={settings.count}
            page={settings.page}
            rowsPerPage={settings.rowsPerPage}
            pageSizeOptions={settings.pageSizeOptions}
            loading={settings.loading}
            error={settings.error}
            title={t('food.dbAdmin.reportingTab.settings.screenTitle')}
            subtitle={t('food.dbAdmin.reportingTab.settings.subtitle', { count: settings.count })}
            onPageChange={settings.setPage}
            onRowsPerPageChange={settings.setRowsPerPage}
            onRefresh={settings.refresh}
            emptyTitle={t('food.dbAdmin.reportingTab.settings.emptyTitle')}
            emptyDescription={t('food.dbAdmin.reportingTab.settings.emptyDesc')}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

const DbAdminPage = () => {
  const { t } = useTranslation();
  const tabItems = [
    { label: t('food.dbAdmin.parent.tabs.overview'), icon: <StorageIcon /> },
    { label: t('food.dbAdmin.parent.tabs.databases'), icon: <StorageOutlinedIcon /> },
    { label: t('food.dbAdmin.parent.tabs.schemas'), icon: <BackupTableIcon /> },
    { label: t('food.dbAdmin.parent.tabs.users_roles'), icon: <PeopleIcon /> },
    { label: t('food.dbAdmin.parent.tabs.security'), icon: <SecurityIcon /> },
    { label: t('food.dbAdmin.parent.tabs.backups'), icon: <BackupIcon /> },
    { label: t('food.dbAdmin.parent.tabs.replication'), icon: <SyncAltIcon /> },
    { label: t('food.dbAdmin.parent.tabs.performance'), icon: <SpeedIcon /> },
    { label: t('food.dbAdmin.parent.tabs.queries'), icon: <QueryStatsIcon /> },
    { label: t('food.dbAdmin.parent.tabs.storage'), icon: <StorageUsageIcon /> },
    { label: t('food.dbAdmin.parent.tabs.maintenance'), icon: <BuildIcon /> },
    { label: t('food.dbAdmin.parent.tabs.alerts'), icon: <NotificationsActiveIcon /> },
    { label: t('food.dbAdmin.parent.tabs.audit'), icon: <HistoryIcon /> },
    { label: t('food.dbAdmin.parent.tabs.reporting'), icon: <AdminPanelSettingsIcon /> },
  ];

  const SECTIONS = [
    { id: 'overview', label: t('food.dbAdmin.parent.sections.overview'), icon: <StorageIcon fontSize="small" /> },
    { id: 'databases', label: t('food.dbAdmin.parent.sections.databases'), icon: <StorageOutlinedIcon fontSize="small" /> },
    { id: 'schemas', label: t('food.dbAdmin.parent.sections.schemas'), icon: <BackupTableIcon fontSize="small" /> },
    { id: 'users-roles', label: t('food.dbAdmin.parent.sections.users_roles'), icon: <PeopleIcon fontSize="small" /> },
    { id: 'security', label: t('food.dbAdmin.parent.sections.security'), icon: <SecurityIcon fontSize="small" /> },
    { id: 'backups', label: t('food.dbAdmin.parent.sections.backups'), icon: <BackupIcon fontSize="small" /> },
    { id: 'replication', label: t('food.dbAdmin.parent.sections.replication'), icon: <SyncAltIcon fontSize="small" /> },
    { id: 'performance', label: t('food.dbAdmin.parent.sections.performance'), icon: <SpeedIcon fontSize="small" /> },
    { id: 'queries', label: t('food.dbAdmin.parent.sections.queries'), icon: <QueryStatsIcon fontSize="small" /> },
    { id: 'storage', label: t('food.dbAdmin.parent.sections.storage'), icon: <StorageUsageIcon fontSize="small" /> },
    { id: 'maintenance', label: t('food.dbAdmin.parent.sections.maintenance'), icon: <BuildIcon fontSize="small" /> },
    { id: 'alerts', label: t('food.dbAdmin.parent.sections.alerts'), icon: <NotificationsActiveIcon fontSize="small" /> },
    { id: 'audit', label: t('food.dbAdmin.parent.sections.audit'), icon: <HistoryIcon fontSize="small" /> },
    { id: 'reporting', label: t('food.dbAdmin.parent.sections.reporting'), icon: <AdminPanelSettingsIcon fontSize="small" /> },
  ] as const;

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
        eyebrow={t('food.dbAdmin.parent.hero.eyebrow')}
        title={t('food.dbAdmin.parent.hero.title')}
        subtitle={t('food.dbAdmin.parent.hero.subtitle')}
        gradient="ocean"
        avatarLabel="ن"
        chips={[
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>{todayArabic()}</Box>,
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#8ff5d4', flexShrink: 0 }} />
            {t('food.dbAdmin.parent.hero.live')}
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
            label={t('food.dbAdmin.parent.rail.label')}
          />
        </Grid>
        <Grid item xs={12} md={9.8} lg={10.2}>
      <PageHeader
        title={t('food.dbAdmin.parent.pageHeader.title')}
        subtitle={t('food.dbAdmin.parent.pageHeader.subtitle')}
        eyebrow={t('food.dbAdmin.parent.pageHeader.eyebrow')}
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