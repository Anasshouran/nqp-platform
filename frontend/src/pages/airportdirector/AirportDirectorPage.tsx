import { useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import AddIcon from '@mui/icons-material/Add';
import DashboardIcon from '@mui/icons-material/Dashboard';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import BiotechIcon from '@mui/icons-material/Biotech';
import GavelIcon from '@mui/icons-material/Gavel';
import TableChartIcon from '@mui/icons-material/TableChart';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import DashboardHero from '../../components/dashboard/DashboardHero';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';
import { SectionCard, PageTabs } from '../../components/uikit';
import { EmptyState } from '../../components/uikit';
import { useAuth } from '../../hooks/useAuth';
import { notifySuccess } from '../../utils/toast';

const todayArabic = () => new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

type Period = 'DAY' | 'WEEK' | 'MONTH';

const SECTIONS = [
  { id: 'overview', label: 'نظرة عامة', icon: <DashboardIcon fontSize="small" /> },
  { id: 'alerts', label: 'التنبيهات', icon: <WarningAmberIcon fontSize="small" /> },
  { id: 'operations', label: 'العمليات', icon: <HealthAndSafetyIcon fontSize="small" /> },
  { id: 'flights', label: 'الرحلات', icon: <VerifiedUserIcon fontSize="small" /> },
  { id: 'screening', label: 'الفحص', icon: <BiotechIcon fontSize="small" /> },
  { id: 'terminals', label: 'المواقع', icon: <TableChartIcon fontSize="small" /> },
  { id: 'decision', label: 'دعم القرار', icon: <GavelIcon fontSize="small" /> },
  { id: 'reports', label: 'التقارير', icon: <PictureAsPdfIcon fontSize="small" /> },
  { id: 'staff', label: 'الموظفون', icon: <VerifiedUserIcon fontSize="small" /> },
  { id: 'permissions', label: 'الصلاحيات', icon: <GavelIcon fontSize="small" /> },
] as const;

const AirportDirectorPage = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>('DAY');
  const { active, register, scrollTo } = useCommandSections(SECTIONS as unknown as CommandSectionDef[], []);

  return (
    <Box>
      {/* ===== ترحيب ===== */}
      <DashboardHero
        eyebrow="لوحة القيادة التنفيذية — صحة المطارات"
        title={`مرحباً، ${user?.full_name || 'مديرة الحجر الصحي بالمطار'} 👋`}
        subtitle="نظرة تنفيذية شاملة على صحة المطارات: الرحلات، فحص المسافرين، الشحن الجوي، المختبر، والإيرادات"
        gradient="emerald"
        avatarLabel={(user?.full_name || 'م').slice(0, 1)}
        action={
          <ToggleButtonGroup
            size="small"
            exclusive
            value={period}
            onChange={(_, v: Period) => v && setPeriod(v)}
            sx={{ '& .MuiToggleButton-root': { fontWeight: 700, borderRadius: 2, px: 1.5 } }}
          >
            <ToggleButton value="DAY">اليوم</ToggleButton>
            <ToggleButton value="WEEK">هذا الأسبوع</ToggleButton>
            <ToggleButton value="MONTH">هذا الشهر</ToggleButton>
          </ToggleButtonGroup>
        }
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
          {/* KPI */}
          <Grid container ref={register('overview')} data-section="overview" spacing={1.5} sx={{ mb: 3, scrollMarginTop: '80px' }}>
            <EmptyState title="قيد الإعداد" description="المؤشرات التشغيلية تُعرض عند ربط اللوحة بالنظام المصدر." />
          </Grid>

          {/* ===== التنبيهات ===== */}
          <Box ref={register('alerts')} data-section="alerts" sx={{ mb: 3, scrollMarginTop: '80px' }}>
            <SectionCard title="🚨 مركز التنبيهات" subtitle="أحداث تستدعي النظر الفوري — الرحلة، الطاقم، الشحن">
              <EmptyState title="قيد الإعداد" description="التنبيهات تُعرض عند توفر بيانات التنبيهات من النظام المصدر." />
            </SectionCard>
          </Box>

          {/* ===== مؤشر العمليات + المختبر ===== */}
          <Box ref={register('operations')} data-section="operations" sx={{ mb: 3, scrollMarginTop: '80px' }}>
            <SectionCard title="مؤشرات العمليات" subtitle="وصول / مغادرة / فحص / عينات / فسح — اتجاه عام لكل فترة">
              <EmptyState title="قيد الإعداد" description="مؤشرات العمليات تُعرض عند توفر بيانات النظام المصدر." />
            </SectionCard>
          </Box>

          {/* ===== لوحة الرحلات ===== */}
          <Box ref={register('flights')} data-section="flights" sx={{ mb: 3, scrollMarginTop: '80px' }}>
            <SectionCard title="✈️ لوحة الرحلات" subtitle="الواصلة والمغادرة قيد الفحص الصحي — الحالة الفورية">
              <EmptyState title="قيد الإعداد" description="بيانات الرحلات تُعرض عند توفر بيانات نظام العمليات الجوية." />
            </SectionCard>
          </Box>

          {/* ===== فحص المسافرين + بؤر ===== */}
          <Box ref={register('screening')} data-section="screening" sx={{ mb: 3, scrollMarginTop: '80px' }}>
            <SectionCard title="فحص المسافرين" subtitle="الفحص الصحي بالحرارة وفحوصات الدخول — ورصد الحالات">
              <EmptyState title="قيد الإعداد" description="بيانات فحص المسافرين تُعرض عند توفرها من النظام المصدر." />
            </SectionCard>
          </Box>

          {/* ===== أداء المواقع + الإيرادات ===== */}
          <Box ref={register('terminals')} data-section="terminals" sx={{ mb: 3, scrollMarginTop: '80px' }}>
            <SectionCard title="أداء مواقع المطار" subtitle="المباني والشحن — الإشغال والالتزام بمعايير الفحص">
              <EmptyState title="قيد الإعداد" description="أداء مواقع المطار يُعرض عند توفر بيانات النظام المصدر." />
            </SectionCard>
          </Box>

          {/* ===== دعم القرار ===== */}
          <Box ref={register('decision')} data-section="decision" sx={{ mb: 3, scrollMarginTop: '80px' }}>
            <SectionCard title="💡 دعم اتخاذ القرار" subtitle="النظام يوصي — والمديرة تقرر">
              <EmptyState title="قيد الإعداد" description="توصيات دعم القرار تُعرض عند توفر بيانات النظام المصدر." />
            </SectionCard>
          </Box>

          {/* ===== التقارير ===== */}
          <Box ref={register('reports')} data-section="reports" sx={{ mb: 3, scrollMarginTop: '80px' }}>
            <ReportsSection />
          </Box>

          {/* ===== الموظفون ===== */}
          <Box ref={register('staff')} data-section="staff" sx={{ mb: 3, scrollMarginTop: '80px' }}>
            <SectionCard
              title="موظفو المطار"
              subtitle="مفتشون، فنيو مختبر، كتّاب إدخال — إدارة المواقع"
              action={<Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => notifySuccess('فتح إضافة موظف')}>إضافة موظف</Button>}
            >
              <EmptyState title="قيد الإعداد" description="بيانات موظفي المطار تُعرض عند توفرها من النظام المصدر." />
            </SectionCard>
          </Box>

          {/* ===== الصلاحيات + النشاط ===== */}
          <Box ref={register('permissions')} data-section="permissions" sx={{ mb: 3, scrollMarginTop: '80px' }}>
            <Grid container spacing={3}>
              <Grid item xs={12} lg={6}>
                <SectionCard title="مصفوفة الصلاحيات" subtitle="متاح للمديرة / مستبعد تشغيليًا">
                  <EmptyState title="قيد الإعداد" description="مصفوفة الصلاحيات تُعرض عند توفر بيانات النظام المصدر." />
                </SectionCard>
              </Grid>
              <Grid item xs={12} lg={6}>
                <SectionCard title="📋 سجل الأنشطة" subtitle="آخر الإجراءات الإدارية" sx={{ height: '100%' }}>
                  <EmptyState title="قيد الإعداد" description="سجل الأنشطة الإدارية يُعرض عند توفر بيانات النظام المصدر." />
                </SectionCard>
              </Grid>
            </Grid>
          </Box>

          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center', mt: 4 }}>
            وزارة الصحة الاتحادية — منصة الحجر الصحي القومي · إدارة الحجر الصحي بالمطار
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
};

/* ============================= مكونات فرعية ============================= */

const ReportsSection = () => {
  const [tab, setTab] = useState(0);
  const tabs = [
    { label: '📅 يومي', panel: <div>التقرير اليومي</div> },
    { label: '📆 أسبوعي', panel: <div>التقرير الأسبوعي</div> },
    { label: '📊 شهري', panel: <div>التقرير الشهري</div> },
  ];
  return (
    <SectionCard
      title="مركز التقارير"
      subtitle="تقارير الرحلات والفحص والمعمل والإيرادات"
      action={
        <Stack direction="row" spacing={1}>
          <Button size="small" color="error" variant="contained" startIcon={<PictureAsPdfIcon />} onClick={() => notifySuccess('جارٍ تجهيز PDF')}>PDF</Button>
          <Button size="small" color="success" variant="contained" startIcon={<TableChartIcon />} onClick={() => notifySuccess('جارٍ تجهيز Excel')}>Excel</Button>
        </Stack>
      }
    >
      <PageTabs value={tab} onChange={setTab} tabs={tabs} keepMounted />
    </SectionCard>
  );
};

export default AirportDirectorPage;
