import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import CircularProgress from '@mui/material/CircularProgress';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import GroupsIcon from '@mui/icons-material/Groups';
import CategoryIcon from '@mui/icons-material/Category';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import FlightLandIcon from '@mui/icons-material/FlightLand';
import FactoryIcon from '@mui/icons-material/Factory';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import InsightsIcon from '@mui/icons-material/Insights';
import BookmarkIcon from '@mui/icons-material/Bookmark';

import DashboardHero from '../../components/dashboard/DashboardHero';
import KpiCard from '../../components/dashboard/KpiCard';

const todayArabic = () => new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
import {
  EmptyState,
  PageLoader,
  FormDialog,
  FormSelect,
  FormTextField,
  AppButton,
  ConfirmDialog,
} from '../../components/uikit';
import { notifySuccess, notifyError } from '../../utils/toast';
import { getUsers } from '../../api/endpoints/users';
import {
  getMasterTree,
  createMasterSector,
  updateMasterSector,
  deleteMasterSector,
  createMasterState,
  updateMasterState,
  deleteMasterState,
  createMasterEntryPoint,
  updateMasterEntryPoint,
  deleteMasterEntryPoint,
  createMasterTerminal,
  updateMasterTerminal,
  deleteMasterTerminal,
  createMasterStation,
  updateMasterStation,
  deleteMasterStation,
  createMasterSection,
  updateMasterSection,
  deleteMasterSection,
  createMasterMember,
  deleteMasterMember,
} from '../../api/endpoints/masterdata';
import type {
  TreeEntryPoint,
  TreeMember,
  TreeSection,
  TreeSector,
  TreeStation,
  TreeState,
  TreeTerminal,
} from '../../types/masterdata';
import type { User } from '../../types/user';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';

type EntityKind = 'sector' | 'state' | 'entry' | 'terminal' | 'station' | 'section';

interface FormState {
  kind: EntityKind;
  open: boolean;
  editing: Record<string, unknown> | null;
  defaults: Record<string, unknown>;
}

interface DeleteTarget {
  kind: EntityKind;
  id: string;
  label: string;
}

const SECTOR_LABELS: Record<string, string> = {
  SEA: 'القطاع البحري',
  LAND: 'القطاع البري',
  AIR: 'القطاع الجوي',
};

const ENTRY_KIND_OPTIONS: { value: string; label: string }[] = [
  { value: 'SEAPORT', label: 'ميناء بحري' },
  { value: 'LAND_PORT', label: 'منفذ بري' },
  { value: 'AIRPORT', label: 'مطار' },
];

const MEMBER_ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'رئيس القسم', label: 'رئيس القسم' },
  { value: 'نائب رئيس القسم', label: 'نائب رئيس القسم' },
  { value: 'مقرر القسم', label: 'مقرر القسم' },
  { value: 'عضو', label: 'عضو' },
];

const ACTION_LABELS: Record<EntityKind, string> = {
  sector: 'قطاعاً',
  state: 'ولاية',
  entry: 'منفذ دخول',
  terminal: 'منشأة',
  station: 'محطة',
  section: 'قسماً',
};

const PANEL_META: Record<string, { title: string; add: string; icon: React.ReactNode; empty: string }> = {
  sector: { title: 'القطاعات (الأنواع)', add: 'قطاع جديد', icon: <CategoryIcon />, empty: 'لا توجد قطاعات' },
  state: { title: 'الولايات', add: 'ولاية جديدة', icon: <LocationCityIcon />, empty: 'لا توجد ولايات لهذا القطاع' },
  entry: { title: 'منافذ الدخول', add: 'منفذ دخول جديد', icon: <FlightLandIcon />, empty: 'لا توجد منافذ دخول لهذه الولاية' },
  terminal: { title: 'المنشآت (الطرفيات)', add: 'منشأة جديدة', icon: <FactoryIcon />, empty: 'لا توجد منشآت لهذا المنفذ' },
  station: { title: 'محطات الحجر الصحي', add: 'محطة جديدة', icon: <HealthAndSafetyIcon />, empty: 'لا توجد محطات' },
  section: { title: 'الأقسام والأعضاء', add: 'قسم جديد', icon: <GroupsIcon />, empty: 'لا توجد أقسام لهذه المحطة' },
};

const SECTIONS = [
  { id: 'overview', label: 'نظرة عامة', icon: <InsightsIcon fontSize="small" /> },
  { id: 'sectors', label: 'القطاعات', icon: <CategoryIcon fontSize="small" /> },
  { id: 'states', label: 'الولايات', icon: <LocationCityIcon fontSize="small" /> },
  { id: 'entries', label: 'منافذ الدخول', icon: <FlightLandIcon fontSize="small" /> },
  { id: 'terminals', label: 'المنشآت', icon: <FactoryIcon fontSize="small" /> },
  { id: 'stations', label: 'المحطات', icon: <HealthAndSafetyIcon fontSize="small" /> },
  { id: 'sections', label: 'الأقسام', icon: <GroupsIcon fontSize="small" /> },
] as const;

const MasterDataPage = () => {
  const [tree, setTree] = useState<TreeSector[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);

  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null);
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [selectedTerminalId, setSelectedTerminalId] = useState<string | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({ kind: 'sector', open: false, editing: null, defaults: {} });
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [sectionMembers, setSectionMembers] = useState<TreeSection | null>(null);

  const loadTree = useCallback(async () => {
    try {
      const res = await getMasterTree();
      setTree(res.data.data);
    } catch (err) {
      notifyError('تعذر تحميل البيانات الأساسية');
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  const { active, register, scrollTo } = useCommandSections(SECTIONS as unknown as CommandSectionDef[], [loading]);

  const selectedSector = useMemo(
    () => (tree ?? []).find((s) => s.id === selectedSectorId) ?? null,
    [tree, selectedSectorId],
  );
  const selectedState = useMemo(
    () => selectedSector?.states.find((st) => st.id === selectedStateId) ?? null,
    [selectedSector, selectedStateId],
  );
  const selectedEntry = useMemo(
    () => selectedState?.entry_points.find((ep) => ep.id === selectedEntryId) ?? null,
    [selectedState, selectedEntryId],
  );
  const selectedTerminal = useMemo(
    () => selectedEntry?.terminals.find((t) => t.id === selectedTerminalId) ?? null,
    [selectedEntry, selectedTerminalId],
  );

  /* stations shown at station step */
  const stationList = useMemo(() => {
    if (selectedTerminal) return selectedTerminal.stations;
    if (selectedEntry) return selectedEntry.stations;
    return [];
  }, [selectedTerminal, selectedEntry]);

  const selectedStation = useMemo(
    () => stationList.find((st) => st.id === selectedStationId) ?? null,
    [stationList, selectedStationId],
  );

  /* ---------- stats ---------- */
  const stats = useMemo(() => {
    const all: { name: string }[] = [];
    (tree ?? []).forEach((s) =>
      s.states.forEach((st) => st.entry_points.forEach((ep) => all.push({ name: ep.name_ar }))),
    );
    return all;
  }, [tree]);

  const counts = useMemo(() => {
    let states = 0;
    let entries = 0;
    let terminals = 0;
    let stations = 0;
    let sections = 0;
    let members = 0;
    (tree ?? []).forEach((s) =>
      s.states.forEach((st) => {
        states += 1;
        st.entry_points.forEach((ep) => {
          entries += 1;
          ep.terminals.forEach(() => (terminals += 1));
          ep.stations.forEach((s2) => {
            stations += 1;
            s2.sections.forEach((sec) => {
              sections += 1;
              members += sec.members.length;
            });
          });
          ep.terminals.forEach((t) =>
            t.stations.forEach((s2) => {
              stations += 1;
              s2.sections.forEach((sec) => {
                sections += 1;
                members += sec.members.length;
              });
            }),
          );
        });
      }),
    );
    return { sectors: tree?.length ?? 0, states, entries, terminals, stations, sections, members };
  }, [tree]);

  /* ---------- selection helpers ---------- */
  const resetBelow = (range: string) => {
    if (range === 'sector') {
      setSelectedStateId(null);
      setSelectedEntryId(null);
      setSelectedTerminalId(null);
      setSelectedStationId(null);
    } else if (range === 'state') {
      setSelectedEntryId(null);
      setSelectedTerminalId(null);
      setSelectedStationId(null);
    } else if (range === 'entry') {
      setSelectedTerminalId(null);
      setSelectedStationId(null);
    } else if (range === 'terminal') {
      setSelectedStationId(null);
    }
  };

  const selectSector = (id: string) => {
    setSelectedSectorId(id);
    resetBelow('sector');
  };
  const selectState = (id: string) => {
    setSelectedStateId(id);
    resetBelow('state');
  };
  const selectEntry = (id: string) => {
    setSelectedEntryId(id);
    resetBelow('entry');
  };
  const selectTerminal = (id: string) => {
    setSelectedTerminalId(id);
    resetBelow('terminal');
  };
  const selectStation = (id: string) => setSelectedStationId(id);

  /* ---------- flat option lists for dialogs ---------- */
  const options = useMemo(() => {
    const sectorOptions = (tree ?? []).map((s) => ({ value: s.id, label: s.name_ar }));
    const stateOptions = (tree ?? []).flatMap((s) =>
      s.states.map((st) => ({ value: st.id, label: `${s.name_ar} ← ${st.name_ar}` })),
    );
    const entryOptions = (tree ?? []).flatMap((s) =>
      s.states.flatMap((st) =>
        st.entry_points.map((ep) => ({
          value: ep.id,
          label: `${st.name_ar} ← ${ep.name_ar}`,
        })),
      ),
    );
    const terminalOptions = (tree ?? []).flatMap((s) =>
      s.states.flatMap((st) =>
        st.entry_points.flatMap((ep) =>
          ep.terminals.map((t) => ({ value: t.id, label: `${st.name_ar} ← ${t.name_ar}` })),
        ),
      ),
    );
    const stationOptions = (tree ?? []).flatMap((s) =>
      s.states.flatMap((st) =>
        st.entry_points.flatMap((ep) => [
          ...ep.stations.map((v) => ({ value: v.id, label: `${st.name_ar} ← ${v.name_ar}` })),
          ...ep.terminals.flatMap((t) =>
            t.stations.map((v) => ({ value: v.id, label: `${st.name_ar} ← ${t.name_ar} ← ${v.name_ar}` })),
          ),
        ]),
      ),
    );
    const sectionOptions = (tree ?? []).flatMap((s) =>
      s.states.flatMap((st) =>
        st.entry_points.flatMap((ep) => [
          ...ep.stations.flatMap((v) =>
            v.sections.map((sec) => ({ value: sec.id, label: `${st.name_ar} ← ${sec.name_ar}` })),
          ),
          ...ep.terminals.flatMap((t) =>
            t.stations.flatMap((v) =>
              v.sections.map((sec) => ({ value: sec.id, label: `${st.name_ar} ← ${sec.name_ar}` })),
            ),
          ),
        ]),
      ),
    );
    return { sectorOptions, stateOptions, entryOptions, terminalOptions, stationOptions, sectionOptions };
  }, [tree]);

  /* ---------- dialog openers ---------- */
  const openCreate = (kind: EntityKind, defaults: Record<string, unknown>) => {
    setForm({ kind, open: true, editing: null, defaults });
  };

  const openEdit = (kind: EntityKind, item: Record<string, unknown>) => {
    setForm({ kind, open: true, editing: item, defaults: item });
  };

  const handleCloseForm = () => setForm((f) => ({ ...f, open: false }));

  const submitForm = async () => {
    const { kind, editing, defaults } = form;
    const payload: Record<string, unknown> = {};
    const fields = getFormFields(kind, options);
    fields.forEach((f) => {
      const v = defaults[f.key] ?? '';
      payload[f.key] = f.key === 'order' && v !== '' ? Number(v) : v;
    });
    try {
      if (editing?.id) {
        await CRUD[kind].update(String(editing.id), payload);
        notifySuccess('تم تحديث ' + ACTION_LABELS[kind] + ' بنجاح');
      } else {
        await CRUD[kind].create(payload);
        notifySuccess('تمت إضافة ' + ACTION_LABELS[kind] + ' بنجاح');
      }
      setForm((f) => ({ ...f, open: false }));
      setFetching(true);
      await loadTree();
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? err?.response?.data?.message ?? 'حدث خطأ أثناء الحفظ';
      notifyError(msg);
    }
  };

  const askDelete = (kind: EntityKind, id: string, label: string) =>
    setDeleteTarget({ kind, id, label });

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await CRUD[deleteTarget.kind].delete(deleteTarget.id);
      notifySuccess('تم حذف العنصر بنجاح');
      setDeleteTarget(null);
      setFetching(true);
      await loadTree();
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ??
        err?.response?.data?.message ??
        'تعذر حذف العنصر (قد يحتوي على عناصر فرعية)';
      notifyError(msg);
    } finally {
      setDeleting(false);
    }
  };

  const refresh = () => {
    setFetching(true);
    loadTree();
  };

  if (loading) return <PageLoader />;

  const breadcrumb = [
    { label: selectedSector?.name_ar, value: Boolean(selectedSector) },
    { label: selectedState?.name_ar, value: Boolean(selectedState) },
    { label: selectedEntry?.name_ar, value: Boolean(selectedEntry) },
    { label: selectedTerminal?.name_ar, value: Boolean(selectedTerminal) },
    { label: selectedStation?.name_ar, value: Boolean(selectedStation) },
  ].filter((b) => b.value);

  return (
    <Box>
      <DashboardHero
        eyebrow="Master Data"
        title="البيانات الأساسية والهيكل النوعي"
        subtitle="القطاعات والولايات ومنافذ الدخول والمنشآت والمحطات والأقسام والأعضاء"
        gradient="emerald"
        avatarLabel="ا"
        action={
          <AppButton startIcon={<RefreshIcon />} onClick={refresh} loading={fetching}>
            تحديث
          </AppButton>
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

      <Box component="section" ref={register('overview')} data-section="overview" sx={{ scrollMarginTop: '80px' }}>
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard label="القطاعات" value={counts.sectors} icon={<CategoryIcon />} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard label="الولايات" value={counts.states} icon={<LocationCityIcon />} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard label="منافذ الدخول" value={counts.entries} icon={<FlightLandIcon />} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard label="المنشآت" value={counts.terminals} icon={<FactoryIcon />} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard label="المحطات" value={counts.stations} icon={<HealthAndSafetyIcon />} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard label="الأقسام" value={counts.sections} icon={<GroupsIcon />} />
        </Grid>
      </Grid>
      </Box>

      <Box component="section" ref={register('sectors')} data-section="sectors" sx={{ scrollMarginTop: '80px' }}>
      {breadcrumb.length > 1 && (
        <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" sx={{ mb: 2 }}>
          <BookmarkIcon sx={{ fontSize: 18, color: 'primary.main' }} />
          {breadcrumb.map((b, i) => (
            <Chip
              key={`${b.label}-${i}`}
              label={b.label}
              size="small"
              color={i === breadcrumb.length - 1 ? 'primary' : 'default'}
              variant={i === breadcrumb.length - 1 ? 'filled' : 'outlined'}
            />
          ))}
        </Stack>
      )}

      {/* 1) القطاعات */}
      <HierarchyPanel
        meta={PANEL_META.sector}
        onAdd={() => openCreate('sector', {})}
        onSelect={selectSector}
        selectedId={selectedSectorId}
        items={(tree ?? []).map((s) => ({
          id: s.id,
          title: s.name_ar,
          subtitle: s.name_en || s.code,
          color: s.color,
          onClickEdit: () =>
            openEdit('sector', { id: s.id, code: s.code, name_ar: s.name_ar, name_en: s.name_en, color: s.color, description: s.description, order: s.order }),
          onClickDelete: () => askDelete('sector', s.id, s.name_ar),
        }))}
      />
      </Box>

      {selectedSector && (
        <Box component="section" ref={register('states')} data-section="states" sx={{ scrollMarginTop: '80px' }}>
        <HierarchyPanel
          meta={PANEL_META.state}
          onAdd={() => openCreate('state', { sector: selectedSector.id })}
          onSelect={selectState}
          selectedId={selectedStateId}
          items={selectedSector.states.map((st) => ({
            id: st.id,
            title: st.name_ar,
            subtitle: `${st.name_en || st.code} • ${st.entry_points.length} منفذ`,
onClickEdit: () =>
            openEdit('state', { id: st.id, code: st.code, name_ar: st.name_ar, name_en: st.name_en, sector: st.sector ?? '', description: st.description, order: st.order }),
            onClickDelete: () => askDelete('state', st.id, st.name_ar),
          }))}
        />
        </Box>
      )}

      {selectedState && (
        <Box component="section" ref={register('entries')} data-section="entries" sx={{ scrollMarginTop: '80px' }}>
        <HierarchyPanel
          meta={PANEL_META.entry}
          onAdd={() => openCreate('entry', { state: selectedState.id })}
          onSelect={selectEntry}
          selectedId={selectedEntryId}
          items={selectedState.entry_points.map((ep) => ({
            id: ep.id,
            title: ep.name_ar,
            subtitle: `${entryKindLabel(ep.kind)} • ${ep.terminals.length} منشأة`,
onClickEdit: () =>
            openEdit('entry', { id: ep.id, code: ep.code, name_ar: ep.name_ar, name_en: ep.name_en, kind: ep.kind, state: ep.state ?? '', location: ep.location, description: ep.description, order: ep.order }),
            onClickDelete: () => askDelete('entry', ep.id, ep.name_ar),
          }))}
        />
        </Box>
      )}

      {selectedEntry && (selectedEntry.terminals.length > 0 || selectedEntryId) && (
        <Box component="section" ref={register('terminals')} data-section="terminals" sx={{ scrollMarginTop: '80px' }}>
        <HierarchyPanel
          meta={PANEL_META.terminal}
          onAdd={() => openCreate('terminal', { entry_point: selectedEntry.id })}
          onSelect={selectTerminal}
          selectedId={selectedTerminalId}
          items={selectedEntry.terminals.map((t) => ({
            id: t.id,
            title: t.name_ar,
            subtitle: `${t.name_en || t.code} • ${t.stations.length} محطة`,
onClickEdit: () =>
            openEdit('terminal', { id: t.id, code: t.code, name_ar: t.name_ar, name_en: t.name_en, entry_point: t.entry_point ?? '', description: t.description, order: t.order }),
            onClickDelete: () => askDelete('terminal', t.id, t.name_ar),
          }))}
        />
        </Box>
      )}

      {stationList.length > 0 && (
        <Box component="section" ref={register('stations')} data-section="stations" sx={{ scrollMarginTop: '80px' }}>
        <HierarchyPanel
          meta={PANEL_META.station}
          onAdd={() =>
            openCreate('station', selectedTerminal ? { terminal: selectedTerminal.id } : { entry_point: selectedEntry!.id })
          }
          onSelect={selectStation}
          selectedId={selectedStationId}
          items={stationList.map((s) => ({
            id: s.id,
            title: s.name_ar,
            subtitle: `${s.location || s.code} • ${s.sections.length} قسم`,
            onClickEdit: () =>
              openEdit('station', { id: s.id, code: s.code, name_ar: s.name_ar, name_en: s.name_en, terminal: s.terminal ?? '', entry_point: s.entry_point ?? '', location: s.location, description: s.description, order: s.order }),
            onClickDelete: () => askDelete('station', s.id, s.name_ar),
          }))}
        />
        </Box>
      )}

      {selectedStation && (
        <Box component="section" ref={register('sections')} data-section="sections" sx={{ scrollMarginTop: '80px' }}>
        <HierarchyPanel
          meta={PANEL_META.section}
          onAdd={() => openCreate('section', { station: selectedStation.id })}
          items={selectedStation.sections.map((sec) => ({
            id: sec.id,
            title: sec.name_ar,
            subtitle: `${sec.name_en || sec.code} • ${sec.members.length} عضو`,
            members: sec.members,
            onClickEdit: () =>
              openEdit('section', { id: sec.id, code: sec.code, name_ar: sec.name_ar, name_en: sec.name_en, station: sec.station ?? '', description: sec.description, order: sec.order }),
            onClickDelete: () => askDelete('section', sec.id, sec.name_ar),
            onClickMembers: () => setSectionMembers(sec),
          }))}
        />
        </Box>
      )}
        </Grid>
      </Grid>

      <FormDialog open={form.open} onClose={handleCloseForm} onSubmit={submitForm}
        title={form.editing ? `تعديل ${ACTION_LABELS[form.kind]}` : `إضافة ${ACTION_LABELS[form.kind]}`}
        maxWidth="sm">
        {getFormFields(form.kind, options).map((f) =>
          f.type === 'select' ? (
            <FormSelect key={f.key} label={f.label} requiredMark={f.required} value={String(form.defaults[f.key] ?? '')}
              onChange={(v) => setForm((st) => ({ ...st, defaults: { ...st.defaults, [f.key]: v } }))}
              options={f.options ?? []} placeholder={f.required ? undefined : 'بدون'} />
          ) : (
            <FormTextField key={f.key} label={f.label} requiredMark={f.required}
              value={String(form.defaults[f.key] ?? '')}
              onChange={(e) => setForm((st) => ({ ...st, defaults: { ...st.defaults, [f.key]: e.target.value } }))} />
          ),
        )}
      </FormDialog>

      <MembersDialog section={sectionMembers} onClose={() => setSectionMembers(null)} onChanged={() => { setFetching(true); loadTree(); }} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="تأكيد الحذف"
        message={`هل أنت متأكد من حذف «${deleteTarget?.label}»؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel="حذف"
        loading={deleting}
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
      />
    </Box>
  );
};

/* ================== helpers ================== */

const entryKindLabel = (kind: string) =>
  ENTRY_KIND_OPTIONS.find((o) => o.value === kind)?.label ?? kind;

const CRUD = {
  sector: { create: createMasterSector, update: updateMasterSector, delete: deleteMasterSector },
  state: { create: createMasterState, update: updateMasterState, delete: deleteMasterState },
  entry: { create: createMasterEntryPoint, update: updateMasterEntryPoint, delete: deleteMasterEntryPoint },
  terminal: { create: createMasterTerminal, update: updateMasterTerminal, delete: deleteMasterTerminal },
  station: { create: createMasterStation, update: updateMasterStation, delete: deleteMasterStation },
  section: { create: createMasterSection, update: updateMasterSection, delete: deleteMasterSection },
};

interface FieldDef {
  key: string;
  label: string;
  type?: 'text' | 'select';
  required?: boolean;
  options?: { value: string; label: string }[];
}

interface OptionsLists {
  sectorOptions: { value: string; label: string }[];
  stateOptions: { value: string; label: string }[];
  entryOptions: { value: string; label: string }[];
  terminalOptions: { value: string; label: string }[];
  stationOptions: { value: string; label: string }[];
  sectionOptions: { value: string; label: string }[];
}

const getFormFields = (kind: EntityKind, o: OptionsLists): FieldDef[] => {
  switch (kind) {
    case 'sector':
      return [
        { key: 'code', label: 'الكود', required: true },
        { key: 'name_ar', label: 'الاسم بالعربية', required: true },
        { key: 'name_en', label: 'الاسم بالإنجليزية' },
        { key: 'color', label: 'اللون (hex)' },
        { key: 'description', label: 'الوصف' },
        { key: 'order', label: 'الترتيب' },
      ];
    case 'state':
      return [
        { key: 'code', label: 'الكود', required: true },
        { key: 'name_ar', label: 'الاسم بالعربية', required: true },
        { key: 'name_en', label: 'الاسم بالإنجليزية' },
        { key: 'sector', label: 'القطاع', type: 'select', required: true, options: o.sectorOptions },
        { key: 'description', label: 'الوصف' },
        { key: 'order', label: 'الترتيب' },
      ];
    case 'entry':
      return [
        { key: 'code', label: 'الكود', required: true },
        { key: 'name_ar', label: 'الاسم بالعربية', required: true },
        { key: 'name_en', label: 'الاسم بالإنجليزية' },
        { key: 'kind', label: 'نوع المنفذ', type: 'select', required: true, options: ENTRY_KIND_OPTIONS },
        { key: 'state', label: 'الولاية', type: 'select', required: true, options: o.stateOptions },
        { key: 'location', label: 'الموقع' },
        { key: 'description', label: 'الوصف' },
        { key: 'order', label: 'الترتيب' },
      ];
    case 'terminal':
      return [
        { key: 'code', label: 'الكود', required: true },
        { key: 'name_ar', label: 'الاسم بالعربية', required: true },
        { key: 'name_en', label: 'الاسم بالإنجليزية' },
        { key: 'entry_point', label: 'منفذ الدخول', type: 'select', required: true, options: o.entryOptions },
        { key: 'description', label: 'الوصف' },
        { key: 'order', label: 'الترتيب' },
      ];
    case 'station':
      return [
        { key: 'code', label: 'الكود', required: true },
        { key: 'name_ar', label: 'الاسم بالعربية', required: true },
        { key: 'name_en', label: 'الاسم بالإنجليزية' },
        { key: 'entry_point', label: 'منفذ الدخول (مباشر)', type: 'select', options: o.entryOptions },
        { key: 'terminal', label: 'المنشأة', type: 'select', options: o.terminalOptions },
        { key: 'location', label: 'الموقع' },
        { key: 'description', label: 'الوصف' },
        { key: 'order', label: 'الترتيب' },
      ];
    case 'section':
      return [
        { key: 'code', label: 'الكود', required: true },
        { key: 'name_ar', label: 'الاسم بالعربية', required: true },
        { key: 'name_en', label: 'الاسم بالإنجليزية' },
        { key: 'station', label: 'المحطة', type: 'select', required: true, options: o.stationOptions },
        { key: 'description', label: 'الوصف' },
        { key: 'order', label: 'الترتيب' },
      ];
    default:
      return [];
  }
};

/* ================== panels ================== */

interface HierarchyItem {
  id: string;
  title: string;
  subtitle: string;
  color?: string;
  members?: TreeMember[];
  onClickEdit?: () => void;
  onClickDelete?: () => void;
  onClickMembers?: () => void;
}

interface HierarchyPanelProps {
  meta: { title: string; add: string; icon: React.ReactNode; empty: string };
  onAdd?: () => void;
  onSelect?: (id: string) => void;
  selectedId?: string | null;
  items: HierarchyItem[];
}

const HierarchyPanel = ({ meta, onAdd, onSelect, selectedId, items }: HierarchyPanelProps) => (
  <Box
    sx={{
      mb: 2.5,
      p: 2,
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 2.5,
      bgcolor: 'background.paper',
    }}
  >
    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Box sx={{ color: 'primary.main', display: 'inline-flex' }}>{meta.icon}</Box>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {meta.title}
        </Typography>
      </Stack>
      {onAdd && (
        <AppButton size="small" startIcon={<AddIcon />} onClick={onAdd}>
          {meta.add}
        </AppButton>
      )}
    </Stack>
    {items.length === 0 ? (
      <EmptyState title={meta.empty} />
    ) : (
      <Grid container spacing={1.25}>
        {items.map((item) => (
          <Grid item xs={12} md={6} lg={4} key={item.id}>
            <ComponentCard item={item} selected={item.id === selectedId} onSelect={onSelect} />
          </Grid>
        ))}
      </Grid>
    )}
  </Box>
);

const ComponentCard = ({
  item,
  selected,
  onSelect,
}: {
  item: HierarchyItem;
  selected: boolean;
  onSelect?: (id: string) => void;
}) => (
  <Box
    onClick={onSelect ? () => onSelect(item.id) : undefined}
    sx={{
      position: 'relative',
      p: 1.5,
      borderRadius: 2,
      cursor: 'pointer',
      border: '1px solid',
      borderColor: selected ? 'primary.main' : 'divider',
      bgcolor: selected ? 'primary.50' : 'transparent',
      transition: 'all .15s ease',
      '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.50' },
      overflow: 'hidden',
    }}
  >
    {item.color && (
      <Box sx={{ position: 'absolute', top: 0, left: 0, width: 6, height: '100%', bgcolor: item.color, borderRadius: '0 4px 4px 0' }} />
    )}
    <Stack direction="row" alignItems="center" spacing={1}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body1" sx={{ fontWeight: 700, lineHeight: 1.35 }}>
          {item.title}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {item.subtitle}
        </Typography>
        {item.members && item.members.length > 0 && (
          <Stack direction="row" spacing={0.4} sx={{ mt: 0.5 }} alignItems="center">
            {item.members.slice(0, 4).map((m) => (
              <Tooltip key={m.id} title={`${m.user_name} — ${m.role_label}`}>
                <Avatar sx={{ width: 24, height: 24, fontSize: 11, bgcolor: 'primary.main' }}>
                  {(m.user_name || '؟').charAt(0)}
                </Avatar>
              </Tooltip>
            ))}
            {item.members.length > 4 && (
              <Typography variant="caption" color="text.secondary">
                +{item.members.length - 4}
              </Typography>
            )}
          </Stack>
        )}
      </Box>
      <Stack direction="row" alignItems="center" spacing={0}>
        {item.onClickMembers && (
          <Tooltip title="إدارة الأعضاء">
            <IconButton aria-label="الأعضاء" size="small" onClick={(e) => { e.stopPropagation(); item.onClickMembers?.(); }}>
              <GroupsIcon fontSize="small" color="primary" />
            </IconButton>
          </Tooltip>
        )}
        {item.onClickEdit && (
          <Tooltip title="تعديل">
            <IconButton aria-label="تعديل" size="small" onClick={(e) => { e.stopPropagation(); item.onClickEdit?.(); }}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {item.onClickDelete && (
          <Tooltip title="حذف">
            <IconButton aria-label="حذف" size="small" onClick={(e) => { e.stopPropagation(); item.onClickDelete?.(); }}>
              <DeleteIcon fontSize="small" color="error" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    </Stack>
  </Box>
);

/* ================== members dialog ================== */

const MembersDialog = ({
  section,
  onClose,
  onChanged,
}: {
  section: TreeSection | null;
  onClose: () => void;
  onChanged: () => void;
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [user, setUser] = useState('');
  const [role, setRole] = useState(MEMBER_ROLE_OPTIONS[0].value);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (section) {
      setUser('');
      setRole(MEMBER_ROLE_OPTIONS[0].value);
      getUsers({ page_size: 100 })
        .then((res) => setUsers(res.data.data.results ?? []))
        .catch(() => notifyError('تعذر تحميل المستخدمين'));
    }
  }, [section]);

  const addMember = async () => {
    if (!section || !user) return;
    setSaving(true);
    try {
      await createMasterMember({ user, section: section.id, role_label: role, is_active: true });
      notifySuccess('تمت إضافة العضو بنجاح');
      onChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? err?.response?.data?.message ?? 'تعذر إضافة العضو';
      notifyError(msg);
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async (member: TreeMember) => {
    setRemovingId(member.id);
    try {
      await deleteMasterMember(member.id);
      notifySuccess('تم حذف العضو بنجاح');
      onChanged();
    } catch {
      notifyError('تعذر حذف العضو');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <FormDialog
      open={Boolean(section)}
      onClose={onClose}
      title={section ? `أعضاء قسم: ${section.name_ar}` : ''}
      subtitle="الإدارة الكاملة لأعضاء القسم"
      icon={<GroupsIcon />}
      maxWidth="sm"
      onSubmit={addMember}
      submitLabel="إضافة العضو"
      submitDisabled={!user}
      loading={saving}
    >
      {section && section.members.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          لا يوجد أعضاء في هذا القسم بعد، أضف الأول أدناه.
        </Typography>
      )}
      {section?.members.map((m) => (
        <Stack key={m.id} direction="row" spacing={1} alignItems="center" justifyContent="space-between"
          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1, bgcolor: 'background.default' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Avatar sx={{ width: 32, height: 32, fontSize: 13, bgcolor: 'primary.main' }}>
              {(m.user_name || '؟').charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {m.user_name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {m.user_email} • {m.role_label}
              </Typography>
            </Box>
          </Stack>
          <IconButton aria-label="حذف" size="small" color="error" disabled={removingId === m.id} onClick={() => removeMember(m)}>
            {removingId === m.id ? <CircularProgress size={16} /> : <DeleteIcon fontSize="small" />}
          </IconButton>
        </Stack>
      ))}
      <Divider />
      <FormSelect
        label="المستخدم"
        requiredMark
        value={user}
        onChange={setUser}
        placeholder="اختر المستخدم"
        options={users.map((u) => ({ value: u.id, label: `${u.full_name} (${u.email})` }))}
      />
      <FormSelect
        label="الصلاحية داخل القسم"
        value={role}
        onChange={setRole}
        options={MEMBER_ROLE_OPTIONS}
      />
    </FormDialog>
  );
};

export default MasterDataPage;