import { useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import DashboardIcon from '@mui/icons-material/Dashboard';
import TableChartIcon from '@mui/icons-material/TableChart';
import DescriptionIcon from '@mui/icons-material/Description';
import SettingsIcon from '@mui/icons-material/Settings';
import SendIcon from '@mui/icons-material/Send';
import PaletteIcon from '@mui/icons-material/Palette';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { PageHeader, StatCard, SectionCard, DataTable, StatusChip, PageTabs, FormTextField, FormSelect, FormDialog, ConfirmDialog, ExportButton } from '../../components/uikit';
import type { StatusTone } from '../../components/uikit';

interface DemoRow {
  id: string;
  name: string;
  code: string;
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  count: number;
}

const demoRows: DemoRow[] = [
  { id: '1', name: 'ميناء بورتسودان', code: 'PSD-001', status: 'ACTIVE', count: 342 },
  { id: '2', name: 'مطار الخرطوم الدولي', code: 'KRT-001', status: 'ACTIVE', count: 128 },
  { id: '3', name: 'معبر القلابات', code: 'GAL-001', status: 'PENDING', count: 0 },
  { id: '4', name: 'معبر عرقي', code: 'ARG-001', status: 'SUSPENDED', count: 12 },
];

const statusMap: Record<DemoRow['status'], { label: string; tone: StatusTone }> = {
  ACTIVE: { label: 'نشط', tone: 'success' },
  PENDING: { label: 'قيد المراجعة', tone: 'warning' },
  SUSPENDED: { label: 'موقوف', tone: 'error' },
};

const tones: { label: string; tone: StatusTone }[] = [
  { label: 'نجاح', tone: 'success' },
  { label: 'تحذير', tone: 'warning' },
  { label: 'خطأ', tone: 'error' },
  { label: 'معلومة', tone: 'info' },
  { label: 'أساسي', tone: 'primary' },
  { label: 'محايد', tone: 'neutral' },
];

const UiKitPage = () => {
  const [tab, setTab] = useState(0);
  const [formName, setFormName] = useState('');
  const [formBench, setFormBench] = useState('');
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setFormDialogOpen(false);
    }, 900);
  };

  const tabs = [
    {
      label: 'لوحة معلومات',
      icon: <DashboardIcon />,
      panel: (
        <Grid container spacing={2.5}>
          {[
            { icon: <CheckCircleIcon />, value: 128, label: 'عمليات مكتملة', accent: 'success.main' },
            { icon: <TableChartIcon />, value: 34, label: 'قيد التنفيذ', accent: 'warning.main' },
            { icon: <DescriptionIcon />, value: 96, label: 'تقرير', accent: 'primary.main' },
            { icon: <SettingsIcon />, value: 4, label: 'أنظمة متصلة', accent: 'info.main' },
          ].map((s) => (
            <Grid item xs={12} sm={6} md={3} key={s.label}>
              <StatCard icon={s.icon} value={s.value} label={s.label} accent={s.accent} />
            </Grid>
          ))}
        </Grid>
      ),
    },
    {
      label: 'جدول البيانات',
      icon: <TableChartIcon />,
      panel: (
        <DataTable<DemoRow>
          columns={[
            { key: 'code', label: 'الكود', render: (r) => <Chip label={r.code} size="small" color="primary" variant="outlined" /> },
            { key: 'name', label: 'الاسم' },
            { key: 'status', label: 'الحالة', render: (r) => <StatusChip label={statusMap[r.status].label} tone={statusMap[r.status].tone} /> },
            { key: 'count', label: 'العدد', align: 'center' },
          ]}
          rows={demoRows}
          rowKey={(r) => r.id}
          count={demoRows.length}
          page={1}
          rowsPerPage={10}
          title="عرض تفاعلي"
          subtitle={`${demoRows.length} سجلات`}
          emptyTitle="لا توجد بيانات"
          emptyDescription="لم يتم العثور على سجلات"
        />
      ),
    },
    {
      label: 'النماذج',
      icon: <DescriptionIcon />,
      panel: (
        <Stack spacing={2.5} sx={{ maxWidth: 560 }}>
          <FormTextField
            label="اسم الجهة"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="مثال: ميناء بورتسودان"
            requiredMark
            hint="الاسم كما يظهر في النظام"
          />
          <FormSelect
            label="النوع"
            value={formBench}
            onChange={setFormBench}
            placeholder="اختر نوع الجهة"
            options={[
              { value: 'PORT', label: 'ميناء' },
              { value: 'AIRPORT', label: 'مطار' },
              { value: 'BORDER', label: 'معبر بري' },
            ]}
            requiredMark
          />
          <Stack direction="row" spacing={1.5}>
            <Button variant="contained" startIcon={<SendIcon />} onClick={() => setFormDialogOpen(true)}>
              فتح نموذج حوار
            </Button>
            <ExportButton filename="ui-kit-demo" headers={['الاسم', 'الكود']} rows={demoRows.map((r) => [r.name, r.code])} />
          </Stack>
        </Stack>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        eyebrow="Design System"
        title="مكونات واجهة المستخدم"
        subtitle="مجموعة موحّدة من المكونات القابلة لإعادة الاستخدام بُنيت حول RTL ونظام التصميم الخاص بالمنصة — تُصدَّر من components/uikit."
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setFormDialogOpen(true)}
          >
            تجربة نموذج
          </Button>
        }
      />

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<PaletteIcon />} value={19} label="مكوّناً قابلاً لإعادة الاستخدام" accent="primary.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<DashboardIcon />} value="RTL" label="دعم كامل للاتجاه العربي" accent="info.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<TableChartIcon />} value="∞" label="مصفوفة جداول معمّمة" accent="warning.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<DescriptionIcon />} value="+3" label="حوارات نماذج جاهزة" accent="success.main" />
        </Grid>
      </Grid>

      <SectionCard title="شارات الحالة" subtitle="جميع النغمات المدعومة في StatusChip" sx={{ mb: 3 }}>
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          {tones.map((t) => (
            <StatusChip key={t.tone} label={t.label} tone={t.tone} />
          ))}
          <StatusChip label="بلا رمز" tone="success" showIcon={false} />
        </Stack>
      </SectionCard>

      <SectionCard title="تبويبات الصفحات + اللوحات الحية" subtitle="PageTabs مع لوحة معلومات وجدول ونماذج" sx={{ mb: 3 }}>
        <PageTabs tabs={tabs} value={tab} onChange={setTab} />
      </SectionCard>

      <SectionCard title="الشبكة المتجاوبة" subtitle="Grid تلقائي التكيف عبر xs/sm/md" sx={{ mb: 3 }}>
        <Grid container spacing={2.5}>
          {['xs: شاشة جوال', 'sm: جهاز لوحي', 'md: سطح مكتب', 'xl: شاشات عريضة'].map((label) => (
            <Grid item xs={12} sm={6} md={4} xl={3} key={label}>
              <Box
                sx={{
                  p: 3,
                  borderRadius: 3,
                  textAlign: 'center',
                  bgcolor: 'primary.lighter',
                  border: '1px solid rgba(12,127,106,0.18)',
                  fontWeight: 700,
                  color: 'primary.darker',
                }}
              >
                {label}
              </Box>
            </Grid>
          ))}
        </Grid>
      </SectionCard>

      <SectionCard title="حوارات جاهزة" subtitle="FormDialog للنماذج، وConfirmDialog للتأكيد">
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" onClick={() => setConfirmOpen(true)}>
            فتح حوار التأكيد
          </Button>
          <Button variant="text" onClick={() => setFormDialogOpen(true)}>
            فتح حوار النموذج
          </Button>
        </Stack>
      </SectionCard>

      <FormDialog
        open={formDialogOpen}
        title="إضافة جهة جديدة"
        subtitle="مثال على حوار النموذج الموحّد"
        icon={<AddIcon />}
        onSubmit={handleSubmit}
        loading={submitting}
        submitDisabled={!formName || !formBench}
        onClose={() => !submitting && setFormDialogOpen(false)}
      >
        <FormTextField
          label="اسم الجهة"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          placeholder="مثال: ميناء بورتسودان"
          requiredMark
        />
        <FormSelect
          label="النوع"
          value={formBench}
          onChange={setFormBench}
          placeholder="اختر نوع الجهة"
          options={[
            { value: 'PORT', label: 'ميناء' },
            { value: 'AIRPORT', label: 'مطار' },
            { value: 'BORDER', label: 'معبر بري' },
          ]}
          requiredMark
        />
      </FormDialog>

      <ConfirmDialog
        open={confirmOpen}
        title="تأكيد العملية"
        message="هذا مثال توضيحي لحوار التأكيد الموحّد. هل تريد المتابعة؟"
        confirmLabel="نعم، متابعة"
        onConfirm={() => setConfirmOpen(false)}
        onClose={() => setConfirmOpen(false)}
      />
    </Box>
  );
};

export default UiKitPage;
