import { useEffect, useState } from 'react';
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
  fontWeight: 800,
  fontSize: 12,
} as const;

const SECTIONS = [
  { id: 'overview', label: 'نظرة عامة', icon: <Inventory2Icon fontSize="small" /> },
  { id: 'inspections', label: 'التفتيشات', icon: <FactCheckIcon fontSize="small" /> },
] as const;

const QuarantineInspectorPage = () => {
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

  const handleExport = () =>
    exportAll({
      filename: `inspections-${new Date().toISOString().slice(0, 10)}.csv`,
      headers: ['رقم البيان', 'المفتش', 'القرار', 'وقت التفتيش'],
      mapRow: (r: FoodInspection) => [
        r.shipment_manifest,
        r.inspector_name || '-',
        r.decision === 'COMPLIANT' ? 'مطابق' : r.decision === 'NON_COMPLIANT' ? 'غير مطابق' : r.decision,
        formatDate(r.inspected_at),
      ],
      message: 'تم تصدير التفتيشات',
    });

  return (
    <Box aria-busy={loading}>
      <DashboardHero
        eyebrow="قسم الحجر الصحي البيطري والنباتي"
        title={`مرحباً، ${user?.full_name || 'المفتش'}`}
        subtitle="متابعة عمليات التفتيش الصحي على الشحنات والعينات"
        avatarLabel={(user?.full_name || 'م').slice(0, 1)}
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
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.5, my: 2.5 }}>
          <KpiCard icon={<Inventory2Icon />} label="إجمالي الشحنات" value={stats.shipments} accent="primary.main" />
          <KpiCard icon={<FactCheckIcon />} label="عمليات التفتيش" value={stats.inspections} accent="info.main" />
          <KpiCard icon={<HourglassTopIcon />} label="قيد التفتيش" value={stats.underInspection} accent="warning.main" />
          <KpiCard icon={<VerifiedIcon />} label="أُفرج عنه" value={stats.released} accent="success.main" />
        </Box>
      </Box>

      <Box component="section" ref={register('inspections')} data-section="inspections" sx={{ scrollMarginTop: '80px' }}>
        <DataTable<FoodInspection>
          columns={[
            { key: 'shipment_manifest', label: 'رقم البيان', render: (r) => <Box component="span" sx={chipSx}>{r.shipment_manifest}</Box> },
            { key: 'inspector_name', label: 'المفتش', render: (r) => <span style={{ fontWeight: 700 }}>{r.inspector_name || '-'}</span>, hideOnMobile: true },
            { key: 'decision', label: 'القرار', render: (r) => { const d = r.decision; return d === 'COMPLIANT' ? <StatusChip label="مطابق" tone="success" /> : d === 'NON_COMPLIANT' ? <StatusChip label="غير مطابق" tone="error" /> : <StatusChip label={d} tone="neutral" />; } },
            { key: 'inspected_at', label: 'وقت التفتيش', sortable: true, render: (r) => formatDate(r.inspected_at), hideOnMobile: true },
          ]}
          rows={rows}
          rowKey={(r) => r.id}
          count={count}
          page={page}
          rowsPerPage={rowsPerPage}
          pageSizeOptions={pageSizeOptions}
          loading={loading}
          error={error}
          title="سجل التفتيش"
          subtitle={`${count} عملية تفتيش`}
          searchInput={searchInput}
          onSearchChange={setSearchInput}
          searchPlaceholder="بحث برقم البيان أو اسم المفتش..."
          filters={[
            { key: 'decision', label: 'القرار', options: [{ value: 'COMPLIANT', label: 'مطابق' }, { value: 'NON_COMPLIANT', label: 'غير مطابق' }], value: '', onChange: (v) => setFilter('decision', v) },
          ]}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={setSorting}
          onPageChange={setPage}
          onRowsPerPageChange={setRowsPerPage}
          onExport={handleExport}
          exporting={exporting}
          onRefresh={refresh}
          emptyTitle="لا توجد تفتيشات"
          emptyDescription="عمليات التفتيش الصحي تظهر هنا عند تسجيلها"
        />
      </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default QuarantineInspectorPage;