import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import AssessmentIcon from '@mui/icons-material/Assessment';
import BiotechIcon from '@mui/icons-material/Biotech';
import ScienceIcon from '@mui/icons-material/Science';
import SourceIcon from '@mui/icons-material/Source';
import {
  SectionCard,
  StatusChip,
  ExportButton,
} from '../../components/uikit';
import KpiCard from '../../components/dashboard/KpiCard';
import DashboardHero from '../../components/dashboard/DashboardHero';
import { getLabReports } from '../../api/endpoints/laboratory';
import { useLabScope } from '../../hooks/useLabSectors';
import type { LabReport } from '../../types/laboratory';
import { notifyError } from '../../utils/toast';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';

const todayArabic = () => new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const SECTIONS = [
  { id: 'overview', label: 'نظرة عامة', icon: <AssessmentIcon fontSize="small" /> },
  { id: 'sections', label: 'الأداء حسب القسم', icon: <BiotechIcon fontSize="small" /> },
  { id: 'diseases', label: 'النتائج حسب المرض', icon: <ScienceIcon fontSize="small" /> },
  { id: 'sources', label: 'العينات حسب المصدر', icon: <SourceIcon fontSize="small" /> },
] as const;

const NqlisReports = () => {
  const { sector } = useLabScope();
  const [data, setData] = useState<LabReport | null>(null);
  const [loading, setLoading] = useState(true);

  const { active, register, scrollTo } = useCommandSections(SECTIONS as unknown as CommandSectionDef[], [loading]);

  useEffect(() => {
    let mounted = true;
    getLabReports({ sector: sector ?? undefined })
      .then((res) => {
        if (mounted) setData(res.data.data);
      })
      .catch(() => {
        if (mounted) notifyError('تعذر تحميل التقارير');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [sector]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!data) return null;
  const s = data.summary;

  const exportSections = () => {
    return data.by_section.map((row) => [row.code, row.name, String(row.total), String(row.completed), String(row.positive), String(row.non_compliant), String(row.critical)]);
  };

  return (
    <Box>
      <DashboardHero
        eyebrow="NQLIS"
        title="التقارير"
        subtitle="تقارير الأداء والإنجاز لمختبرات NQLIS"
        gradient="emerald"
        avatarLabel="ا"
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
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard icon={<AssessmentIcon />} value={s.samples} label="إجمالي العينات" accent="primary.main" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard icon={<AssessmentIcon />} value={s.tests} label="إجمالي الفحوصات" accent="info.main" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard icon={<AssessmentIcon />} value={`${s.positivity_rate}%`} label="نسبة الإيجابية" accent="warning.main" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard icon={<AssessmentIcon />} value={s.avg_tat_hours} label="متوسط زمن الإنجاز (ساعة)" accent="success.main" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard icon={<AssessmentIcon />} value={s.positive} label="نتائج إيجابية" accent="error.main" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard icon={<AssessmentIcon />} value={s.critical} label="نتائج حرجة" accent="error.main" />
          </Grid>
        </Grid>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Box component="section" ref={register('sections')} data-section="sections" sx={{ scrollMarginTop: '80px' }}>
          <SectionCard
            title="الأداء حسب القسم"
            action={
              <ExportButton
                filename="nqlis-section-report.csv"
                headers={['الكود', 'القسم', 'الفحوصات', 'مكتملة', 'إيجابية', 'غير مطابقة', 'حرجة']}
                rows={exportSections()}
              />
            }
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              {data.by_section.length === 0 && <Typography color="text.secondary">لا توجد بيانات</Typography>}
              {data.by_section.map((row) => (
                <Box key={row.section} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                  <Chip size="small" label={row.code} variant="outlined" />
                  <Typography fontWeight={600} sx={{ flex: 1 }}>{row.name}</Typography>
                  <Typography variant="body2">{row.total} فحص</Typography>
                  <StatusChip label={`${row.positive} إيجابي`} tone={row.positive > 0 ? 'error' : 'success'} />
                </Box>
              ))}
            </Box>
          </SectionCard>
          </Box>
        </Grid>

        <Grid item xs={12} md={6}>
          <Box component="section" ref={register('diseases')} data-section="diseases" sx={{ scrollMarginTop: '80px' }}>
          <SectionCard title="النتائج حسب المرض">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              {data.by_disease.length === 0 && <Typography color="text.secondary">لا توجد نتائج محسومة</Typography>}
              {data.by_disease.map((row) => (
                <Box key={row.disease} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography fontWeight={600}>{row.name || 'غير محدد'}</Typography>
                  <Stack direction="row" spacing={1}>
                    <Chip size="small" label={row.total} color="default" variant="outlined" />
                    <Chip size="small" label={`${row.positive} +`} color={row.positive > 0 ? 'error' : 'success'} variant="outlined" />
                  </Stack>
                </Box>
              ))}
            </Box>
          </SectionCard>
          </Box>
        </Grid>

        <Grid item xs={12} md={6}>
          <Box component="section" ref={register('sources')} data-section="sources" sx={{ scrollMarginTop: '80px' }}>
          <SectionCard title="العينات حسب المصدر">
            {data.by_source.filter((x) => x.count > 0).length === 0 ? (
              <Typography color="text.secondary">لا توجد بيانات</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {data.by_source.map((row) => (
                  <Box key={row.source} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography>{row.name}</Typography>
                    <Chip size="small" label={row.count} color="primary" variant="outlined" />
                  </Box>
                ))}
              </Box>
            )}
          </SectionCard>
          </Box>
        </Grid>
      </Grid>
      </Grid>
      </Grid>
    </Box>
  );
};

export default NqlisReports;