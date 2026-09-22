import { useState } from 'react';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import RefreshIcon from '@mui/icons-material/Refresh';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LinkIcon from '@mui/icons-material/Link';
import CodeIcon from '@mui/icons-material/Code';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { PageHeader } from '../../components/common';
import { DataTable, StatusChip, FormTextField, ConfirmDialog } from '../../components/ui';
import { useServerTable } from '../../hooks/useServerTable';
import {
  createDeveloperApp,
  createWebhook,
  deleteDeveloperApp,
  deleteWebhook,
  getDeveloperApps,
  getWebhooks,
  rotateDeveloperAppKey,
  updateDeveloperApp,
  updateWebhook,
} from '../../api/endpoints/integration';
import type { DeveloperApp, WebhookEndpoint } from '../../types/integration';
import { formatDateTime } from '../../utils/formatters';
import { notifySuccess, notifyError, notifyInfo } from '../../utils/toast';

const eventTypeOptions = [
  { value: 'FLIGHT_ARRIVAL', label: 'وصول رحلة' },
  { value: 'FLIGHT_DEPARTURE', label: 'مغادرة رحلة' },
  { value: 'MANIFEST_RECEIVED', label: 'استلام بيان ركاب' },
  { value: 'ALERT_RAISED', label: 'إشعار خطر صحي' },
  { value: 'REFERRAL_CREATED', label: 'إحالة جديدة' },
  { value: 'LAB_RESULT', label: 'نتيجة مختبر' },
];

const endpointDocs = [
  {
    method: 'POST',
    path: '/integration/flights/',
    title: 'إشعار رحلة جديدة',
    desc: 'إرسال بيانات رحلة قادمة أو مغادرة من نظام خطوط الطيران.',
  },
  {
    method: 'POST',
    path: '/integration/flights/manifest',
    title: 'بيان الركاب (Manifest)',
    desc: 'إرسال قائمة المسافرين لرحلة محددة للمعالجة المسبقة.',
  },
  {
    method: 'GET',
    path: '/integration/health-notices/',
    title: 'الإشعارات الصحية',
    desc: 'جلب الإشعارات الصحية النشطة للعرض في أنظمة الطرف الآخر.',
  },
  {
    method: 'POST',
    path: '/integration/immigration/verify/',
    title: 'التحقق من مسافر',
    desc: 'التحقق من بيانات المسافر عبر رقم الجواز (نظام الجوازات).',
  },
  {
    method: 'GET',
    path: '/integration/ihr/report/pheic/',
    title: 'أحداث الطوارئ الصحية',
    desc: 'جلب أحداث الطوارئ الصحية العامة النشطة (PHEIC).',
  },
  {
    method: 'POST',
    path: '/integration/customs/certificate/',
    title: 'شهادة الحجر الصحي',
    desc: 'إرسال الشهادات الصحية إلى الجمارك للمراجعة.',
  },
  {
    method: 'POST',
    path: '/integration/labs/request/',
    title: 'طلب فحص مختبري',
    desc: 'إرسال طلب فحص عينة إلى المختبر المرجعي.',
  },
  {
    method: 'POST',
    path: '/integration/surveillance/aggregated/',
    title: 'بيانات الترصد',
    desc: 'إرسال بيانات الترصد المجمعة من أنظمة الجهات الصحية.',
  },
  {
    method: 'POST',
    path: '/integration/hospitals/referral/',
    title: 'تحويل حالة للمستشفى',
    desc: 'إرسال إحالة حالة مشتبهة إلى مستشفى الإحالة.',
  },
];

const methodTone = (method: string) => {
  if (method === 'GET') return 'success';
  if (method === 'POST') return 'primary';
  if (method === 'PUT' || method === 'PATCH') return 'warning';
  return 'error';
};

const AppFormDialog = ({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial?: DeveloperApp | null;
  onClose: () => void;
  onSaved: (data: DeveloperApp) => void;
}) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      notifyError('اسم التطبيق مطلوب');
      return;
    }
    setSaving(true);
    try {
      const data = initial
        ? (await updateDeveloperApp(initial.id, { name, description, is_active: isActive })).data.data
        : (await createDeveloperApp({ name, description, is_active: isActive })).data.data;
      notifySuccess(initial ? 'تم تحديث التطبيق' : 'تم إنشاء التطبيق');
      onSaved(data);
    } catch {
      notifyError('تعذر حفظ التطبيق');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{initial ? 'تعديل تطبيق' : 'تسجيل تطبيق جديد'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <FormTextField label="اسم التطبيق" requiredMark value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: نظام شركة الطيران" />
          <FormTextField
            label="الوصف"
            multiline
            minRows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="وصف مختصر للتطبيق والغرض من التكامل"
          />
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
              الحالة
            </Typography>
            <Stack direction="row" spacing={1}>
              <Chip
                label="نشط"
                color={isActive ? 'success' : 'default'}
                variant={isActive ? 'filled' : 'outlined'}
                onClick={() => setIsActive(true)}
              />
              <Chip
                label="معطل"
                color={!isActive ? 'default' : 'default'}
                variant={!isActive ? 'filled' : 'outlined'}
                onClick={() => setIsActive(false)}
              />
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          إلغاء
        </Button>
        <Button onClick={submit} variant="contained" disabled={saving}>
          {saving ? 'جارٍ الحفظ...' : initial ? 'حفظ التعديلات' : 'إنشاء'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const WebhookFormDialog = ({
  open,
  initial,
  apps,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial?: WebhookEndpoint | null;
  apps: DeveloperApp[];
  onClose: () => void;
  onSaved: (data: WebhookEndpoint) => void;
}) => {
  const [app, setApp] = useState(initial?.app ?? apps[0]?.id ?? '');
  const [eventType, setEventType] = useState(initial?.event_type ?? eventTypeOptions[0]?.value ?? '');
  const [endpointUrl, setEndpointUrl] = useState(initial?.endpoint_url ?? '');
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!app || !endpointUrl.trim()) {
      notifyError('التطبيق ورابط النقطة مطلوبان');
      return;
    }
    setSaving(true);
    try {
      const data = initial
        ? (await updateWebhook(initial.id, { app, event_type: eventType, endpoint_url: endpointUrl, is_active: isActive })).data.data
        : (await createWebhook({ app, event_type: eventType, endpoint_url: endpointUrl, is_active: isActive })).data.data;
      notifySuccess(initial ? 'تم تحديث نقطة الويب هوك' : 'تم تسجيل نقطة الويب هوك');
      onSaved(data);
    } catch {
      notifyError('تعذر حفظ نقطة الويب هوك');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{initial ? 'تعديل نقطة ويب هوك' : 'تسجيل نقطة ويب هوك'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
              التطبيق *
            </Typography>
            <select
              value={app}
              onChange={(e) => setApp(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.23)', background: '#fff', fontFamily: 'inherit', fontSize: 14 }}
            >
              {apps.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Box>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
              نوع الحدث *
            </Typography>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.23)', background: '#fff', fontFamily: 'inherit', fontSize: 14 }}
            >
              {eventTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Box>
          <FormTextField
            label="رابط النقطة"
            requiredMark
            dir="ltr"
            value={endpointUrl}
            onChange={(e) => setEndpointUrl(e.target.value)}
            placeholder="https://partner.example.com/webhook"
          />
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
              الحالة
            </Typography>
            <Stack direction="row" spacing={1}>
              <Chip label="نشط" color={isActive ? 'success' : 'default'} variant={isActive ? 'filled' : 'outlined'} onClick={() => setIsActive(true)} />
              <Chip label="معطل" variant={!isActive ? 'filled' : 'outlined'} onClick={() => setIsActive(false)} />
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          إلغاء
        </Button>
        <Button onClick={submit} variant="contained" disabled={saving}>
          {saving ? 'جارٍ الحفظ...' : initial ? 'حفظ التعديلات' : 'تسجيل'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const AppsTab = () => {
  const table = useServerTable<DeveloperApp>({ fetchData: getDeveloperApps });
  const { rows, count, loading, error, searchInput, setSearchInput, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions } = table;
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DeveloperApp | null>(null);
  const [deleting, setDeleting] = useState<DeveloperApp | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});

  const copyKey = (key: string) => {
    navigator.clipboard?.writeText(key);
    notifyInfo('تم نسخ المفتاح');
  };

  const handleRotate = async (app: DeveloperApp) => {
    try {
      await rotateDeveloperAppKey(app.id);
      notifySuccess('تم تدوير المفتاح');
      refresh();
    } catch {
      notifyError('تعذر تدوير المفتاح');
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteDeveloperApp(deleting.id);
      notifySuccess('تم حذف التطبيق');
      setDeleting(null);
      refresh();
    } catch {
      notifyError('تعذر حذف التطبيق');
    }
  };

  return (
    <>
      <DataTable<DeveloperApp>
        columns={[
          { key: 'name', label: 'التطبيق', sortable: true, render: (a) => <Typography sx={{ fontWeight: 700 }}>{a.name}</Typography> },
          {
            key: 'api_key',
            label: 'مفتاح API',
            render: (a) => {
              const visible = visibleKeys[a.id];
              const full = a.api_key;
              const masked = full.slice(0, 8) + '••••••••';
              return (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Typography sx={{ fontFamily: 'monospace', fontSize: 13, direction: 'ltr' }}>{visible ? full : masked}</Typography>
                  <IconButton aria-label="عرض" size="small" onClick={() => setVisibleKeys((prev) => ({ ...prev, [a.id]: !visible }))}>
                    {visible ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  </IconButton>
                  <IconButton aria-label="نسخ" size="small" onClick={() => copyKey(full)}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Stack>
              );
            },
          },
          { key: 'is_active', label: 'الحالة', render: (a) => (a.is_active ? <StatusChip label="نشط" tone="success" /> : <StatusChip label="معطل" tone="neutral" />) },
          { key: 'created_at', label: 'تاريخ الإنشاء', sortable: true, render: (a) => formatDateTime(a.created_at), hideOnMobile: true },
        ]}
        rows={rows}
        rowKey={(a) => a.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title="تطبيقات المطورين"
        subtitle={`${count} تطبيق مسجل`}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="بحث باسم التطبيق..."
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        emptyTitle="لا توجد تطبيقات مسجلة"
        emptyDescription="سجل تطبيقك الأول للحصول على مفتاح API"
        actions={(a) => (
          <Stack direction="row" spacing={0.5}>
            <IconButton aria-label="تحديث" size="small" title="تدوير المفتاح" onClick={() => handleRotate(a)}>
              <RefreshIcon fontSize="small" color="primary" />
            </IconButton>
            <IconButton aria-label="تعديل" size="small" title="تعديل" onClick={() => { setEditing(a); setFormOpen(true); }}>
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton aria-label="حذف" size="small" title="حذف" onClick={() => setDeleting(a)}>
              <DeleteIcon fontSize="small" color="error" />
            </IconButton>
          </Stack>
        )}
        toolbar={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setFormOpen(true); }}>
            تطبيق جديد
          </Button>
        }
      />
      <AppFormDialog
        open={formOpen}
        initial={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          refresh();
        }}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        title="حذف تطبيق"
        message={`هل أنت متأكد من حذف التطبيق "${deleting?.name}"؟ سيتم إبطال مفتاحه فوراً.`}
        confirmLabel="حذف"
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </>
  );
};

const WebhooksTab = ({ apps }: { apps: DeveloperApp[] }) => {
  const table = useServerTable<WebhookEndpoint>({ fetchData: getWebhooks });
  const { rows, count, loading, error, searchInput, setSearchInput, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions } = table;
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<WebhookEndpoint | null>(null);
  const [deleting, setDeleting] = useState<WebhookEndpoint | null>(null);

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteWebhook(deleting.id);
      notifySuccess('تم حذف نقطة الويب هوك');
      setDeleting(null);
      refresh();
    } catch {
      notifyError('تعذر حذف نقطة الويب هوك');
    }
  };

  return (
    <>
      <DataTable<WebhookEndpoint>
        columns={[
          {
            key: 'app',
            label: 'التطبيق',
            sortable: true,
            render: (w) => {
              const match = apps.find((a) => a.id === w.app);
              return <Typography sx={{ fontWeight: 700 }}>{match?.name ?? w.app.slice(0, 8)}</Typography>;
            },
          },
          { key: 'event_type', label: 'الحدث', render: (w) => <StatusChip label={w.event_type} tone="primary" variant="outlined" /> },
          {
            key: 'endpoint_url',
            label: 'رابط النقطة',
            render: (w) => (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <LinkIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                <Typography sx={{ fontFamily: 'monospace', fontSize: 13, direction: 'ltr' }}>{w.endpoint_url}</Typography>
              </Stack>
            ),
          },
          { key: 'is_active', label: 'الحالة', render: (w) => (w.is_active ? <StatusChip label="نشط" tone="success" /> : <StatusChip label="معطل" tone="neutral" />) },
        ]}
        rows={rows}
        rowKey={(w) => w.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title="نقاط الويب هوك"
        subtitle={`${count} نقطة مسجلة`}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="بحث بالحدث أو الرابط..."
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        emptyTitle="لا توجد نقاط ويب هوك"
        emptyDescription="سجل نقطة استقبال لأحداث المنصة"
        actions={(w) => (
          <Stack direction="row" spacing={0.5}>
            <IconButton aria-label="تعديل" size="small" title="تعديل" onClick={() => { setEditing(w); setFormOpen(true); }}>
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton aria-label="حذف" size="small" title="حذف" onClick={() => setDeleting(w)}>
              <DeleteIcon fontSize="small" color="error" />
            </IconButton>
          </Stack>
        )}
        toolbar={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setFormOpen(true); }} disabled={apps.length === 0}>
            نقطة جديدة
          </Button>
        }
      />
      <WebhookFormDialog
        open={formOpen}
        initial={editing}
        apps={apps}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          refresh();
        }}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        title="حذف نقطة ويب هوك"
        message="هل أنت متأكد من حذف نقطة الويب هوك هذه؟"
        confirmLabel="حذف"
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </>
  );
};

const DocsTab = () => (
  <Box>
    <Card sx={{ mb: 3, border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: 3,
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'primary.light',
              color: 'primary.main',
            }}
          >
            <VpnKeyIcon />
          </Box>
          <Box sx={{ flex: 1, minWidth: 220 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              المصادقة
            </Typography>
            <Typography variant="body2" color="text.secondary">
              أرسل مفتاح API الخاص بالتطبيق في ترويسة الطلب لتوثيق الوصول إلى نقاط التكامل.
            </Typography>
          </Box>
          <Box
            sx={{
              px: 2,
              py: 1,
              borderRadius: 2,
              bgcolor: '#f4f6f8',
              fontFamily: 'monospace',
              fontSize: 13,
              direction: 'ltr',
              border: '1px dashed',
              borderColor: 'divider',
            }}
          >
            Authorization: Bearer nqp_••••••••••••
          </Box>
        </Stack>
      </CardContent>
    </Card>

    <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
          <Box sx={{ color: 'primary.main', display: 'grid', placeItems: 'center' }}>
            <CodeIcon />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            نقاط التكامل المتاحة
          </Typography>
        </Stack>
        <Grid container spacing={2}>
          {endpointDocs.map((doc) => (
            <Grid item xs={12} md={6} key={doc.path}>
              <Box
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  p: 2,
                  height: '100%',
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
                  <Chip label={doc.method} size="small" color={methodTone(doc.method) as 'success' | 'primary' | 'error'} sx={{ fontFamily: 'monospace', minWidth: 60 }} />
                  <Typography sx={{ fontFamily: 'monospace', fontSize: 13, direction: 'ltr', fontWeight: 700 }}>{doc.path}</Typography>
                </Stack>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {doc.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                  {doc.desc}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
        <Button
          variant="outlined"
          component="a"
          href="/api/docs/"
          target="_blank"
          rel="noreferrer"
          startIcon={<CodeIcon />}
          sx={{ mt: 3 }}
        >
          فتح التوثيق الكامل (Swagger)
        </Button>
      </CardContent>
    </Card>
  </Box>
);

const DeveloperPortalPage = () => {
  const [tab, setTab] = useState(0);
  const [apps, setApps] = useState<DeveloperApp[]>([]);

  const loadApps = () => {
    getDeveloperApps({ page_size: 100 })
      .then((res) => setApps(res.data.data.results))
      .catch(() => setApps([]));
  };

  const handleTabChange = (_: unknown, value: number) => {
    setTab(value);
    if (value === 1) loadApps();
  };

  return (
    <Box>
      <PageHeader
        title="بوابة المطورين"
        subtitle="سجّل تطبيقك، واحصل على مفتاح API، وأدر نقاط الويب هوك والتوثيق"
        eyebrow="التكاملات"
      />
      <Tabs value={tab} onChange={handleTabChange} sx={{ mb: 3, '& .MuiTab-root': { borderRadius: 2 } }}>
        <Tab icon={<CodeIcon />} iconPosition="start" label="التوثيق" />
        <Tab icon={<VpnKeyIcon />} iconPosition="start" label="التطبيقات والمفاتيح" />
        <Tab icon={<LinkIcon />} iconPosition="start" label="الويب هوك" />
      </Tabs>
      {tab === 0 && <DocsTab />}
      {tab === 1 && <AppsTab />}
      {tab === 2 && <WebhooksTab apps={apps} />}
    </Box>
  );
};

export default DeveloperPortalPage;
