import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Divider from '@mui/material/Divider';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { useEffect, useState } from 'react';
import { C, PageTitle, SurfaceCard, StateBox } from '../shared';
import { DataTable, EmptyState, StatusChip } from '../../../components/uikit';
import { useServerTable } from '../../../hooks/useServerTable';
import { useTableExport } from '../../../hooks/useTableExport';
import { formatDateTime, formatRelativeTime } from '../../../utils/formatters';
import { getAirportStaff, getAirportActivityLog } from '../../../api/endpoints/airport';
import { listRoles } from '../../../api/endpoints/roles';
import { getNotifications, type AppNotification } from '../../../api/endpoints/notifications';
import { getRiskSettings } from '../../../api/endpoints/risk';
import type { AirportActivityLog, AirportStaff } from '../../../types/airport';
import { AIRPORT_STAFF_ROLE_LABELS, AIRPORT_ACTIVITY_ACTION_LABELS } from '../../../types/airport';
import type { AirportStaffRole } from '../../../types/airport';
import type { Role } from '../../../types/user';
import type { RiskSettings } from '../../../types/risk';

const roleLabel = (role: string, roleLabelValue?: string) =>
  roleLabelValue || AIRPORT_STAFF_ROLE_LABELS[role as AirportStaffRole] || role;

/* ============================== 16. المستخدمون ============================== */

export const Users = () => {
  const t = useServerTable<AirportStaff>({ fetchData: getAirportStaff });
  const { exporting, exportAll } = useTableExport(t.fetchAllRows);
  const handleExport = () => exportAll({
    filename: `airport-staff-${new Date().toISOString().slice(0, 10)}.csv`,
    headers: ['الاسم الكامل', 'الدور', 'المطار', 'البريد الإلكتروني', 'الهاتف', 'الوردية', 'الحالة'],
    mapRow: (r: AirportStaff) => [
      r.full_name,
      roleLabel(r.role, r.role_label),
      r.airport_name || '',
      r.email || '',
      r.phone || '',
      r.shift || '',
      r.is_active ? 'نشط' : 'معطّل',
    ],
    message: 'تم تصدير الموظفين',
  });

  return (
    <Box>
      <PageTitle title="المستخدمون والأدوار" subtitle="إدارة الوصول إلى نظام الصحة بالمطار" />
      <DataTable<AirportStaff>
        columns={[
          { key: 'full_name', label: 'الاسم الكامل', render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.full_name}</Typography> },
          { key: 'role_label', label: 'الدور', render: (r) => <StatusChip label={roleLabel(r.role, r.role_label)} tone="info" /> },
          { key: 'airport_name', label: 'المطار', render: (r) => r.airport_name || '—', hideOnMobile: true },
          { key: 'email', label: 'البريد الإلكتروني', render: (r) => r.email || '—', hideOnMobile: true },
          { key: 'phone', label: 'الهاتف', render: (r) => r.phone || '—', hideOnMobile: true },
          { key: 'shift', label: 'الوردية', render: (r) => r.shift || '—', hideOnMobile: true },
          { key: 'is_active', label: 'الحالة', render: (r) => <StatusChip label={r.is_active ? 'نشط' : 'معطّل'} tone={r.is_active ? 'success' : 'neutral'} /> },
        ]}
        rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
        pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
        title="موظفو المطارات" subtitle={`${t.count} موظف مسجّل`}
        searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder="بحث بالاسم أو البريد أو الدور"
        filters={[{ key: 'role', label: 'الدور', options: Object.entries(AIRPORT_STAFF_ROLE_LABELS).map(([v, label]) => ({ value: v, label })), value: '', onChange: (v) => t.setFilter('role', v) }]}
        sortBy={t.sortBy} sortOrder={t.sortOrder} onSortChange={t.setSorting}
        onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onExport={handleExport} exporting={exporting} onRefresh={t.refresh}
        emptyTitle="لا يوجد موظفون" emptyDescription="لم يُسجَّل موظفون مطابقون لهذه المعايير."
      />
    </Box>
  );
};

/* ================================ 17. الأدوار ================================ */

const SCOPE_LABELS: Record<string, string> = {
  GLOBAL: 'عام',
  STATE: 'ولاية',
  LOCALITY: 'محلية',
  FACILITY: 'منشأة صحية',
  POINT: 'نقطة حدودية',
  PORT: 'ميناء',
  REGION: 'منطقة',
  SECTOR: 'قطاع إداري',
  DEPARTMENT: 'إدارة',
  STATION: 'محطة',
  COMPANY: 'شركة',
};

export const Roles = () => {
  const t = useServerTable<Role>({ fetchData: listRoles });
  const { exporting, exportAll } = useTableExport(t.fetchAllRows);
  const handleExport = () => exportAll({
    filename: `airport-roles-${new Date().toISOString().slice(0, 10)}.csv`,
    headers: ['الدور', 'الرمز', 'النطاق الافتراضي', 'عدد الأذونات', 'عدد المستخدمين'],
    mapRow: (r: Role) => [
      r.name_ar || r.name,
      r.code,
      r.default_scope ? (SCOPE_LABELS[r.default_scope] || r.default_scope) : '',
      r.permission_count != null ? String(r.permission_count) : '',
      r.user_count != null ? String(r.user_count) : '',
    ],
    message: 'تم تصدير الأدوار',
  });

  return (
    <Box>
      <PageTitle title="الأدوار والأذونات" subtitle="منح الوصول لوحدات نظام الحجر الصحي حسب الدور الوظيفي" />
      <DataTable<Role>
        columns={[
          { key: 'name_ar', label: 'الدور', render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.name_ar || r.name}</Typography> },
          { key: 'code', label: 'الرمز', render: (r) => <Typography sx={{ fontFamily: 'monospace' }}>{r.code}</Typography>, hideOnMobile: true },
          { key: 'default_scope', label: 'النطاق الافتراضي', render: (r) => (r.default_scope ? (SCOPE_LABELS[r.default_scope] || r.default_scope) : '—'), hideOnMobile: true },
          { key: 'permission_count', label: 'الأذونات', render: (r) => <StatusChip label={String(r.permission_count ?? 0)} tone="info" />, align: 'center' },
          { key: 'user_count', label: 'المستخدمون', render: (r) => <StatusChip label={String(r.user_count ?? 0)} tone="neutral" />, align: 'center' },
          { key: 'description', label: 'الوصف', render: (r) => r.description || '—', noWrap: false, hideOnMobile: true },
        ]}
        rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
        pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
        title="أدوار النظام" subtitle={`${t.count} دور مسجّل`}
        searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder="بحث بالاسم أو الرمز"
        sortBy={t.sortBy} sortOrder={t.sortOrder} onSortChange={t.setSorting}
        onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onExport={handleExport} exporting={exporting} onRefresh={t.refresh}
        emptyTitle="لا توجد أدوار" emptyDescription="لم تُسجَّل أدوار مطابقة لهذه المعايير."
      />
    </Box>
  );
};

/* =============================== 18. سجل التدقيق =============================== */

export const AuditLogs = () => {
  const t = useServerTable<AirportActivityLog>({ fetchData: getAirportActivityLog });
  const { exporting, exportAll } = useTableExport(t.fetchAllRows);
  const handleExport = () => exportAll({
    filename: `airport-audit-log-${new Date().toISOString().slice(0, 10)}.csv`,
    headers: ['الوقت', 'المنفّذ', 'الإجراء', 'الوصف', 'الهدف', 'المطار'],
    mapRow: (r: AirportActivityLog) => [
      formatDateTime(r.created_at),
      r.actor_display || r.actor_name || '',
      r.action_label || AIRPORT_ACTIVITY_ACTION_LABELS[r.action] || r.action,
      r.description || '',
      r.target_label || '',
      r.airport_name || '',
    ],
    message: 'تم تصدير سجل التدقيق',
  });

  return (
    <Box>
      <PageTitle title="سجل التدقيق" subtitle="السجل غير القابل للتعديل لأحداث النظام الحساسة" />
      <DataTable<AirportActivityLog>
        columns={[
          { key: 'created_at', label: 'الوقت', render: (r) => <Typography sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{formatDateTime(r.created_at)}</Typography>, hideOnMobile: true },
          { key: 'actor_display', label: 'المنفّذ', render: (r) => r.actor_display || r.actor_name || '—' },
          { key: 'action_label', label: 'الإجراء', render: (r) => <StatusChip label={r.action_label || AIRPORT_ACTIVITY_ACTION_LABELS[r.action] || r.action} tone="primary" /> },
          { key: 'description', label: 'الوصف', render: (r) => r.description || '—', noWrap: false },
          { key: 'target_label', label: 'الهدف', render: (r) => r.target_label || '—', hideOnMobile: true },
          { key: 'airport_name', label: 'المطار', render: (r) => r.airport_name || '—', hideOnMobile: true },
        ]}
        rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
        pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
        title="سجل نشاط المطار" subtitle={`${t.count} حدث مسجّل`}
        searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder="بحث في الوصف أو المنفّذ"
        filters={[{ key: 'action', label: 'الإجراء', options: Object.entries(AIRPORT_ACTIVITY_ACTION_LABELS).map(([v, label]) => ({ value: v, label })), value: '', onChange: (v) => t.setFilter('action', v) }]}
        sortBy={t.sortBy} sortOrder={t.sortOrder} onSortChange={t.setSorting}
        onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onExport={handleExport} exporting={exporting} onRefresh={t.refresh}
        emptyTitle="لا توجد أحداث" emptyDescription="لم يُسجَّل أي نشاط مطابق لهذه المعايير بعد."
      />
    </Box>
  );
};

/* =============================== 19. الإعدادات =============================== */

/** معايير تقييم المخاطر الحقيقية من محرك المخاطر (`/risk/settings/`). */
const RiskSettingsCard = () => {
  const [settings, setSettings] = useState<RiskSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    getRiskSettings()
      .then((res) => { if (mounted) { setSettings(res.data.data); setLoading(false); } })
      .catch(() => { if (mounted) { setError(true); setLoading(false); } });
    return () => { mounted = false; };
  }, []);

  if (loading) return <StateBox type="loading" text="يتم تحميل معايير تقييم المخاطر…" />;
  if (error || !settings) return <StateBox type="error" text="تعذر تحميل معايير تقييم المخاطر" />;

  const weights: [string, number][] = [
    ['الحرارة', settings.temp_weight],
    ['الأكسجين (SpO2)', settings.spo2_weight],
    ['الأعراض', settings.symptom_weight],
    ['بلد القدوم', settings.origin_weight],
    ['التطعيم', settings.vaccine_weight],
  ];
  const thresholds: [string, number][] = [
    ['حد التحذير (أصفر)', settings.yellow_threshold],
    ['حد الخطر (أحمر)', settings.red_threshold],
    ['حرارة الإنذار', settings.red_temp_threshold],
    ['أكسجين الإنذار', settings.red_spo2_threshold],
  ];

  return (
    <SurfaceCard title="معايير تقييم المخاطر" subtitle="أوزان وحدود محرك تقييم مخاطر المسافرين — مباشر من النظام">
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>الأوزان</Typography>
          <Stack spacing={0.75} sx={{ mt: 1 }} divider={<Divider />}>
            {weights.map(([label, value]) => (
              <Stack key={label} direction="row" justifyContent="space-between">
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{label}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: C.primary }}>{value}</Typography>
              </Stack>
            ))}
          </Stack>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>الحدود</Typography>
          <Stack spacing={0.75} sx={{ mt: 1 }} divider={<Divider />}>
            {thresholds.map(([label, value]) => (
              <Stack key={label} direction="row" justifyContent="space-between">
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{label}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: C.warning }}>{value}</Typography>
              </Stack>
            ))}
          </Stack>
        </Grid>
      </Grid>
    </SurfaceCard>
  );
};

export const Settings = () => (
  <Box>
    <PageTitle title="إعدادات النظام" subtitle="تهيئة سلوك النظام وإعدادات التشغيل المحلي" />

    <Grid container spacing={3}>
      <Grid item xs={12}>
        <RiskSettingsCard />
      </Grid>

      <Grid item xs={12} lg={6}>
        <SurfaceCard title="إعدادات التشغيل">
          <Stack spacing={1.5} divider={<Divider />}>
            {[
              ['وضع عدم الاتصال (Offline) للمحطات', 'يعمل النظام على الشبكة الداخلية دون اتصال بالإنترنت', true],
              ['المزامنة التلقائية مع المركز', 'مزامنة البيانات لحظياً إلى المركز الوطني لعلم الأوبئة', true],
              ['طباعة الملصقات فوراً', 'طباعة الباركود لكل عينة بشكل تلقائي', true],
              ['الإبلاغ الجماعي عبر النافذة', 'تفعيل إشعار التبليغ الجماعي للمخالطين', true],
              ['وضع المراقبة الليلية', 'تقليل الفحوصات الضوضائية بعد منتصف الليل', false],
            ].map(([t, d, on]) => (
              <Stack key={t as string} direction="row" justifyContent="space-between" alignItems="center" gap={2}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{t}</Typography>
                  <Typography variant="caption" color="text.secondary">{d}</Typography>
                </Box>
                <Switch defaultChecked={on as boolean} />
              </Stack>
            ))}
            <Button variant="contained" sx={{ alignSelf: 'flex-start', borderRadius: 2.5 }} startIcon={<SettingsSuggestIcon />}>حفظ التغييرات</Button>
          </Stack>
        </SurfaceCard>
      </Grid>

      <Grid item xs={12} lg={6}>
        <Stack spacing={3}>
          <SurfaceCard title="التكاملات">
            <Stack spacing={1} divider={<Divider />}>
              {[
                ['نظام مطار الخرطوم للمسافرين', 'متصل ✓'],
                ['منصة علم الأوبئة متلازمة الجهاز التنفسي', 'متصل مزامنة ✓'],
                ['قاعدة بيانات النفايات الصحية', 'بانتظار الربط'],
                ['منصة اللوائح الصحية الدولية eLAP', 'بانتظار الربط'],
              ].map(([n, s]) => (
                <Stack key={n as string} direction="row" justifyContent="space-between">
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{n}</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: s === 'متصل ✓' || s === 'متصل مزامنة ✓' ? C.success : C.warning }}>{s}</Typography>
                </Stack>
              ))}
            </Stack>
          </SurfaceCard>

          <SurfaceCard title="تنبيهات النظام">
            <Stack spacing={1} divider={<Divider />}>
              {[
                ['نتائج مخبرية موجبة', 'إشعار فوري للمشرف وطبيب الواجب', true],
                ['اكتمال تكدس الفحص (طابور)', 'تنبيه عند تجاوز سعة بوابة الفحص', true],
                ['انتهاء صلاحية الشهادات', 'إشعار قبل 7 أيام من انتهاء الصلاحية', false],
              ].map(([t, d, on]) => (
                <FormControlLabel
                  key={t as string}
                  control={<Switch size="small" defaultChecked={on as boolean} />}
                  label={
                    <Stack spacing={0}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{t}</Typography>
                      <Typography variant="caption" color="text.secondary">{d}</Typography>
                    </Stack>
                  }
                />
              ))}
            </Stack>
          </SurfaceCard>
        </Stack>
      </Grid>
    </Grid>
  </Box>
);

/* ============================== 20. الإشعارات ============================== */

const CHANNEL_LABELS: Record<string, string> = {
  email: 'بريد إلكتروني',
  sms: 'رسالة نصية',
  push: 'إشعار',
  websocket: 'WebSocket',
};

const NOTIFICATION_TONE: Record<string, string> = {
  sent: C.success,
  failed: C.danger,
  pending: C.warning,
};

const NotificationsList = () => {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    getNotifications({ limit: 50 })
      .then((res) => {
        if (mounted) {
          const data = res.data.data;
          setItems(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      })
      .catch(() => { if (mounted) { setError(true); setLoading(false); } });
    return () => { mounted = false; };
  }, []);

  if (loading) return <StateBox type="loading" text="يتم تحميل الإشعارات…" />;
  if (error) return <StateBox type="error" text="تعذر تحميل الإشعارات" />;
  if (items.length === 0) return <EmptyState title="لا توجد إشعارات" description="لم تُسجَّل إشعارات موجّهة إليك بعد." />;

  return (
    <Stack spacing={1}>
      {items.map((n) => (
        <Box key={n.id} sx={{ p: 1.4, borderRadius: 2.5, border: `1px solid ${C.border}`, bgcolor: 'action.hover' }}>
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: NOTIFICATION_TONE[n.status] || C.primary, mt: 0.6, flexShrink: 0 }} />
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" justifyContent="space-between" gap={1}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{n.subject || CHANNEL_LABELS[n.channel] || n.channel}</Typography>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'text.secondary' }}>
                  {n.created_at ? formatRelativeTime(n.created_at) : ''}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>{n.body}</Typography>
              <Stack direction="row" spacing={0.75} sx={{ mt: 0.5 }}>
                <Chip size="small" variant="outlined" label={CHANNEL_LABELS[n.channel] || n.channel} />
                {!n.is_read && <Chip size="small" color="primary" label="غير مقروء" />}
              </Stack>
            </Box>
          </Stack>
        </Box>
      ))}
    </Stack>
  );
};

export const NotificationsAdmin = () => (
  <Box>
    <PageTitle title="مركز الإشعارات" subtitle="إعلانات وتنبيهات النظام للوحدات التشغيلية" />

    <Grid container spacing={3}>
      <Grid item xs={12} lg={7}>
        <SurfaceCard title="الإشعارات الأخيرة" subtitle="مرتبة حسب الأحدث">
          <NotificationsList />
        </SurfaceCard>
      </Grid>

      <Grid item xs={12} lg={5}>
        <Stack spacing={3}>
          <SurfaceCard title="قنوات الإبلاغ" subtitle="مستويات الإبلاغ النافذة">
            <Stack spacing={1}>
              {([
                ['المشرف المناوب — فوري', NotificationsActiveIcon, C.danger],
                ['غرفة العمليات — فوري', NotificationsActiveIcon, C.warning],
                ['مدير المحطة — موجز يومي', NotificationsActiveIcon, C.primary],
              ] as const).map(([l, I, c]) => {
                const Icon = I as React.ElementType;
                return (
                  <Stack key={l} direction="row" alignItems="center" spacing={1.25} sx={{ p: 1.2, borderRadius: 2.5, border: `1px solid ${C.border}`, bgcolor: 'action.hover' }}>
                    <Icon sx={{ color: c, fontSize: 18 }} />
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{l}</Typography>
                  </Stack>
                );
              })}
            </Stack>
          </SurfaceCard>
        </Stack>
      </Grid>
    </Grid>
  </Box>
);
