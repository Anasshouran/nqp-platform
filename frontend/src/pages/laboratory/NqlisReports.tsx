import { useEffect, useMemo, useState } from 'react';
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
import { useTranslation } from 'react-i18next';
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

const SECTIONS_DEF = [
  { id: 'overview', labelKey: 'overview' },
  { id: 'sections', labelKey: 'sections' },
  { id: 'diseases', labelKey: 'diseases' },
  { id: 'sources', labelKey: 'sources' },
] as const;

const sectionIcons = {
  overview: <AssessmentIcon fontSize="small" />,
  sections: <BiotechIcon fontSize="small" />,
  diseases: <ScienceIcon fontSize="small" />,
  sources: <SourceIcon fontSize="small" />,
};

const NqlisReports = () => {
  const { t } = useTranslation();
  const { sector } = useLabScope();
  const [data, setData] = useState<LabReport | null>(null);
  const [loading, setLoading] = useState(true);

  const sections = useMemo(
    () =>
      SECTIONS_DEF.map((s) => ({
        id: s.id,
        label: t(`laboratory.nqlisReports.section.${s.labelKey}`),
        icon: sectionIcons[s.id],
      })),
    [t],
  );

  const { active, register, scrollTo } = useCommandSections(sections as unknown as CommandSectionDef[], [loading]);

  useEffect(() => {
    let mounted = true;
    getLabReports({ sector: sector ?? undefined })
      .then((res) => {
        if (mounted) setData(res.data.data);
      })
      .catch(() => {
        if (mounted) notifyError(t('laboratory.nqlisReports.loadError'));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [sector, t]);

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
        title={t('laboratory.nqlisReports.pageTitle')}
        subtitle={t('laboratory.nqlisReports.pageSubtitle')}
        gradient="emerald"
        avatarLabel="ا"
        chips={[
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>{todayArabic()}</Box>,
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#8ff5d4', flexShrink: 0 }} />
            {t('laboratory.nqlisReports.liveStatus')}
          </Box>,
        ]}
      />
      <Grid container spacing={0} sx={{ mt: 3 }} columnSpacing={3}>
        <Grid item xs={12} md={2.2} lg={1.8}>
          <CommandSectionRail
            sections={sections as unknown as CommandSectionDef[]}
            active={active}
            onNavigate={scrollTo}
            accent="primary.main"
            label={t('laboratory.nqlisReports.railLabel')}
          />
        </Grid>
        <Grid item xs={12} md={9.8} lg={10.2}>
      <Box component="section" ref={register('overview')} data-section="overview" sx={{ scrollMarginTop: '80px' }}>
        <Grid container spacing={1.5} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard icon={<AssessmentIcon />} value={s.samples} label={t('laboratory.nqlisReports.kpiSamples')} accent="primary.main" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard icon={<AssessmentIcon />} value={s.tests} label={t('laboratory.nqlisReports.kpiTests')} accent="info.main" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard icon={<AssessmentIcon />} value={`${s.positivity_rate}%`} label={t('laboratory.nqlisReports.kpiPositivityRate')} accent="warning.main" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard icon={<AssessmentIcon />} value={s.avg_tat_hours} label={t('laboratory.nqlisReports.kpiAvgTAT')} accent="success.main" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard icon={<AssessmentIcon />} value={s.positive} label={t('laboratory.nqlisReports.kpiPositive')} accent="error.main" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard icon={<AssessmentIcon />} value={s.critical} label={t('laboratory.nqlisReports.kpiCritical')} accent="error.main" />
          </Grid>
        </Grid>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Box component="section" ref={register('sections')} data-section="sections" sx={{ scrollMarginTop: '80px' }}>
          <SectionCard
            title={t('laboratory.nqlisReports.sectionCardSections')}
            action={
              <ExportButton
                filename="nqlis-section-report.csv"
                headers={[
                  t('laboratory.nqlisReports.headerCode'),
                  t('laboratory.nqlisReports.headerSection'),
                  t('laboratory.nqlisReports.headerTests'),
                  t('laboratory.nqlisReports.headerCompleted'),
                  t('laboratory.nqlisReports.headerPositive'),
                  t('laboratory.nqlisReports.headerNonCompliant'),
                  t('laboratory.nqlisReports.headerCritical'),
                ]}
                rows={exportSections()}
              />
            }
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              {data.by_section.length === 0 && <Typography color="text.secondary">{t('laboratory.nqlisReports.noData')}</Typography>}
              {data.by_section.map((row) => (
                <Box key={row.section} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                  <Chip size="small" label={row.code} variant="outlined" />
                  <Typography fontWeight={600} sx={{ flex: 1 }}>{row.name}</Typography>
                  <Typography variant="body2">{t('laboratory.nqlisReports.totalTests', { count: row.total })}</Typography>
                  <StatusChip label={t('laboratory.nqlisReports.positiveCount', { count: row.positive })} tone={row.positive > 0 ? 'error' : 'success'} />
                </Box>
              ))}
            </Box>
          </SectionCard>
          </Box>
        </Grid>

        <Grid item xs={12} md={6}>
          <Box component="section" ref={register('diseases')} data-section="diseases" sx={{ scrollMarginTop: '80px' }}>
          <SectionCard title={t('laboratory.nqlisReports.sectionCardDiseases')}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              {data.by_disease.length === 0 && <Typography color="text.secondary">{t('laboratory.nqlisReports.noDiseaseResults')}</Typography>}
              {data.by_disease.map((row) => (
                <Box key={row.disease} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography fontWeight={600}>{row.name || t('laboratory.nqlisReports.notSpecified')}</Typography>
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
          <SectionCard title={t('laboratory.nqlisReports.sectionCardSources')}>
            {data.by_source.filter((x) => x.count > 0).length === 0 ? (
              <Typography color="text.secondary">{t('laboratory.nqlisReports.noData')}</Typography>
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
