import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import { DataTable, StatusChip } from '../../components/ui';
import DashboardHero from '../../components/dashboard/DashboardHero';
import KpiCard from '../../components/dashboard/KpiCard';
import { useAuth } from '../../hooks/useAuth';
import { useServerTable } from '../../hooks/useServerTable';
import { useTableExport } from '../../hooks/useTableExport';
import { getInspections, getShipments } from '../../api/endpoints/food';
import type { FoodInspection, FoodShipment } from '../../types/food';
import { formatDate } from '../../utils/formatters';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import VerifiedIcon from '@mui/icons-material/Verified';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';
import { useTranslation } from 'react-i18next';

const todayArabic = () =>
  new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const chipSx = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.75,
  px: 1,
  py: 0.4,
  borderRadius: 1.5,
  bgcolor: 'primary.light',
  color: 'primary.dark',
  fontFamily: 'monospace',
  fontWeight: 700,
  fontSize: 12,
} as const;

const SECTIONS = [
  { id: 'overview', labelKey: 'overview', icon: <Inventory2Icon fontSize="small" /> },
  { id: 'inspections', labelKey: 'inspections', icon: <FactCheckIcon fontSize="small" /> },
] as const;

const QuarantineInspectorPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const table = useServerTable<FoodInspection>({ fetchData: getInspections });
  const { rows, count, loading, error, searchInput, setSearchInput, sortBy, sortOrder, setSorting, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, setFilter } = table;

  const { exporting, exportAll } = useTableExport(table.fetchAllRows);

  const { active, register, scrollTo } = useCommandSections(SECTIONS as unknown as CommandSectionDef[], [loading]);

  const [stats, setStats] = useState({ shipments: 0, underInspection: 0, released: 0, inspections: 0 });

  useEffect(() => {
    getShipments({ page_size: 100 })
      .then((res) => {
        const d = res.data.data;
        setStats((s) => ({
          ...s,
          shipments: d.count,
          underInspection: d.results.filter((x: FoodShipment) => x.status === 'UNDER_INSPECTION').length,
          released: d.results.filter((x: FoodShipment) => x.status === 'RELEASED').length,
        }));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setStats((s) => ({ ...s, inspections: count }));
  }, [count]);

  const sections = useMemo(
    () =>
      SECTIONS.map((s) => ({
        id: s.id,
        label: t(`inspector.quarantine.sections.${s.labelKey}`),
        icon: s.icon,
      })),
    [t],
  );

  const handleExport = () =>
    exportAll({
      filename: `inspections-${new Date().toISOString().slice(0, 10)}.csv`,
      headers: [
        t('inspector.quarantine.headers.shipmentManifest'),
        t('inspector.quarantine.headers.inspector'),
        t('inspector.quarantine.headers.decision'),
        t('inspector.quarantine.headers.inspectedAt'),
      ],
      mapRow: (r: FoodInspection) => [
        r.shipment_manifest,
        r.inspector_name || '-',
        r.decision === 'COMPLIANT' ? t('inspector.quarantine.decisionCompliant') : r.decision === 'NON_COMPLIANT' ? t('inspector.quarantine.decisionNonCompliant') : r.decision,
        formatDate(r.inspected_at),
      ],
      message: t('inspector.quarantine.exportMessage'),
    });

  return (
    <Box aria-busy={loading}>
      <DashboardHero
        eyebrow={t('inspector.quarantine.eyebrow')}
        title={t('inspector.quarantine.greeting', { name: user?.full_name || t('inspector.quarantine.inspectorFallback') })}
        subtitle={t('inspector.quarantine.subtitle')}
        avatarLabel={(user?.full_name || 'م').slice(0, 1)}
        chips={[
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>{todayArabic()}</Box>,
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#8ff5d4', flexShrink: 0 }} />
            {t('inspector.quarantine.liveStatus')}
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
            label={t('inspector.quarantine.sectionsLabel')}
          />
        </Grid>
        <Grid item xs={12} md={9.8} lg={10.2}>
      <Box component="section" ref={register('overview')} data-section="overview" sx={{ scrollMarginTop: '80px' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.5, my: 2.5 }}>
          <KpiCard icon={<Inventory2Icon />} label={t('inspector.quarantine.kpiShipments')} value={stats.shipments} accent="primary.main" />
          <KpiCard icon={<FactCheckIcon />} label={t('inspector.quarantine.kpiInspections')} value={stats.inspections} accent="info.main" />
          <KpiCard icon={<HourglassTopIcon />} label={t('inspector.quarantine.kpiUnderInspection')} value={stats.underInspection} accent="warning.main" />
          <KpiCard icon={<VerifiedIcon />} label={t('inspector.quarantine.kpiReleased')} value={stats.released} accent="success.main" />
        </Box>
      </Box>

      <Box component="section" ref={register('inspections')} data-section="inspections" sx={{ scrollMarginTop: '80px' }}>
        <DataTable<FoodInspection>
          columns={[
            { key: 'shipment_manifest', label: t('inspector.quarantine.colShipmentManifest'), render: (r) => <Box component="span" sx={chipSx}>{r.shipment_manifest}</Box> },
            { key: 'inspector_name', label: t('inspector.quarantine.colInspector'), render: (r) => <span style={{ fontWeight: 700 }}>{r.inspector_name || '-'}</span>, hideOnMobile: true },
            { key: 'decision', label: t('inspector.quarantine.colDecision'), render: (r) => { const d = r.decision; return d === 'COMPLIANT' ? <StatusChip label={t('inspector.quarantine.decisionCompliant')} tone="success" /> : d === 'NON_COMPLIANT' ? <StatusChip label={t('inspector.quarantine.decisionNonCompliant')} tone="error" /> : <StatusChip label={d} tone="neutral" />; } },
            { key: 'inspected_at', label: t('inspector.quarantine.colInspectedAt'), sortable: true, render: (r) => formatDate(r.inspected_at), hideOnMobile: true },
          ]}
          rows={rows}
          rowKey={(r) => r.id}
          count={count}
          page={page}
          rowsPerPage={rowsPerPage}
          pageSizeOptions={pageSizeOptions}
          loading={loading}
          error={error}
          title={t('inspector.quarantine.tableTitle')}
          subtitle={t('inspector.quarantine.tableSubtitle', { count })}
          searchInput={searchInput}
          onSearchChange={setSearchInput}
          searchPlaceholder={t('inspector.quarantine.searchPlaceholder')}
          filters={[
            { key: 'decision', label: t('inspector.quarantine.filterDecision'), options: [{ value: 'COMPLIANT', label: t('inspector.quarantine.decisionCompliant') }, { value: 'NON_COMPLIANT', label: t('inspector.quarantine.decisionNonCompliant') }], value: '', onChange: (v) => setFilter('decision', v) },
          ]}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={setSorting}
          onPageChange={setPage}
          onRowsPerPageChange={setRowsPerPage}
          onExport={handleExport}
          exporting={exporting}
          onRefresh={refresh}
          emptyTitle={t('inspector.quarantine.emptyTitle')}
          emptyDescription={t('inspector.quarantine.emptyDescription')}
        />
      </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default QuarantineInspectorPage;
