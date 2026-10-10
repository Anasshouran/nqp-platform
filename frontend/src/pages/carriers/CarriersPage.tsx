import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Autocomplete from '@mui/material/Autocomplete';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Skeleton from '@mui/material/Skeleton';
import CircularProgress from '@mui/material/CircularProgress';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AddBusinessIcon from '@mui/icons-material/AddBusiness';
import KeyIcon from '@mui/icons-material/Key';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import FlightLandIcon from '@mui/icons-material/FlightLand';
import BusinessIcon from '@mui/icons-material/Business';
import CampaignIcon from '@mui/icons-material/Campaign';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { FormDialog, FormTextField, FormSelect, ConfirmDialog, StatusChip, DataTable, En } from '../../components/uikit';
import KpiCard from '../../components/dashboard/KpiCard';
import DashboardHero from '../../components/dashboard/DashboardHero';
import { useServerTable } from '../../hooks/useServerTable';
import { useTableExport } from '../../hooks/useTableExport';
import { useAuth } from '../../hooks/useAuth';
import { createCarrier, getCarriers, getCarrierApiKey, getFlights, getHealthNotices, regenerateCarrierApiKey, uploadManifest } from '../../api/endpoints/carriers';
import { getCountries } from '../../api/endpoints/public';
import { getMasterEntryPoints } from '../../api/endpoints/masterdata';
import type { PublicCountry } from '../../api/endpoints/public';
import type { MasterEntryPoint } from '../../types/masterdata';
import type { Carrier, Flight, HealthNotice } from '../../types/carrier';
import { flightStatus, flightType, noticeCategory, noticePriority } from '../../utils/status';
import { formatDateTime } from '../../utils/formatters';
import { notifyError, notifySuccess } from '../../utils/toast';

const flightStatusOptions = Object.entries(flightStatus).map(([v, m]) => ({ value: v, label: m.label }));
const flightTypeOptions = Object.entries(flightType).map(([v, m]) => ({ value: v, label: m.label }));
const noticeCategoryOptions = Object.entries(noticeCategory).map(([v, m]) => ({ value: v, label: m.label }));
const companyTypeOptions = [
  { value: 'NATIONAL', label: 'شركة طيران وطنية' },
  { value: 'REGIONAL', label: 'شركة طيران إقليمية' },
  { value: 'INTERNATIONAL', label: 'شركة طيران دولية' },
  { value: 'CARGO', label: 'شركة شحن جوي/بحري' },
  { value: 'MARITIME', label: 'شركة ملاحة بحرية' },
  { value: 'LAND', label: 'شركة نقل بري' },
  { value: 'PRIVATE', label: 'خاصة' },
  { value: 'OTHER', label: 'أخرى' },
];

/* ------------------------------------------------------------------ */
/*  Locale helpers                                                      */
/* ------------------------------------------------------------------ */

const todayArabic = () =>
  new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const isSameLocalDay = (value?: string | null) => {
  if (!value) return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
};

/**
 * المعرّفات الأبجدية/الرقمية (IATA, ICAO, رقم الرحلة) ليست نصاً إنجليزياً،
 * فلا يمرّ على `En`. تحتاج `dir="ltr"` lest the bidi algorithm reverse the
 * glyph order inside RTL flow, plus tabular numerals so codes align in a column.
 */
const CodeCell = ({ children, subtle }: { children: string | null | undefined; subtle?: boolean }) => {
  if (!children) return <Typography component="span" color="text.disabled">—</Typography>;
  return (
    <Typography
      component="span"
      dir="ltr"
      sx={{
        display: 'inline-block',
        px: 0.9,
        py: 0.3,
        borderRadius: 1.5,
        fontSize: 12.5,
        fontWeight: 700,
        letterSpacing: '0.04em',
        fontVariantNumeric: 'tabular-nums',
        color: subtle ? 'text.secondary' : 'text.primary',
        bgcolor: subtle ? 'rgba(16,40,34,0.05)' : 'rgba(12,127,106,0.09)',
        border: '1px solid',
        borderColor: subtle ? 'rgba(16,40,34,0.08)' : 'rgba(12,127,106,0.18)',
      }}
    >
      {children}
    </Typography>
  );
};

/** Counts badge with the full list in a tooltip — the table cell stays narrow. */
const PortsCell = ({ names }: { names?: string[] }) => {
  if (!names?.length) return <Typography component="span" color="text.disabled">—</Typography>;
  if (names.length === 1) return <Typography component="span">{names[0]}</Typography>;
  return (
    <Tooltip title={names.join(' · ')}>
      <Chip
        size="small"
        label={`${names.length} منافذ`}
        variant="outlined"
        sx={{ fontWeight: 700, cursor: 'help' }}
      />
    </Tooltip>
  );
};

/* ------------------------------------------------------------------ */
/*  Dashboard statistics                                                */
/* ------------------------------------------------------------------ */

interface CarrierStats {
  flightsTotal: number;
  flightsToday: number;
  flightsUpcoming: number;
  carriersTotal: number | null;
  carriersActive: number | null;
  noticesTotal: number;
  noticesActive: number;
}

/**
 * Aggregates for the KPI row and the tab badges.
 *
 * `CarrierDashboardViewSet` is gated behind `IsCarrierRep`, so it is unusable
 * from this admin page; the numbers are derived from unfiltered list reads
 * instead. Failures are swallowed — a dashboard that cannot count must still
 * render its tables.
 */
const useCarrierStats = (canManageCarriers: boolean) => {
  const [stats, setStats] = useState<CarrierStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [flightsRes, carriersRes, noticesRes] = await Promise.all([
        getFlights({ page_size: 500 }),
        canManageCarriers ? getCarriers({ page_size: 500 }) : Promise.resolve(null),
        getHealthNotices({ page_size: 500 }),
      ]);

      const flights: Flight[] = flightsRes.data?.data?.results ?? [];
      // `carriersRes` is only requested for admins; keep the two in lockstep so
      // the carrier KPIs disappear entirely for other roles instead of showing 0.
      const carriers: Carrier[] = carriersRes?.data?.data?.results ?? [];
      const hasCarriers = !!carriersRes;
      const notices: HealthNotice[] = noticesRes.data?.data?.results ?? [];

      const now = Date.now();
      setStats({
        flightsTotal: flightsRes.data?.data?.count ?? flights.length,
        flightsToday: flights.filter((f) => isSameLocalDay(f.scheduled_arrival)).length,
        flightsUpcoming: flights.filter(
          (f) =>
            f.scheduled_arrival &&
            new Date(f.scheduled_arrival).getTime() >= now &&
            f.status !== 'CANCELLED',
        ).length,
        carriersTotal: hasCarriers ? carriersRes.data?.data?.count ?? carriers.length : null,
        carriersActive: hasCarriers ? carriers.filter((c) => c.is_active).length : null,
        noticesTotal: noticesRes.data?.data?.count ?? notices.length,
        noticesActive: notices.filter((n) => n.is_active).length,
      });
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [canManageCarriers]);

  useEffect(() => {
    void load();
  }, [load]);

  return { stats, loading, reload: load };
};

/* ------------------------------------------------------------------ */
/*  Segmented tab bar                                                   */
/* ------------------------------------------------------------------ */

interface SegmentedTab {
  key: string;
  label: string;
  icon: React.ReactNode;
  count?: number | null;
}

const SegmentedTabs = ({
  tabs,
  value,
  onChange,
}: {
  tabs: SegmentedTab[];
  value: number;
  onChange: (index: number) => void;
}) => {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  // Roving tabindex + arrow-key navigation is the expected keyboard contract
  // for a tablist; Tab should move *past* the strip, not through it.
  // الشريط RTL، فالسهم الأيسر يتقدّم بصريًا (يمين ← يسار) والعكس صحيح.
  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    const last = tabs.length - 1;
    let next: number | null = null;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = index === last ? 0 : index + 1;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = index === 0 ? last : index - 1;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = last;
    if (next === null) return;
    event.preventDefault();
    onChange(next);
    refs.current[next]?.focus();
  };

  return (
    <Box
      role="tablist"
      aria-label="أقسام شركات النقل"
      sx={{
        display: 'flex',
        gap: 0.5,
        p: 0.75,
        mb: 3,
        borderRadius: 99,
        overflowX: 'auto',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
        bgcolor: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(18px) saturate(1.35)',
        border: '1px solid rgba(16,40,34,0.07)',
        boxShadow: '0 1px 2px rgba(16,40,34,0.03), 0 10px 26px rgba(16,40,34,0.05)',
      }}
    >
      {tabs.map((tab, index) => {
        const selected = index === value;
        return (
          <Button
            key={tab.key}
            ref={(el: HTMLButtonElement | null) => {
              refs.current[index] = el;
            }}
            role="tab"
            id={`carriers-tab-${tab.key}`}
            aria-selected={selected}
            aria-controls={`carriers-panel-${tab.key}`}
            tabIndex={selected ? 0 : -1}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onClick={() => onChange(index)}
            startIcon={
              <Box sx={{ display: 'grid', placeItems: 'center', '& svg': { fontSize: 19 } }}>{tab.icon}</Box>
            }
            sx={{
              flexShrink: 0,
              minHeight: 44,
              px: { xs: 1.75, sm: 2.5 },
              borderRadius: 99,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              color: selected ? '#fff' : 'text.secondary',
              bgcolor: selected ? 'primary.main' : 'transparent',
              boxShadow: selected ? '0 8px 18px -8px rgba(12,127,106,0.75)' : 'none',
              transition: 'background-color 160ms ease, color 160ms ease, box-shadow 160ms ease, transform 160ms ease',
              '&:hover': {
                bgcolor: selected ? 'primary.dark' : 'rgba(12,127,106,0.08)',
                color: selected ? '#fff' : 'primary.main',
              },
              '&:focus-visible': {
                outline: 'none',
                boxShadow: selected
                  ? '0 0 0 3px rgba(12,127,106,0.35)'
                  : '0 0 0 3px rgba(12,127,106,0.28)',
              },
            }}
          >
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
              {tab.label}
              {tab.count !== null && tab.count !== undefined && (
                <Box
                  component="span"
                  sx={{
                    minWidth: 22,
                    px: 0.6,
                    borderRadius: 99,
                    fontSize: 11.5,
                    fontWeight: 800,
                    fontVariantNumeric: 'tabular-nums',
                    bgcolor: selected ? 'rgba(255,255,255,0.24)' : 'rgba(12,127,106,0.12)',
                    color: selected ? '#fff' : 'primary.dark',
                  }}
                >
                  {tab.count.toLocaleString('en-US')}
                </Box>
              )}
            </Box>
          </Button>
        );
      })}
    </Box>
  );
};

/* ------------------------------------------------------------------ */
/*  KPI row                                                             */
/* ------------------------------------------------------------------ */

interface KpiCardSpec {
  key: string;
  label: string;
  value: number;
  icon: React.ReactNode;
  /** Theme token resolved by KpiCard, e.g. "primary.main". */
  accent: string;
  hint?: string;
  onClick: () => void;
}

const KpiRow = ({
  stats,
  loading,
  onJump,
  canManageCarriers,
}: {
  stats: CarrierStats | null;
  loading: boolean;
  onJump: (index: number) => void;
  canManageCarriers: boolean;
}) => {
  const cards = useMemo<KpiCardSpec[]>(() => {
    const list: KpiCardSpec[] = [
      {
        key: 'flights',
        label: 'إجمالي الرحلات',
        value: stats?.flightsTotal ?? 0,
        icon: <FlightTakeoffIcon />,
        accent: 'info.main',
        hint: 'الكل',
        onClick: () => onJump(0),
      },
      {
        key: 'today',
        label: 'وصول اليوم',
        value: stats?.flightsToday ?? 0,
        icon: <FlightLandIcon />,
        accent: 'primary.main',
        hint: 'اليوم',
        onClick: () => onJump(0),
      },
    ];

    if (canManageCarriers) {
      list.push({
        key: 'carriers',
        label: 'شركات نشطة',
        value: stats?.carriersActive ?? 0,
        icon: <BusinessIcon />,
        accent: 'success.main',
        hint: stats?.carriersTotal ? `من ${stats.carriersTotal}` : undefined,
        onClick: () => onJump(1),
      });
    } else {
      list.push({
        key: 'upcoming',
        label: 'رحلات قادمة',
        value: stats?.flightsUpcoming ?? 0,
        icon: <FlightLandIcon />,
        accent: 'info.main',
        hint: 'قادمة',
        onClick: () => onJump(0),
      });
    }

    list.push({
      key: 'notices',
      label: 'إشعارات فعّالة',
      value: stats?.noticesActive ?? 0,
      icon: <CampaignIcon />,
      accent: 'warning.main',
      hint: stats?.noticesTotal ? `من ${stats.noticesTotal}` : undefined,
      onClick: () => onJump(canManageCarriers ? 2 : 1),
    });

    return list;
  }, [stats, canManageCarriers, onJump]);

  return (
    <Grid container spacing={1.5} sx={{ mb: 3 }}>
      {cards.map((card) => (
        <Grid item xs={6} md={3} key={card.key}>
          {loading && !stats ? (
            <Skeleton variant="rounded" height={168} sx={{ borderRadius: 2 }} />
          ) : (
            <KpiCard
              icon={card.icon}
              label={card.label}
              value={card.value}
              accent={card.accent}
              hint={card.hint}
              onClick={card.onClick}
            />
          )}
        </Grid>
      ))}
    </Grid>
  );
};

/* ------------------------------------------------------------------ */
/*  Flights                                                             */
/* ------------------------------------------------------------------ */

const FlightsTab = () => {
  const role = useAuth().user?.role;
  // الكتابة على الرحلات: الإدارة و`DG_MANAGER` وممثّل الناقل (شركته فقط).
  // الأدوار التشغيلية الأخرى (`flights:view`) لا ترى أزرار الكتابة.
  const canEditFlights = role === 'ADMIN' || role === 'DG_MANAGER' || role === 'CARRIER';
  const table = useServerTable<Flight>({ fetchData: getFlights });
  const { rows, count, loading, error, searchInput, setSearchInput, sortBy, sortOrder, setSorting, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, setFilter } = table;
  const { exporting, exportAll } = useTableExport(table.fetchAllRows);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [uploadTarget, setUploadTarget] = useState<Flight | null>(null);

  const handleUpload = (flight: Flight) => {
    setUploadTarget(flight);
    fileRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !uploadTarget) return;
    setUploadingFor(uploadTarget.id);
    try {
      const res = await uploadManifest(uploadTarget.id, file);
      const m = res.data?.data ?? res.data;
      const errCount =
        m && typeof m.error_report === 'object' && m.error_report !== null
          ? (m.error_report as { errors?: unknown[] }).errors?.length ?? 0
          : 0;
      if (errCount > 0) {
        notifySuccess(
          `تمت معالجة الكشف (${m?.total_passengers ?? 0} مسافراً) مع ${errCount} سطراً بحاجة لمراجعة`,
        );
      } else {
        notifySuccess(`تمت معالجة الكشف بنجاح (${m?.total_passengers ?? 0} مسافراً)`);
      }
      void refresh();
    } catch {
      notifyError('فشل رفع الكشف — تأكد من صحة ملف CSV');
    } finally {
      setUploadingFor(null);
      setUploadTarget(null);
    }
  };

  const handleExport = () => exportAll({
    filename: `flights-${new Date().toISOString().slice(0, 10)}.csv`,
    headers: ['رقم الرحلة', 'الشركة', 'النوع', 'المغادرة', 'الوجهة', 'موعد الوصول', 'الحالة'],
    mapRow: (f) => [
      f.flight_number,
      f.carrier_name || '',
      flightType[f.flight_type]?.label || f.flight_type,
      `${f.origin_code || ''} ${f.origin_country_name || ''}`,
      f.destination_port_name || '',
      formatDateTime(f.scheduled_arrival),
      flightStatus[f.status]?.label || f.status,
    ],
    message: 'تم تصدير الرحلات',
  });

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.txt,text/csv"
        style={{ display: 'none' }}
        onChange={(e) => void handleFileChange(e)}
      />
      <DataTable<Flight>
        columns={[
          {
            key: 'flight_number', label: 'رقم الرحلة', sortable: true,
            render: (f) => <CodeCell>{f.flight_number}</CodeCell>,
          },
          {
            key: 'carrier_name', label: 'الشركة', hideOnMobile: true,
            render: (f) => (f.carrier_name ? <En>{f.carrier_name}</En> : '—'),
          },
          {
            key: 'flight_type', label: 'النوع',
            render: (f) => {
              const m = flightType[f.flight_type];
              return m ? <StatusChip label={m.label} tone={m.tone} /> : <CodeCell subtle>{f.flight_type}</CodeCell>;
            },
          },
          {
            key: 'origin', label: 'المغادرة', hideOnMobile: true,
            render: (f) => (
              <Stack direction="row" spacing={0.75} alignItems="center">
                <CodeCell subtle>{f.origin_code}</CodeCell>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {f.origin_country_name || ''}
                </Typography>
              </Stack>
            ),
          },
          {
            key: 'destination_port_name', label: 'الوجهة', noWrap: false,
            render: (f) => f.destination_port_name || '—',
          },
          {
            key: 'scheduled_arrival', label: 'موعد الوصول', sortable: true, hideOnMobile: true,
            render: (f) => (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  {formatDateTime(f.scheduled_arrival)}
                </Typography>
                {isSameLocalDay(f.scheduled_arrival) && (
                  <Chip size="small" label="اليوم" sx={{ height: 20, fontSize: 11, fontWeight: 700 }} />
                )}
              </Box>
            ),
          },
          {
            key: 'status', label: 'الحالة', sortable: true,
            render: (f) => {
              const m = flightStatus[f.status];
              return m ? <StatusChip label={m.label} tone={m.tone} /> : <StatusChip label={f.status} tone="neutral" />;
            },
          },
          {
            key: 'manifest', label: 'الكشف', align: 'center',
            render: (f) =>
              canEditFlights ? (
                <Tooltip title="رفع كشف المسافرين (CSV)">
                  {/* A disabled button swallows pointer events, so the tooltip
                      needs a focusable/hoverable wrapper to stay reachable. */}
                  <Box component="span" sx={{ display: 'inline-flex' }}>
                    <IconButton
                      size="small"
                      disabled={!!uploadingFor}
                      onClick={() => handleUpload(f)}
                      aria-label={`رفع كشف المسافرين للرحلة ${f.flight_number}`}
                      sx={{ minWidth: 40, minHeight: 40 }}
                    >
                      {uploadingFor === f.id ? (
                        <CircularProgress size={18} />
                      ) : (
                        <UploadFileIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Box>
                </Tooltip>
              ) : null,
          },
        ]}
        rows={rows}
        rowKey={(f) => f.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title="الرحلات"
        subtitle={`${count.toLocaleString('en-US')} رحلة`}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="بحث برقم الرحلة أو الشركة..."
        filters={[
          { key: 'status', label: 'الحالة', options: flightStatusOptions, value: '', onChange: (v) => setFilter('status', v) },
          { key: 'flight_type', label: 'النوع', options: flightTypeOptions, value: '', onChange: (v) => setFilter('flight_type', v) },
        ]}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSorting}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onExport={role === 'ADMIN' || role === 'DG_MANAGER' ? handleExport : undefined}
        exporting={exporting}
        onRefresh={refresh}
        emptyTitle="لا توجد رحلات"
        emptyDescription="الرحلات الواردة تظهر هنا عند تسجيلها"
      />
    </>
  );
};

/* ------------------------------------------------------------------ */
/*  Carrier create form                                                 */
/* ------------------------------------------------------------------ */

const CarrierFormDialog = ({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countries, setCountries] = useState<PublicCountry[]>([]);
  const [ports, setPorts] = useState<MasterEntryPoint[]>([]);
  const [form, setForm] = useState({
    name: '',
    name_en: '',
    iata_code: '',
    icao_code: '',
    company_type: 'NATIONAL',
    country: null as string | null,
    is_active: true,
    ports: [] as string[],
  });

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm({ name: '', name_en: '', iata_code: '', icao_code: '', company_type: 'NATIONAL', country: null, is_active: true, ports: [] });
    void getCountries().then((r) => setCountries(r.data?.data ?? r.data ?? [])).catch(() => {});
    void getMasterEntryPoints({ page_size: 500 })
      .then((r) => setPorts(r.data?.data?.results ?? r.data?.data ?? []))
      .catch(() => {});
  }, [open]);

  const airportOptions = ports.filter((p) => p.kind === 'AIRPORT' || p.is_active);

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError('الاسم بالعربية مطلوب');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await createCarrier({
        name: form.name.trim(),
        name_en: form.name_en.trim(),
        iata_code: form.iata_code.trim().toUpperCase() || null,
        icao_code: form.icao_code.trim().toUpperCase() || null,
        company_type: form.company_type,
        country: form.country,
        is_active: form.is_active,
        ports: form.ports,
      });
      onSaved(`تم اعتماد «${(res.data?.data ?? res.data)?.name}» (ID: ${(res.data?.data ?? res.data)?.iata_code || '—'})`);
      onClose();
    } catch {
      setError('تعذّر الحفظ — تحقق من عدم تكرار كود IATA/ICAO');
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      onSubmit={() => void handleSubmit()}
      title="إضافة شركة طيران"
      subtitle="سجّل شركة نقل جديدة واربطها بمنافذ الدخول"
      icon={<AddBusinessIcon />}
      submitLabel="حفظ واعتماد"
      loading={busy}
    >
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <FormTextField
            label="الاسم بالعربية"
            required
            requiredMark
            size="small"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormTextField
            label="الاسم بالإنجليزية"
            size="small"
            value={form.name_en}
            onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))}
          />
        </Grid>

        <Grid item xs={6} sm={3}>
          <FormTextField
            label="رمز IATA"
            size="small"
            value={form.iata_code}
            placeholder="J4"
            inputProps={{ maxLength: 3, dir: 'ltr', style: { textTransform: 'uppercase', fontVariantNumeric: 'tabular-nums' } }}
            onChange={(e) => setForm((f) => ({ ...f, iata_code: e.target.value.toUpperCase() }))}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <FormTextField
            label="رمز ICAO"
            size="small"
            value={form.icao_code}
            placeholder="BDR"
            inputProps={{ maxLength: 4, dir: 'ltr', style: { textTransform: 'uppercase', fontVariantNumeric: 'tabular-nums' } }}
            onChange={(e) => setForm((f) => ({ ...f, icao_code: e.target.value.toUpperCase() }))}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormSelect
            label="نوع الشركة"
            value={form.company_type}
            onChange={(v) => setForm((f) => ({ ...f, company_type: v }))}
            options={companyTypeOptions}
          />
        </Grid>

        <Grid item xs={12} sm={8}>
          <Autocomplete
            fullWidth
            size="small"
            options={countries}
            getOptionLabel={(c) => (c.name_ar || c.name) + ` (${c.code})`}
            value={countries.find((c) => c.code === form.country) ?? null}
            onChange={(_, v) => setForm((f) => ({ ...f, country: v?.code ?? null }))}
            isOptionEqualToValue={(o, v) => o.code === v.code}
            renderInput={(p) => <FormTextField {...p} label="الدولة" />}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <Box sx={{ height: '100%', display: 'flex', alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                />
              }
              label={form.is_active ? 'نشطة' : 'معطلة'}
            />
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Autocomplete
            multiple
            size="small"
            options={airportOptions}
            getOptionLabel={(p) => (p.name_ar || p.name_en) + (p.code ? ` (${p.code})` : '')}
            value={airportOptions.filter((p) => form.ports.includes(p.code))}
            onChange={(_, v) => setForm((f) => ({ ...f, ports: v.map((p) => p.code) }))}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip size="small" label={option.name_ar || option.code} {...getTagProps({ index })} />
              ))
            }
            renderInput={(p) => (
              <FormTextField
                {...p}
                label="المنافذ"
                placeholder="اختر منافذ الشركة…"
                hint={`${form.ports.length} منفذ محدد`}
              />
            )}
          />
        </Grid>

        {error && (
          <Grid item xs={12}>
            <Alert severity="error">{error}</Alert>
          </Grid>
        )}
      </Grid>
    </FormDialog>
  );
};

/* ------------------------------------------------------------------ */
/*  Carrier API key                                                     */
/* ------------------------------------------------------------------ */

const CarrierApiKeyDialog = ({
  carrier,
  open,
  onClose,
}: {
  carrier: Carrier | null;
  open: boolean;
  onClose: () => void;
}) => {
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [info, setInfo] = useState<{ api_key: string | null; created_at?: string | null; last_use_at?: string | null } | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !carrier) return;
    setNewKey(null);
    setConfirmOpen(false);
    getCarrierApiKey(carrier.id)
      .then((r) => setInfo(r.data?.data ?? r.data ?? null))
      .catch(() => setInfo(null));
  }, [open, carrier?.id, carrier]);

  if (!carrier) return null;

  const handleCopy = async () => {
    if (!newKey) return;
    try {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      notifyError('تعذّر النسخ');
    }
  };

  const handleGenerate = () => {
    setBusy(true);
    setConfirmOpen(false);
    regenerateCarrierApiKey(carrier.id)
      .then((r) => {
        const d = r.data?.data ?? r.data;
        setNewKey(d?.api_key ?? null);
        notifySuccess('تم توليد مفتاح API جديد');
      })
      .catch(() => notifyError('فشل توليد المفتاح'))
      .finally(() => setBusy(false));
  };

  return (
    <>
      <FormDialog
        open={open}
        onClose={onClose}
        onSubmit={() => (info?.api_key && !newKey ? setConfirmOpen(true) : handleGenerate())}
        title="التكامل عبر API"
        subtitle={carrier.name}
        icon={<KeyIcon />}
        submitLabel={info?.api_key ? 'إعادة توليد المفتاح' : 'توليد مفتاح API'}
        loading={busy}
        submitDisabled={!!newKey}
        maxWidth="xs"
      >
        {info?.api_key && !newKey && (
          <Alert severity="success" icon={<CheckCircleIcon fontSize="inherit" />}>
            مفتاح API مفعّل
            {info.created_at ? ` · أُنشئ ${formatDateTime(info.created_at)}` : ''}
            {info.last_use_at ? ` · آخر استخدام ${formatDateTime(info.last_use_at)}` : ' · لم يُستخدم بعد'}
          </Alert>
        )}

        {newKey ? (
          <Box
            sx={{
              p: 2,
              borderRadius: 3,
              bgcolor: 'rgba(12,127,106,0.07)',
              border: '1px dashed rgba(12,127,106,0.4)',
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <InfoOutlinedIcon fontSize="small" color="primary" />
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                لن يظهر هذا المفتاح مرة أخرى — احفظه الآن
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography
                sx={{
                  flex: 1,
                  fontSize: 13,
                  fontWeight: 700,
                  wordBreak: 'break-all',
                  fontVariantNumeric: 'tabular-nums',
                }}
                dir="ltr"
              >
                {newKey}
              </Typography>
              <Tooltip title={copied ? 'تم النسخ' : 'نسخ'}>
                <IconButton onClick={() => void handleCopy()} aria-label="نسخ المفتاح" sx={{ minWidth: 40, minHeight: 40 }}>
                  <ContentCopyIcon fontSize="small" color={copied ? 'primary' : 'inherit'} />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>
        ) : (
          <Alert severity="warning" icon={<RefreshIcon fontSize="inherit" />}>
            {info?.api_key
              ? 'إعادة توليد المفتاح تُبطل المفتاح الحالي وتوقف التكامل القائم.'
              : 'لا يوجد مفتاح API بعد — ولّد مفتاحاً لتفعيل التكامل مع أنظمة الشركة.'}
          </Alert>
        )}
      </FormDialog>

      <ConfirmDialog
        open={confirmOpen}
        title="إعادة توليد المفتاح"
        message={`سيُبطَل مفتاح «${carrier.name}» الحالي فوراً، ويتوقف أي تكامل قائم به. هل تريد المتابعة؟`}
        confirmLabel="نعم، أعِد التوليد"
        tone="error"
        onConfirm={handleGenerate}
        onClose={() => setConfirmOpen(false)}
      />
    </>
  );
};

/* ------------------------------------------------------------------ */
/*  Carriers table                                                      */
/* ------------------------------------------------------------------ */

const CarriersTab = ({ onChanged }: { onChanged: () => void }) => {
  const table = useServerTable<Carrier>({ fetchData: getCarriers });
  const { rows, count, loading, error, searchInput, setSearchInput, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions } = table;
  const [formOpen, setFormOpen] = useState(false);
  const [keyCarrier, setKeyCarrier] = useState<Carrier | null>(null);

  const handleSaved = (msg: string) => {
    notifySuccess(msg);
    void refresh();
    onChanged();
  };

  return (
    <>
      <DataTable<Carrier>
        columns={[
          {
            key: 'name', label: 'الاسم', sortable: true, noWrap: false,
            render: (c) => (
              <Stack direction="row" spacing={1.25} alignItems="center">
                <Box
                  aria-hidden
                  sx={{
                    width: 38,
                    height: 38,
                    flexShrink: 0,
                    borderRadius: 2.2,
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 800,
                    fontSize: 13,
                    color: 'primary.dark',
                    bgcolor: 'rgba(12,127,106,0.1)',
                    border: '1px solid rgba(12,127,106,0.18)',
                  }}
                >
                  {c.logo_url ? (
                    <Box component="img" src={c.logo_url} alt="" sx={{ width: '100%', height: '100%', borderRadius: 2.2, objectFit: 'cover' }} />
                  ) : (
                    (c.iata_code || c.name).slice(0, 2).toUpperCase()
                  )}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700 }} noWrap>{c.name}</Typography>
                  {c.name_en && (
                    <Typography variant="caption" color="text.secondary" component="div" noWrap>
                      <En>{c.name_en}</En>
                    </Typography>
                  )}
                </Box>
              </Stack>
            ),
          },
          {
            key: 'iata_code', label: 'كود IATA',
            render: (c) => <CodeCell>{c.iata_code}</CodeCell>,
          },
          { key: 'icao_code', label: 'كود ICAO', hideOnMobile: true, render: (c) => <CodeCell subtle>{c.icao_code}</CodeCell> },
          {
            key: 'country_name', label: 'الدولة', hideOnMobile: true,
            render: (c) => c.country_name || '—',
          },
          { key: 'ports_names', label: 'المنافذ', render: (c) => <PortsCell names={c.ports_names} /> },
          {
            key: 'company_type_label', label: 'النوع', hideOnMobile: true,
            render: (c) => (c.company_type_label ? <StatusChip label={c.company_type_label} tone="info" /> : '—'),
          },
          {
            key: 'is_active', label: 'الحالة',
            render: (c) => (
              <StatusChip label={c.is_active ? 'نشطة' : 'معطلة'} tone={c.is_active ? 'success' : 'neutral'} />
            ),
          },
        ]}
        rows={rows}
        rowKey={(c) => c.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title="شركات النقل"
        subtitle={`${count.toLocaleString('en-US')} شركة`}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="بحث بالاسم أو الكود..."
        toolbar={
          <Button
            variant="contained"
            disableElevation
            startIcon={<AddBusinessIcon />}
            onClick={() => setFormOpen(true)}
            sx={{ borderRadius: 2.5, fontWeight: 700, minHeight: 40 }}
          >
            إضافة شركة طيران
          </Button>
        }
        actions={(c) => (
          <Tooltip title="إعداد التكامل عبر API">
            <IconButton
              size="small"
              aria-label={`إعداد التكامل عبر API لشركة ${c.name}`}
              onClick={() => setKeyCarrier(c)}
              sx={{ minWidth: 40, minHeight: 40 }}
            >
              <KeyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        actionsLabel="التكامل"
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        emptyTitle="لا توجد شركات نقل"
        emptyDescription="شركات النقل الجوي والبحري والبري تظهر هنا"
      />

      <CarrierFormDialog open={formOpen} onClose={() => setFormOpen(false)} onSaved={handleSaved} />
      <CarrierApiKeyDialog carrier={keyCarrier} open={!!keyCarrier} onClose={() => setKeyCarrier(null)} />
    </>
  );
};

/* ------------------------------------------------------------------ */
/*  Health notices                                                     */
/* ------------------------------------------------------------------ */

const NoticesTab = () => {
  const table = useServerTable<HealthNotice>({ fetchData: getHealthNotices });
  const { rows, count, loading, error, searchInput, setSearchInput, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, setFilter } = table;

  return (
    <DataTable<HealthNotice>
      columns={[
        {
          key: 'title', label: 'العنوان', sortable: true, noWrap: false,
          render: (n) => <Typography sx={{ fontWeight: 700 }}>{n.title}</Typography>,
        },
        {
          key: 'category', label: 'الفئة',
          render: (n) => {
            const m = noticeCategory[n.category];
            return m ? <StatusChip label={m.label} tone={m.tone} /> : n.category;
          },
        },
        {
          key: 'priority', label: 'الأولوية', hideOnMobile: true,
          render: (n) => {
            const m = noticePriority[n.priority];
            return m ? <StatusChip label={m.label} tone={m.tone} /> : n.priority;
          },
        },
        {
          key: 'published_at', label: 'تاريخ النشر', sortable: true, hideOnMobile: true,
          render: (n) => (
            <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {formatDateTime(n.published_at)}
            </Typography>
          ),
        },
        {
          key: 'is_active', label: 'الحالة',
          render: (n) => (
            <StatusChip label={n.is_active ? 'نشط' : 'معطل'} tone={n.is_active ? 'success' : 'neutral'} />
          ),
        },
      ]}
      rows={rows}
      rowKey={(n) => n.id}
      count={count}
      page={page}
      rowsPerPage={rowsPerPage}
      pageSizeOptions={pageSizeOptions}
      loading={loading}
      error={error}
      title="الإشعارات الصحية"
      subtitle={`${count.toLocaleString('en-US')} إشعار`}
      searchInput={searchInput}
      onSearchChange={setSearchInput}
      searchPlaceholder="بحث بالعنوان..."
      filters={[
        { key: 'category', label: 'الفئة', options: noticeCategoryOptions, value: '', onChange: (v) => setFilter('category', v) },
      ]}
      onPageChange={setPage}
      onRowsPerPageChange={setRowsPerPage}
      onRefresh={refresh}
      emptyTitle="لا توجد إشعارات"
      emptyDescription="الإشعارات الصحية للمسافرين تظهر هنا"
    />
  );
};

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

const CarriersPage = () => {
  const [tab, setTab] = useState(0);
  // `CarrierViewSet` إداري حصريًا، فتبويب «شركات النقل» لا يظهر لغير الإدارة.
  // أما الإشعارات الصحية فقراءتها عامة عبر `get_permissions` في الخادم.
  const role = useAuth().user?.role;
  const canManageCarriers = role === 'ADMIN' || role === 'DG_MANAGER';

  const { stats, loading, reload } = useCarrierStats(canManageCarriers);

  const tabs = useMemo<SegmentedTab[]>(() => {
    const list: SegmentedTab[] = [
      { key: 'flights', label: 'الرحلات', icon: <FlightTakeoffIcon />, count: stats?.flightsTotal ?? null },
    ];
    if (canManageCarriers) {
      list.push({ key: 'carriers', label: 'شركات النقل', icon: <BusinessIcon />, count: stats?.carriersTotal ?? null });
    }
    list.push({ key: 'notices', label: 'الإشعارات الصحية', icon: <CampaignIcon />, count: stats?.noticesTotal ?? null });
    return list;
  }, [stats, canManageCarriers]);

  // A non-admin can land on index 1 only if the carriers tab is absent; clamp so
  // the panels never desync from the visible tab strip.
  const activeTab = Math.min(tab, tabs.length - 1);
  const activeKey = tabs[activeTab]?.key ?? 'flights';

  const roleLabel =
    role === 'ADMIN' ? 'مدير النظام'
      : role === 'DG_MANAGER' ? 'المدير العام'
        : role === 'CARRIER' ? 'ممثّل شركة نقل'
          : 'متابعة العمليات';

  return (
    <Box>
      <DashboardHero
        eyebrow="العمليات"
        title="شركات النقل والرحلات"
        subtitle="متابعة الرحلات وشركات النقل والإشعارات الصحية عبر نقطة دخول واحدة"
        avatarLabel={roleLabel}
        gradient="ocean"
        chips={[
          <Box component="span" key="date">{todayArabic()}</Box>,
          <Box component="span" key="count">
            {stats ? `${stats.flightsTotal.toLocaleString('en-US')} رحلة مسجّلة` : 'جارٍ التحميل…'}
          </Box>,
        ]}
      />

      <Box sx={{ mt: 3 }}>
        <KpiRow stats={stats} loading={loading} canManageCarriers={canManageCarriers} onJump={setTab} />
        <SegmentedTabs tabs={tabs} value={activeTab} onChange={setTab} />
        <Box
          role="tabpanel"
          id={`carriers-panel-${activeKey}`}
          aria-labelledby={`carriers-tab-${activeKey}`}
          tabIndex={0}
          sx={{ borderRadius: 2, '&:focus-visible': { outline: 'none', boxShadow: '0 0 0 3px rgba(12,127,106,0.3)' } }}
        >
          {activeKey === 'flights' && <FlightsTab />}
          {activeKey === 'carriers' && canManageCarriers && <CarriersTab onChanged={reload} />}
          {activeKey === 'notices' && <NoticesTab />}
        </Box>
      </Box>
    </Box>
  );
};

export default CarriersPage;