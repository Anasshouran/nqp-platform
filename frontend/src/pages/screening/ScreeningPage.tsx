import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import { PageHeader } from '../../components/common';
import { AppButton, DataTable, StatusChip } from '../../components/ui';
import { useServerTable } from '../../hooks/useServerTable';
import { getScreenings } from '../../api/endpoints/screening';
import type { HealthScreening } from '../../types/screening';
import { formatDateTime, formatTemperature } from '../../utils/formatters';
import { exportToCsv } from '../../utils/csv';
import { notifySuccess, notifyError } from '../../utils/toast';

const ScreeningPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const table = useServerTable<HealthScreening>({ fetchData: getScreenings });
  const { rows, count, loading, error, searchInput, setSearchInput, sortBy, sortOrder, setSorting, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, fetchAllRows } = table;
  const [exporting, setExporting] = useState(false);

  const searchFilter = searchParams.get('search');
  useEffect(() => {
    if (searchFilter) {
      setSearchInput(searchFilter);
    }
  }, [searchFilter, setSearchInput]);

  const goToTraveler = (passportNumber: string) =>
    navigate(`/app/travelers?search=${encodeURIComponent(passportNumber)}`);

  const temperatureTone = (temp: number | null) => {
    if (temp == null) return 'neutral' as const;
    if (temp >= 38) return 'error' as const;
    if (temp >= 37.5) return 'warning' as const;
    return 'success' as const;
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const all = await fetchAllRows();
      const headers = ['المسافر', 'جواز السفر', 'الحرارة', 'التشبع بالأكسجين', 'الضغط (sys/dia)', 'ملاحظات', 'وقت الفحص'];
      const data = all.map((s) => [
        s.traveler_name,
        s.passport_number,
        s.body_temperature != null ? s.body_temperature.toFixed(1) : '',
        s.oxygen_saturation != null ? `${s.oxygen_saturation}%` : '',
        [s.systolic_bp, s.diastolic_bp].filter((v) => v != null).join('/'),
        s.officer_notes,
        formatDateTime(s.screened_at),
      ]);
      exportToCsv(`screening-${new Date().toISOString().slice(0, 10)}.csv`, headers, data);
      notifySuccess(`تم تصدير ${all.length} فحص`);
    } catch {
      notifyError('تعذر تصدير الفحوصات');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title="الفحوصات الصحية"
        subtitle="متابعة الفحوصات الصحية عند منافذ الدخول"
        eyebrow="العمليات"
      />

      <DataTable<HealthScreening>
        columns={[
          {
            key: 'traveler_name',
            label: 'المسافر',
            render: (s) => (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'info.light', color: 'info.main', fontWeight: 700, fontSize: 14 }}>
                  {s.traveler_name.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {s.traveler_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" dir="ltr">
                    {s.passport_number}
                  </Typography>
                </Box>
              </Box>
            ),
          },
          {
            key: 'body_temperature',
            label: 'الحرارة',
            render: (s) => <StatusChip label={formatTemperature(s.body_temperature)} tone={temperatureTone(s.body_temperature)} />,
          },
          {
            key: 'oxygen_saturation',
            label: 'التشبع O2',
            render: (s) =>
              s.oxygen_saturation != null ? (
                <StatusChip
                  label={`${s.oxygen_saturation}%`}
                  tone={s.oxygen_saturation < 92 ? 'error' : s.oxygen_saturation < 95 ? 'warning' : 'success'}
                />
              ) : (
                '—'
              ),
            hideOnMobile: true,
          },
          {
            key: 'blood_pressure',
            label: 'الضغط',
            render: (s) => (s.systolic_bp && s.diastolic_bp ? `${s.systolic_bp}/${s.diastolic_bp}` : '—'),
            hideOnMobile: true,
          },
          { key: 'officer_notes', label: 'ملاحظات', render: (s) => s.officer_notes || '—', hideOnMobile: true },
          {
            key: 'screened_at',
            label: 'وقت الفحص',
            sortable: true,
            render: (s) => formatDateTime(s.screened_at),
            hideOnMobile: true,
          },
        ]}
        rows={rows}
        rowKey={(s) => s.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title="سجل الفحوصات"
        subtitle={`${count} فحص`}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="بحث باسم المسافر أو رقم الجواز..."
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSorting}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onExport={handleExport}
        exporting={exporting}
        onRefresh={refresh}
        emptyTitle="لا توجد فحوصات"
        emptyDescription="الفحوصات الصحية تظهر هنا عند تسجيلها من شاشة الفحص"
      actions={(s) => (
            <Tooltip title="عرض ملف المسافر">
              <AppButton
                variant="ghost"
                size="small"
                startIcon={<PersonSearchIcon />}
                onClick={() => goToTraveler(s.passport_number)}
              >
                المسافر
              </AppButton>
            </Tooltip>
          )}
        />
    </Box>
  );
};

export default ScreeningPage;
