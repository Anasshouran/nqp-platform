import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import WorkspacesIcon from '@mui/icons-material/Workspaces';
import MapIcon from '@mui/icons-material/Map';
import ApartmentIcon from '@mui/icons-material/Apartment';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import PlaceIcon from '@mui/icons-material/Place';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import GroupIcon from '@mui/icons-material/Group';
import { EmptyState } from '../../components/common';
import { DataTable, ConfirmDialog } from '../../components/ui';
import DashboardHero from '../../components/dashboard/DashboardHero';
import KpiCard from '../../components/dashboard/KpiCard';
import { useServerTable } from '../../hooks/useServerTable';
import {
  createAssignment,
  createDepartment,
  createPosition,
  createSector,
  createStation,
  deleteAssignment,
  deleteDepartment,
  deletePosition,
  deleteSector,
  deleteStation,
  getAssignments,
  getDepartments,
  getOrgHierarchy,
  getPositions,
  getSectors,
  getStations,
  updateAssignment,
  updateDepartment,
  updatePosition,
  updateSector,
  updateStation,
} from '../../api/endpoints/organization';
import type {
  Department,
  DepartmentInput,
  DepartmentNode,
  OrgAssignment,
  OrgAssignmentInput,
  OrgHierarchy,
  OrgPosition,
  OrgPositionInput,
  OrgSectorNode,
  OrgTreeNode,
  Sector,
  SectorInput,
  Station,
  StationInput,
} from '../../types/organization';
import { getUsers } from '../../api/endpoints/users';
import type { User } from '../../types/user';
import { formatDate } from '../../utils/formatters';
import { notifyError, notifySuccess } from '../../utils/toast';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';

const todayArabic = () =>
  new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const tabIcons = [<AccountTreeIcon />, <WorkspacesIcon />, <MapIcon />, <ApartmentIcon />, <PlaceIcon />, <AssignmentIndIcon />];

const SECTIONS = [
  { id: 'overview', label: 'نظرة عامة', icon: <WorkspacesIcon fontSize="small" /> },
  { id: 'hierarchy', label: 'الشجرة الهرمية', icon: <AccountTreeIcon fontSize="small" /> },
  { id: 'positions', label: 'المناصب', icon: <AssignmentIndIcon fontSize="small" /> },
  { id: 'sectors', label: 'القطاعات', icon: <MapIcon fontSize="small" /> },
  { id: 'departments', label: 'الأقسام', icon: <ApartmentIcon fontSize="small" /> },
  { id: 'stations', label: 'المحطات', icon: <PlaceIcon fontSize="small" /> },
  { id: 'assignments', label: 'التعيينات', icon: <GroupIcon fontSize="small" /> },
] as const;

interface PositionFormState {
  open: boolean;
  editing: OrgPosition | null;
  code: string;
  name_ar: string;
  name_en: string;
  level: number;
  parent: string;
  description: string;
  order: number;
}

interface SectorFormState {
  open: boolean;
  editing: Sector | null;
  code: string;
  name_ar: string;
  name_en: string;
  region: string;
  color: string;
  order: number;
}

interface DepartmentFormState {
  open: boolean;
  editing: Department | null;
  code: string;
  name_ar: string;
  name_en: string;
  sector: string;
  manager_position: string;
  order: number;
}

interface AssignmentFormState {
  open: boolean;
  editing: OrgAssignment | null;
  user: string;
  position: string;
  sector: string;
  department: string;
  station: string;
  is_primary: boolean;
  is_active: boolean;
  start_date: string;
  end_date: string;
}

interface StationFormState {
  open: boolean;
  editing: Station | null;
  code: string;
  name_ar: string;
  name_en: string;
  sector: string;
  department: string;
  location: string;
  description: string;
  order: number;
}

const emptyPosition: PositionFormState = {
  open: false, editing: null, code: '', name_ar: '', name_en: '', level: 1, parent: '', description: '', order: 0,
};
const emptySector: SectorFormState = {
  open: false, editing: null, code: '', name_ar: '', name_en: '', region: '', color: '#0a6b58', order: 0,
};
const emptyDepartment: DepartmentFormState = {
  open: false, editing: null, code: '', name_ar: '', name_en: '', sector: '', manager_position: '', order: 0,
};
const emptyAssignment: AssignmentFormState = {
  open: false, editing: null, user: '', position: '', sector: '', department: '', station: '', is_primary: false, is_active: true, start_date: '', end_date: '',
};
const emptyStation: StationFormState = {
  open: false, editing: null, code: '', name_ar: '', name_en: '', sector: '', department: '', location: '', description: '', order: 0,
};

const OrgStructurePage = () => {
  const [tab, setTab] = useState(0);
  const [hierarchy, setHierarchy] = useState<OrgHierarchy | null>(null);
  const [loading, setLoading] = useState(true);

  const { active, register, scrollTo } = useCommandSections(SECTIONS as unknown as CommandSectionDef[], [loading]);

const positions = useServerTable<OrgPosition>({ fetchData: getPositions });
  const sectors = useServerTable<Sector>({ fetchData: getSectors });
  const departments = useServerTable<Department>({ fetchData: getDepartments });
  const stations = useServerTable<Station>({ fetchData: getStations });
  const assignments = useServerTable<OrgAssignment>({ fetchData: getAssignments });

  const [positionForm, setPositionForm] = useState<PositionFormState>(emptyPosition);
  const [sectorForm, setSectorForm] = useState<SectorFormState>(emptySector);
  const [departmentForm, setDepartmentForm] = useState<DepartmentFormState>(emptyDepartment);
  const [stationForm, setStationForm] = useState<StationFormState>(emptyStation);
  const [assignmentForm, setAssignmentForm] = useState<AssignmentFormState>(emptyAssignment);
  const [allPositions, setAllPositions] = useState<OrgPosition[]>([]);
  const [allSectors, setAllSectors] = useState<Sector[]>([]);
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [allStations, setAllStations] = useState<Station[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: string; id: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadHierarchy = () => {
    setLoading(true);
    getOrgHierarchy()
      .then((r) => setHierarchy(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const loadReference = () => {
    getPositions({ page_size: 100 }).then((r) => setAllPositions(r.data.data.results)).catch(() => undefined);
    getSectors({ page_size: 100 }).then((r) => setAllSectors(r.data.data.results)).catch(() => undefined);
    getDepartments({ page_size: 100 }).then((r) => setAllDepartments(r.data.data.results)).catch(() => undefined);
    getStations({ page_size: 100 }).then((r) => setAllStations(r.data.data.results)).catch(() => undefined);
    getUsers({ page_size: 100 }).then((r) => setUsers(r.data.data.results)).catch(() => undefined);
  };

  useEffect(() => {
    loadHierarchy();
    loadReference();
  }, []);

  const refreshAll = () => {
    loadHierarchy();
    loadReference();
    positions.refresh();
    sectors.refresh();
    departments.refresh();
    stations.refresh();
    assignments.refresh();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { kind, id } = deleteTarget;
      if (kind === 'position') await deletePosition(id);
      else if (kind === 'sector') await deleteSector(id);
      else if (kind === 'department') await deleteDepartment(id);
      else if (kind === 'station') await deleteStation(id);
      else await deleteAssignment(id);
      notifySuccess('تم الحذف بنجاح');
      setDeleteTarget(null);
      refreshAll();
    } catch {
      notifyError('تعذر الحذف، قد يكون المورد مستخدماً');
    } finally {
      setDeleting(false);
    }
  };

  const renderPositionNode = (node: OrgTreeNode) => (
    <Box key={node.id} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 1 }}>
      <Box
        sx={{
          px: 3,
          py: 1.5,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'primary.main',
          bgcolor: 'primary.light',
          textAlign: 'center',
          minWidth: 220,
          boxShadow: '0 8px 20px rgba(10,107,88,0.12)',
        }}
      >
        <Typography sx={{ fontWeight: 700, color: 'primary.main' }}>{node.name_ar}</Typography>
        {node.people.length > 0 && (
          <Stack direction="row" spacing={0.5} justifyContent="center" sx={{ mt: 0.5 }}>
            {node.people.map((p) => (
              <Chip key={p} label={p} size="small" variant="outlined" color="primary" />
            ))}
          </Stack>
        )}
      </Box>
      {node.children.length > 0 && (
        <>
          <Box sx={{ width: 2, height: 24, bgcolor: 'primary.light' }} />
          <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
            {node.children.map(renderPositionNode)}
          </Box>
        </>
      )}
    </Box>
  );

  const renderSectorNode = (s: OrgSectorNode) => (
    <Card key={s.id} sx={{ border: '1px solid', borderColor: 'divider', minWidth: 260 }}>
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
          <Box
            sx={{
              width: 10, height: 10, borderRadius: '50%', bgcolor: s.color, flexShrink: 0,
            }}
          />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{s.name_ar}</Typography>
        </Stack>
        {s.people.map((p) => (
          <Chip key={p} label={p} size="small" variant="outlined" sx={{ mb: 0.5, mr: 0.5 }} />
        ))}
        <Divider sx={{ my: 1 }} />
        <Stack spacing={0.5}>
          {s.departments.map((d) => renderDepartmentNode(d, 0))}
        </Stack>
      </CardContent>
    </Card>
  );

  const renderDepartmentNode = (d: DepartmentNode, depth: number) => (
    <Box key={d.id} sx={{ fontSize: 13, mr: depth > 0 ? 1.5 : 0 }}>
      <Typography
        component="span"
        sx={{
          fontSize: 13,
          fontWeight: d.children && d.children.length > 0 ? 700 : 400,
          color: d.kind === 'ENTRY_GROUP' ? 'primary.main' : 'text.secondary',
        }}
      >
        {depth === 0 ? '•' : '└'} {d.name_ar}
      </Typography>
      {d.people && d.people.length > 0 && (
        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, mr: 1.5, flexWrap: 'wrap' }}>
          {d.people.map((p) => (
            <Chip key={p} label={p} size="small" variant="outlined" color="secondary" sx={{ fontSize: 11 }} />
          ))}
        </Stack>
      )}
      {d.positions && d.positions.length > 0 && (
        <Typography component="div" sx={{ fontSize: 11, color: 'text.disabled', mt: 0.25, mr: 1.5 }}>
          {d.positions.map((p) => p.name_ar).join(' • ')}
        </Typography>
      )}
      {d.stations && d.stations.length > 0 && (
        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, mr: 1.5, flexWrap: 'wrap' }}>
          {d.stations.map((s) => (
            <Chip
              key={s.id}
              icon={<PlaceIcon sx={{ fontSize: 14 }} />}
              label={s.name_ar}
              size="small"
              variant="outlined"
              color="primary"
              sx={{ fontSize: 11 }}
            />
          ))}
        </Stack>
      )}
      {d.children && d.children.length > 0 && (
        <Stack spacing={0.5} sx={{ mt: 0.5 }}>
          {d.children.map((c) => renderDepartmentNode(c, depth + 1))}
        </Stack>
      )}
    </Box>
  );

  const positionsFormSubmit = async () => {
    const payload: OrgPositionInput = {
      code: positionForm.code.trim(),
      name_ar: positionForm.name_ar.trim(),
      name_en: positionForm.name_en.trim(),
      level: positionForm.level,
      parent: positionForm.parent || null,
      description: positionForm.description.trim(),
      order: positionForm.order,
      is_active: true,
    };
    try {
      if (positionForm.editing) {
        await updatePosition(positionForm.editing.id, payload);
        notifySuccess('تم تحديث المنصب');
      } else {
        await createPosition(payload);
        notifySuccess('تم إنشاء المنصب');
      }
      setPositionForm(emptyPosition);
      refreshAll();
    } catch {
      notifyError('تعذر الحفظ');
    }
  };

  const sectorsFormSubmit = async () => {
    const payload: SectorInput = {
      code: sectorForm.code.trim(),
      name_ar: sectorForm.name_ar.trim(),
      name_en: sectorForm.name_en.trim(),
      region: sectorForm.region.trim(),
      color: sectorForm.color,
      order: sectorForm.order,
      is_active: true,
    };
    try {
      if (sectorForm.editing) {
        await updateSector(sectorForm.editing.id, payload);
        notifySuccess('تم تحديث القطاع');
      } else {
        await createSector(payload);
        notifySuccess('تم إنشاء القطاع');
      }
      setSectorForm(emptySector);
      refreshAll();
    } catch {
      notifyError('تعذر الحفظ');
    }
  };

  const departmentsFormSubmit = async () => {
    const payload: DepartmentInput = {
      code: departmentForm.code.trim(),
      name_ar: departmentForm.name_ar.trim(),
      name_en: departmentForm.name_en.trim(),
      sector: departmentForm.sector || null,
      manager_position: departmentForm.manager_position || null,
      order: departmentForm.order,
      is_active: true,
    };
    try {
      if (departmentForm.editing) {
        await updateDepartment(departmentForm.editing.id, payload);
        notifySuccess('تم تحديث القسم');
      } else {
        await createDepartment(payload);
        notifySuccess('تم إنشاء القسم');
      }
      setDepartmentForm(emptyDepartment);
      refreshAll();
    } catch {
      notifyError('تعذر الحفظ');
    }
  };

  const assignmentsFormSubmit = async () => {
    const payload: OrgAssignmentInput = {
      user: assignmentForm.user,
      position: assignmentForm.position || null,
      sector: assignmentForm.sector || null,
      department: assignmentForm.department || null,
      station: assignmentForm.station || null,
      is_primary: assignmentForm.is_primary,
      is_active: assignmentForm.is_active,
      start_date: assignmentForm.start_date || null,
      end_date: assignmentForm.end_date || null,
    };
    try {
      if (assignmentForm.editing) {
        await updateAssignment(assignmentForm.editing.id, payload);
        notifySuccess('تم تحديث التعيين');
      } else {
        await createAssignment(payload);
        notifySuccess('تم إنشاء التعيين');
      }
      setAssignmentForm(emptyAssignment);
      refreshAll();
    } catch {
      notifyError('تعذر الحفظ');
    }
  };

  const stationsFormSubmit = async () => {
    const payload: StationInput = {
      code: stationForm.code.trim(),
      name_ar: stationForm.name_ar.trim(),
      name_en: stationForm.name_en.trim(),
      sector: stationForm.sector || null,
      department: stationForm.department || null,
      location: stationForm.location.trim(),
      description: stationForm.description.trim(),
      order: stationForm.order,
      is_active: true,
    };
    try {
      if (stationForm.editing) {
        await updateStation(stationForm.editing.id, payload);
        notifySuccess('تم تحديث المحطة');
      } else {
        await createStation(payload);
        notifySuccess('تم إنشاء المحطة');
      }
      setStationForm(emptyStation);
      refreshAll();
    } catch {
      notifyError('تعذر الحفظ');
    }
  };

  const totalPositions = hierarchy?.positions?.length || 0;
  const totalSectors = hierarchy?.sectors?.length || 0;
  const totalDepartments = hierarchy?.sectors?.reduce((acc, s) => acc + s.departments.length, 0) || 0;
  const totalAssignments = assignments.count;

  const dialogFields = (title: string, children: React.ReactNode, onSubmit: () => void, onClose: () => void) => (
    <Box
      component="form"
      onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
      sx={{ mt: 2, display: 'grid', gap: 2 }}
    >
      <Typography variant="h6" sx={{ fontWeight: 700 }}>{title}</Typography>
      {children}
      <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1 }}>
        <Button onClick={onClose} color="inherit">إلغاء</Button>
        <Button type="submit" variant="contained">حفظ</Button>
      </Stack>
    </Box>
  );

  const inputSx = { '& .MuiInputBase-root': { borderRadius: 2.5 } };

  return (
    <Box>
      <DashboardHero
        title="الهيكل الإداري"
        subtitle="المناصب القيادية، القطاعات، والأقسام الرئيسة للمنصة القومية للحجر الصحي"
        eyebrow="الإدارة الاتحادية"
        gradient="ocean"
        avatarLabel="ا"
        action={<Button variant="contained" startIcon={<AddIcon />} onClick={() => setTab(0)}>الشجرة الهرمية</Button>}
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
            label="أقسام الهيكل"
          />
        </Grid>
        <Grid item xs={12} md={9.8} lg={10.2}>

      {/* KPI */}
      <Box component="section" ref={register('overview')} data-section="overview" sx={{ scrollMarginTop: '80px' }}>
        <Grid container spacing={1.5} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard icon={<WorkspacesIcon />} value={loading ? '…' : totalPositions} label="مناصب قيادية" accent="primary.main" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard icon={<MapIcon />} value={loading ? '…' : totalSectors} label="القطاعات" accent="info.main" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard icon={<ApartmentIcon />} value={loading ? '…' : totalDepartments} label="الأقسام" accent="success.main" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard icon={<AssignmentIndIcon />} value={totalAssignments} label="التعيينات" accent="warning.main" />
          </Grid>
        </Grid>
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3, '& .MuiTab-root': { fontWeight: 700, minHeight: 48 } }}
      >
        {['الشجرة الهرمية', 'المناصب', 'القطاعات', 'الأقسام', 'المحطات', 'التعيينات'].map((label, i) => (
          <Tab key={label} label={label} icon={tabIcons[i]} iconPosition="start" />
        ))}
      </Tabs>

      <Box component="section" ref={register('hierarchy')} data-section="hierarchy" sx={{ scrollMarginTop: '80px' }}>
      {tab === 0 && (
        <Box>
          {loading ? (
            <LinearProgress sx={{ mt: 2, borderRadius: 2 }} />
          ) : !hierarchy ? (
            <EmptyState title="لا توجد بيانات" description="تعذر تحميل الهيكل الإداري" />
          ) : (
            <Box>
              <Card sx={{ border: '1px solid', borderColor: 'divider', mb: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>المناصب القيادية</Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'center', pt: 2 }}>
                    {hierarchy.positions.length === 0 ? (
                      <EmptyState title="لا مناصب" description="أضف مناصب قيادية أولاً" />
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        {hierarchy.positions.map(renderPositionNode)}
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>القطاعات والأقسام</Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {hierarchy.sectors.length === 0 ? (
                    <EmptyState title="لا قطاعات" description="أضف قطاعات إدارية أولاً" />
                  ) : (
                    hierarchy.sectors.map(renderSectorNode)
                  )}
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      )}
      </Box>

      <Box component="section" ref={register('positions')} data-section="positions" sx={{ scrollMarginTop: '80px' }}>
      {tab === 1 && (
        <DataTable
          columns={[
            { key: 'code', label: 'الكود', render: (r) => <Chip label={r.code} size="small" color="primary" variant="outlined" /> },
            { key: 'name_ar', label: 'الاسم' },
            { key: 'level', label: 'المستوى' },
            { key: 'parent_name', label: 'المنصب الأعلى', render: (r) => r.parent_name || '—' },
            { key: 'assignments_count', label: 'المعيَّنون' },
          ]}
          rows={positions.rows}
          rowKey={(r) => r.id}
          count={positions.count}
          page={positions.page}
          rowsPerPage={positions.rowsPerPage}
          pageSizeOptions={positions.pageSizeOptions}
          loading={positions.loading}
          error={positions.error}
          searchInput={positions.searchInput}
          onSearchChange={positions.setSearchInput}
          onPageChange={positions.setPage}
          onRowsPerPageChange={positions.setRowsPerPage}
          onRefresh={positions.refresh}
          subtitle={`${positions.count} منصباً`}
          toolbar={
            <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setPositionForm(emptyPosition)}>
              منصب جديد
            </Button>
          }
          actions={(row) => (
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="تعديل">
                <IconButton aria-label="تعديل" size="small" color="primary" onClick={() => setPositionForm({
                  open: true, editing: row, code: row.code, name_ar: row.name_ar, name_en: row.name_en,
                  level: row.level, parent: row.parent || '', description: row.description, order: row.order,
                })}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="حذف">
                <IconButton aria-label="حذف" size="small" color="error" onClick={() => setDeleteTarget({ kind: 'position', id: row.id })}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          )}
        />
      )}
      </Box>

      <Box component="section" ref={register('sectors')} data-section="sectors" sx={{ scrollMarginTop: '80px' }}>
      {tab === 2 && (
        <DataTable
          columns={[
            { key: 'code', label: 'الكود', render: (r) => <Chip label={r.code} size="small" color="primary" variant="outlined" /> },
            { key: 'name_ar', label: 'الاسم' },
            { key: 'region', label: 'المنطقة' },
            { key: 'department_count', label: 'الأقسام' },
            { key: 'assignments_count', label: 'المعيَّنون' },
          ]}
          rows={sectors.rows}
          rowKey={(r) => r.id}
          count={sectors.count}
          page={sectors.page}
          rowsPerPage={sectors.rowsPerPage}
          pageSizeOptions={sectors.pageSizeOptions}
          loading={sectors.loading}
          error={sectors.error}
          searchInput={sectors.searchInput}
          onSearchChange={sectors.setSearchInput}
          onPageChange={sectors.setPage}
          onRowsPerPageChange={sectors.setRowsPerPage}
          onRefresh={sectors.refresh}
          subtitle={`${sectors.count} قطاعاً`}
          toolbar={
            <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setSectorForm(emptySector)}>
              قطاع جديد
            </Button>
          }
          actions={(row) => (
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="تعديل">
                <IconButton aria-label="تعديل" size="small" color="primary" onClick={() => setSectorForm({
                  open: true, editing: row, code: row.code, name_ar: row.name_ar, name_en: row.name_en,
                  region: row.region, color: row.color, order: row.order,
                })}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="حذف">
                <IconButton aria-label="حذف" size="small" color="error" onClick={() => setDeleteTarget({ kind: 'sector', id: row.id })}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          )}
        />
      )}
      </Box>

      <Box component="section" ref={register('departments')} data-section="departments" sx={{ scrollMarginTop: '80px' }}>
      {tab === 3 && (
        <DataTable
          columns={[
            { key: 'code', label: 'الكود', render: (r) => <Chip label={r.code} size="small" color="primary" variant="outlined" /> },
            { key: 'name_ar', label: 'الاسم' },
            { key: 'sector_name', label: 'القطاع', render: (r) => r.sector_name || '—' },
            { key: 'manager_name', label: 'المنصب المسؤول', render: (r) => r.manager_name || '—' },
            { key: 'assignments_count', label: 'المعيَّنون' },
          ]}
          rows={departments.rows}
          rowKey={(r) => r.id}
          count={departments.count}
          page={departments.page}
          rowsPerPage={departments.rowsPerPage}
          pageSizeOptions={departments.pageSizeOptions}
          loading={departments.loading}
          error={departments.error}
          searchInput={departments.searchInput}
          onSearchChange={departments.setSearchInput}
          onPageChange={departments.setPage}
          onRowsPerPageChange={departments.setRowsPerPage}
          onRefresh={departments.refresh}
          subtitle={`${departments.count} قسماً`}
          toolbar={
            <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setDepartmentForm(emptyDepartment)}>
              قسم جديد
            </Button>
          }
          actions={(row) => (
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="تعديل">
                <IconButton aria-label="تعديل" size="small" color="primary" onClick={() => setDepartmentForm({
                  open: true, editing: row, code: row.code, name_ar: row.name_ar, name_en: row.name_en,
                  sector: row.sector || '', manager_position: row.manager_position || '', order: row.order,
                })}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="حذف">
                <IconButton aria-label="حذف" size="small" color="error" onClick={() => setDeleteTarget({ kind: 'department', id: row.id })}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          )}
        />
      )}
      </Box>

      <Box component="section" ref={register('stations')} data-section="stations" sx={{ scrollMarginTop: '80px' }}>
      {tab === 4 && (
        <DataTable
          columns={[
            { key: 'code', label: 'الكود', render: (r) => <Chip label={r.code} size="small" color="primary" variant="outlined" /> },
            { key: 'name_ar', label: 'الاسم' },
            { key: 'sector_name', label: 'القطاع', render: (r) => r.sector_name || '—' },
            { key: 'department_name', label: 'القسم', render: (r) => r.department_name || '—' },
            { key: 'location', label: 'الموقع', render: (r) => r.location || '—' },
            { key: 'assignments_count', label: 'المعيَّنون' },
          ]}
          rows={stations.rows}
          rowKey={(r) => r.id}
          count={stations.count}
          page={stations.page}
          rowsPerPage={stations.rowsPerPage}
          pageSizeOptions={stations.pageSizeOptions}
          loading={stations.loading}
          error={stations.error}
          searchInput={stations.searchInput}
          onSearchChange={stations.setSearchInput}
          onPageChange={stations.setPage}
          onRowsPerPageChange={stations.setRowsPerPage}
          onRefresh={stations.refresh}
          subtitle={`${stations.count} محطة`}
          toolbar={
            <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setStationForm(emptyStation)}>
              محطة جديدة
            </Button>
          }
          actions={(row) => (
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="تعديل">
                <IconButton aria-label="تعديل" size="small" color="primary" onClick={() => setStationForm({
                  open: true, editing: row, code: row.code, name_ar: row.name_ar, name_en: row.name_en,
                  sector: row.sector || '', department: row.department || '', location: row.location,
                  description: row.description, order: row.order,
                })}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="حذف">
                <IconButton aria-label="حذف" size="small" color="error" onClick={() => setDeleteTarget({ kind: 'station', id: row.id })}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          )}
        />
      )}
      </Box>

      <Box component="section" ref={register('assignments')} data-section="assignments" sx={{ scrollMarginTop: '80px' }}>
      {tab === 5 && (
        <DataTable
          columns={[
            { key: 'user_name', label: 'الموظف' },
            { key: 'position_name', label: 'المنصب', render: (r) => r.position_name || '—' },
            { key: 'sector_name', label: 'القطاع', render: (r) => r.sector_name || '—' },
            { key: 'department_name', label: 'القسم', render: (r) => r.department_name || '—' },
            { key: 'station_name', label: 'المحطة', render: (r) => r.station_name || '—' },
            { key: 'is_primary', label: 'أساسي', render: (r) => (r.is_primary ? <Chip label="أساسي" size="small" color="success" /> : <Chip label="ثانوي" size="small" color="default" />) },
            { key: 'start_date', label: 'البداية', render: (r) => (r.start_date ? formatDate(r.start_date) : '—') },
          ]}
          rows={assignments.rows}
          rowKey={(r) => r.id}
          count={assignments.count}
          page={assignments.page}
          rowsPerPage={assignments.rowsPerPage}
          pageSizeOptions={assignments.pageSizeOptions}
          loading={assignments.loading}
          error={assignments.error}
          searchInput={assignments.searchInput}
          onSearchChange={assignments.setSearchInput}
          onPageChange={assignments.setPage}
          onRowsPerPageChange={assignments.setRowsPerPage}
          onRefresh={assignments.refresh}
          subtitle={`${assignments.count} تعييناً`}
          toolbar={
            <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setAssignmentForm(emptyAssignment)}>
              تعيين جديد
            </Button>
          }
          actions={(row) => (
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="تعديل">
                <IconButton aria-label="تعديل" size="small" color="primary" onClick={() => setAssignmentForm({
                  open: true, editing: row, user: row.user, position: row.position || '',
                  sector: row.sector || '', department: row.department || '', station: row.station || '',
                  is_primary: row.is_primary, is_active: row.is_active,
                  start_date: row.start_date || '', end_date: row.end_date || '',
                })}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="حذف">
                <IconButton aria-label="حذف" size="small" color="error" onClick={() => setDeleteTarget({ kind: 'assignment', id: row.id })}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          )}
        />
      )}
      </Box>

        </Grid>
      </Grid>

      {positionForm.open && (
        <Box component="form" onSubmit={(e) => { e.preventDefault(); positionsFormSubmit(); }}>
          {dialogFields(
            positionForm.editing ? 'تعديل منصب قيادي' : 'منصب قيادي جديد',
            <>
              <Stack direction="row" spacing={1}>
                <TextField name="code" label="الكود" value={positionForm.code} onChange={(e) => setPositionForm({ ...positionForm, code: e.target.value })} sx={inputSx} />
                <TextField name="name_ar" label="الاسم بالعربية" value={positionForm.name_ar} onChange={(e) => setPositionForm({ ...positionForm, name_ar: e.target.value })} sx={inputSx} />
              </Stack>
              <TextField name="name_en" label="الاسم بالإنجليزية" value={positionForm.name_en} onChange={(e) => setPositionForm({ ...positionForm, name_en: e.target.value })} sx={inputSx} />
              <TextField name="description" label="الوصف" value={positionForm.description} onChange={(e) => setPositionForm({ ...positionForm, description: e.target.value })} multiline minRows={2} sx={inputSx} />
            </>,
            positionsFormSubmit,
            () => setPositionForm(emptyPosition)
          )}
        </Box>
      )}

      {sectorForm.open && (
        <Box component="form" onSubmit={(e) => { e.preventDefault(); sectorsFormSubmit(); }}>
          {dialogFields(
            sectorForm.editing ? 'تعديل قطاع' : 'قطاع جديد',
            <>
              <Stack direction="row" spacing={1}>
                <TextField name="code" label="الكود" value={sectorForm.code} onChange={(e) => setSectorForm({ ...sectorForm, code: e.target.value })} sx={inputSx} />
                <TextField name="name_ar" label="الاسم بالعربية" value={sectorForm.name_ar} onChange={(e) => setSectorForm({ ...sectorForm, name_ar: e.target.value })} sx={inputSx} />
              </Stack>
              <Stack direction="row" spacing={1}>
                <TextField name="region" label="المنطقة" value={sectorForm.region} onChange={(e) => setSectorForm({ ...sectorForm, region: e.target.value })} sx={inputSx} />
                <TextField name="color" label="اللون" value={sectorForm.color} onChange={(e) => setSectorForm({ ...sectorForm, color: e.target.value })} sx={inputSx} />
              </Stack>
            </>,
            sectorsFormSubmit,
            () => setSectorForm(emptySector)
          )}
        </Box>
      )}

      {departmentForm.open && (
        <Box component="form" onSubmit={(e) => { e.preventDefault(); departmentsFormSubmit(); }}>
          {dialogFields(
            departmentForm.editing ? 'تعديل قسم' : 'قسم جديد',
            <>
              <Stack direction="row" spacing={1}>
                <TextField name="code" label="الكود" value={departmentForm.code} onChange={(e) => setDepartmentForm({ ...departmentForm, code: e.target.value })} sx={inputSx} />
                <TextField name="name_ar" label="الاسم بالعربية" value={departmentForm.name_ar} onChange={(e) => setDepartmentForm({ ...departmentForm, name_ar: e.target.value })} sx={inputSx} />
              </Stack>
              <TextField name="name_en" label="الاسم بالإنجليزية" value={departmentForm.name_en} onChange={(e) => setDepartmentForm({ ...departmentForm, name_en: e.target.value })} sx={inputSx} />
              <TextField name="sector" label="القطاع (ID)" value={departmentForm.sector} onChange={(e) => setDepartmentForm({ ...departmentForm, sector: e.target.value })} sx={inputSx} />
            </>,
            departmentsFormSubmit,
            () => setDepartmentForm(emptyDepartment)
          )}
        </Box>
      )}

      {assignmentForm.open && (
        <Box component="form" onSubmit={(e) => { e.preventDefault(); assignmentsFormSubmit(); }}>
          {dialogFields(
            assignmentForm.editing ? 'تعديل تعيين' : 'تعيين جديد',
            <>
              <TextField
                select
                name="user"
                label="الموظف"
                value={assignmentForm.user}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, user: e.target.value })}
                sx={inputSx}
              >
                {users.map((u) => (
                  <MenuItem key={u.id} value={u.id}>{u.full_name} ({u.email})</MenuItem>
                ))}
              </TextField>
              <TextField
                select
                name="position"
                label="المنصب"
                value={assignmentForm.position}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, position: e.target.value })}
                sx={inputSx}
              >
                <MenuItem value="">—</MenuItem>
                {allPositions.map((p) => (
                  <MenuItem key={p.id} value={p.id}>{p.name_ar}</MenuItem>
                ))}
              </TextField>
              <TextField
                select
                name="sector"
                label="القطاع"
                value={assignmentForm.sector}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, sector: e.target.value })}
                sx={inputSx}
              >
                <MenuItem value="">—</MenuItem>
                {allSectors.map((s) => (
                  <MenuItem key={s.id} value={s.id}>{s.name_ar}</MenuItem>
                ))}
              </TextField>
              <TextField
                select
                name="department"
                label="القسم"
                value={assignmentForm.department}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, department: e.target.value })}
                sx={inputSx}
              >
                <MenuItem value="">—</MenuItem>
                {allDepartments.map((d) => (
                  <MenuItem key={d.id} value={d.id}>{d.name_ar}</MenuItem>
                ))}
              </TextField>
              <TextField
                select
                name="station"
                label="المحطة"
                value={assignmentForm.station}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, station: e.target.value })}
                sx={inputSx}
              >
                <MenuItem value="">—</MenuItem>
                {allStations.map((s) => (
                  <MenuItem key={s.id} value={s.id}>{s.name_ar}{s.sector_name ? ` (${s.sector_name})` : ''}</MenuItem>
                ))}
              </TextField>
              <Stack direction="row" spacing={1}>
                <TextField
                  name="start_date"
                  label="تاريخ البداية"
                  type="date"
                  value={assignmentForm.start_date}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, start_date: e.target.value })}
                  sx={inputSx}
                />
                <TextField
                  name="end_date"
                  label="تاريخ النهاية"
                  type="date"
                  value={assignmentForm.end_date}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, end_date: e.target.value })}
                  sx={inputSx}
                />
              </Stack>
              <Stack direction="row" spacing={2}>
                <FormControlLabel
                  control={<Checkbox checked={assignmentForm.is_primary} onChange={(e) => setAssignmentForm({ ...assignmentForm, is_primary: e.target.checked })} />}
                  label="تعيين أساسي"
                />
                <FormControlLabel
                  control={<Checkbox checked={assignmentForm.is_active} onChange={(e) => setAssignmentForm({ ...assignmentForm, is_active: e.target.checked })} />}
                  label="نشط"
                />
              </Stack>
            </>,
            assignmentsFormSubmit,
            () => setAssignmentForm(emptyAssignment)
          )}
        </Box>
      )}

      {stationForm.open && (
        <Box component="form" onSubmit={(e) => { e.preventDefault(); stationsFormSubmit(); }}>
          {dialogFields(
            stationForm.editing ? 'تعديل محطة' : 'محطة جديدة',
            <>
              <Stack direction="row" spacing={1}>
                <TextField name="code" label="الكود" value={stationForm.code} onChange={(e) => setStationForm({ ...stationForm, code: e.target.value })} sx={inputSx} />
                <TextField name="name_ar" label="الاسم بالعربية" value={stationForm.name_ar} onChange={(e) => setStationForm({ ...stationForm, name_ar: e.target.value })} sx={inputSx} />
              </Stack>
              <TextField name="name_en" label="الاسم بالإنجليزية" value={stationForm.name_en} onChange={(e) => setStationForm({ ...stationForm, name_en: e.target.value })} sx={inputSx} />
              <TextField name="location" label="الموقع" value={stationForm.location} onChange={(e) => setStationForm({ ...stationForm, location: e.target.value })} sx={inputSx} />
              <TextField name="description" label="الوصف" value={stationForm.description} onChange={(e) => setStationForm({ ...stationForm, description: e.target.value })} multiline minRows={2} sx={inputSx} />
              <TextField
                select
                name="department"
                label="القسم"
                value={stationForm.department}
                onChange={(e) => setStationForm({ ...stationForm, department: e.target.value })}
                sx={inputSx}
              >
                <MenuItem value="">—</MenuItem>
                {allDepartments.map((d) => (
                  <MenuItem key={d.id} value={d.id}>{d.name_ar}</MenuItem>
                ))}
              </TextField>
              <TextField
                select
                name="sector"
                label="القطاع"
                value={stationForm.sector}
                onChange={(e) => setStationForm({ ...stationForm, sector: e.target.value })}
                sx={inputSx}
              >
                <MenuItem value="">—</MenuItem>
                {allSectors.map((s) => (
                  <MenuItem key={s.id} value={s.id}>{s.name_ar}</MenuItem>
                ))}
              </TextField>
            </>,
            stationsFormSubmit,
            () => setStationForm(emptyStation)
          )}
        </Box>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="تأكيد الحذف"
        message="هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع."
        confirmLabel="حذف"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </Box>
  );
};

export default OrgStructurePage;
