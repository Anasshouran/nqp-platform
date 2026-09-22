import { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import BadgeIcon from '@mui/icons-material/Badge';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import { listRoleAssignments, createRoleAssignment, deleteRoleAssignment } from '../../api/endpoints/roleAssignments';
import { getRoles } from '../../api/endpoints/users';
import { getSectors, getDepartments, getStations, getAssignments, createAssignment, deleteAssignment } from '../../api/endpoints/organization';
import { getMasterEntryPoints } from '../../api/endpoints/masterdata';
import { SCOPE_TYPES } from '../../types/user';
import { scopeType } from '../../utils/status';
import { notifySuccess } from '../../utils/toast';
import type { RoleAssignment, RoleAssignmentInput, Role, ScopeType, User } from '../../types/user';
import type { OrgAssignment, OrgAssignmentInput, Sector, Department, Station } from '../../types/organization';
import type { MasterEntryPoint } from '../../types/masterdata';

interface Props {
  open: boolean;
  user: User | null;
  onClose: () => void;
  onSaved: () => void;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

const UserAssignmentsDialog = ({ open, user, onClose, onSaved }: Props) => {
  const [tab, setTab] = useState(0);
  const [roles, setRoles] = useState<Role[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [entryPoints, setEntryPoints] = useState<MasterEntryPoint[]>([]);

  const [roleAssignments, setRoleAssignments] = useState<RoleAssignment[]>([]);
  const [orgAssignments, setOrgAssignments] = useState<OrgAssignment[]>([]);

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [scopeTypeVal, setScopeTypeVal] = useState<ScopeType>('GLOBAL');
  const [scopeId, setScopeId] = useState('');
  const [showRoleForm, setShowRoleForm] = useState(false);

  const [orgSector, setOrgSector] = useState<Sector | null>(null);
  const [orgDepartment, setOrgDepartment] = useState<Department | null>(null);
  const [orgStation, setOrgStation] = useState<Station | null>(null);
  const [orgEntryPoint, setOrgEntryPoint] = useState<MasterEntryPoint | null>(null);
  const [isPrimary, setIsPrimary] = useState(true);
  const [startDate, setStartDate] = useState(todayStr());
  const [showOrgForm, setShowOrgForm] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const safeUser = user as User | null;
  const userId = safeUser?.id ?? null;

  const loadAssignments = useCallback(() => {
    if (!userId) return;
    listRoleAssignments({ user: userId, page_size: 200 })
      .then((r) => setRoleAssignments(r.data.data.results || []))
      .catch(() => undefined);
    getAssignments({ user: userId, page_size: 200 })
      .then((r) => setOrgAssignments(r.data.data.results || []))
      .catch(() => undefined);
  }, [userId]);

  useEffect(() => {
    if (!open || !user) return;
    setError(null);
    loadAssignments();
    getRoles().then((r) => setRoles(Array.isArray(r.data.data) ? r.data.data : [])).catch(() => setRoles([]));
    getSectors({ page_size: 500 }).then((r) => setSectors(r.data.data.results || [])).catch(() => undefined);
    getDepartments({ page_size: 500 }).then((r) => setDepartments(r.data.data.results || [])).catch(() => undefined);
    getStations({ page_size: 500 }).then((r) => setStations(r.data.data.results || [])).catch(() => undefined);
    getMasterEntryPoints({ page_size: 500 }).then((r) => setEntryPoints(r.data.data.results || [])).catch(() => undefined);
  }, [open, user, loadAssignments]);

  const filteredEntryPoints = orgSector
    ? entryPoints.filter((ep) => ep.state === orgSector.code || ep.state === orgSector.name_en)
    : entryPoints;

  const handleAddRole = async () => {
    if (!selectedRole || !userId) {
      setError('اختر الدور');
      return;
    }
    setSubmitting(true);
    setError(null);
    const payload: RoleAssignmentInput = {
      user: userId,
      role: selectedRole.code,
      scope_type: scopeTypeVal,
      scope_id: scopeId || null,
      start_date: startDate || null,
      is_active: true,
    };
    try {
      await createRoleAssignment(payload);
      notifySuccess('تم إضافة تعيين الدور بنجاح');
      setShowRoleForm(false);
      setSelectedRole(null);
      setScopeId('');
      loadAssignments();
      onSaved();
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string; detail?: string } } })?.response?.data;
      setError(data?.message || data?.detail || 'حدث خطأ أثناء الحفظ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddOrg = async () => {
    if (!userId) {
      setError('اختر قطاعاً أو قسماً أو محطة أو نقطة دخول');
      return;
    }
    if (!orgSector && !orgDepartment && !orgStation && !orgEntryPoint) {
      setError('اختر قطاعاً أو قسماً أو محطة أو نقطة دخول');
      return;
    }
    setSubmitting(true);
    setError(null);
    const payload: OrgAssignmentInput = {
      user: userId,
      sector: orgSector?.id ?? null,
      department: orgDepartment?.id ?? null,
      station: orgStation?.id ?? null,
      entry_point: orgEntryPoint?.id ?? null,
      is_primary: isPrimary,
      start_date: startDate || null,
      is_active: true,
    };
    try {
      await createAssignment(payload);
      notifySuccess('تم إضافة التعيين الهيكلي بنجاح');
      setShowOrgForm(false);
      setOrgSector(null);
      setOrgDepartment(null);
      setOrgStation(null);
      setOrgEntryPoint(null);
      loadAssignments();
      onSaved();
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string; detail?: string } } })?.response?.data;
      setError(data?.message || data?.detail || 'حدث خطأ أثناء الحفظ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <Box
        className="gradient-shift"
        sx={{
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          background: 'linear-gradient(120deg, #0a6b58, #0e8a72, #12a585)',
          px: 3,
          py: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Box sx={{ width: 40, height: 40, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: 'rgba(255,255,255,0.16)', color: '#fff', flexShrink: 0 }}>
          <AssignmentIndIcon />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff' }}>
            تعيينات {safeUser?.full_name || ''}
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)' }}>
            الأدوار والنطاقات + التعيينات الهيكلية
          </Typography>
        </Box>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, pt: 1 }} variant="fullWidth">
        <Tab icon={<AssignmentIndIcon />} label="تعيينات الأدوار" iconPosition="start" />
        <Tab icon={<BadgeIcon />} label="التعيينات الهيكلية" iconPosition="start" />
      </Tabs>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {tab === 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
              الأدوار المعيّنة ({roleAssignments.length})
            </Typography>
            {roleAssignments.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                لا توجد تعيينات أدوار بعد.
              </Typography>
            )}
            <Stack spacing={1} sx={{ mb: 2 }}>
              {roleAssignments.map((ra) => (
                <Stack key={ra.id} direction="row" alignItems="center" spacing={1} sx={{ bgcolor: 'background.paper', p: 1, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                  <Chip label={ra.role_name} color="primary" size="small" />
                  <Chip label={ra.scope_type ? scopeType[ra.scope_type] || ra.scope_type : 'عام'} size="small" variant="outlined" />
                  {!ra.is_active && <Chip label="غير نشط" size="small" color="default" />}
                  <Box sx={{ flex: 1 }} />
                  <Tooltip title="حذف">
                    <IconButton size="small" color="error" onClick={() => deleteRoleAssignment(ra.id).then(() => { loadAssignments(); onSaved(); }).catch(() => setError('تعذر الحذف'))}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              ))}
            </Stack>

            {!showRoleForm ? (
              <Button startIcon={<AddCircleIcon />} variant="outlined" onClick={() => { setShowRoleForm(true); setError(null); }}>
                إضافة تعيين دور
              </Button>
            ) : (
              <Box sx={{ display: 'grid', gap: 2, mt: 1 }}>
                <Autocomplete
                  options={roles}
                  getOptionLabel={(opt) => `${opt.name_ar || opt.name} (${opt.code})`}
                  isOptionEqualToValue={(opt, val) => opt.id === val.id}
                  value={selectedRole}
                  onChange={(_, v) => {
                    setSelectedRole(v);
                    if (v?.default_scope) setScopeTypeVal(v.default_scope as ScopeType);
                  }}
                  renderInput={(params) => <TextField {...params} label="الدور" fullWidth />}
                />
                <TextField select label="النطاق" value={scopeTypeVal} onChange={(e) => setScopeTypeVal(e.target.value as ScopeType)} fullWidth>
                  {SCOPE_TYPES.map((s) => (
                    <MenuItem key={s} value={s}>{scopeType[s] || s}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="معرف النطاق (scope ID)"
                  value={scopeId}
                  onChange={(e) => setScopeId(e.target.value)}
                  fullWidth
                  placeholder="UUID — اختياري"
                  disabled={scopeTypeVal === 'GLOBAL'}
                />
                <TextField label="تاريخ البداية" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button onClick={() => setShowRoleForm(false)} color="inherit">إلغاء</Button>
                  <Button variant="contained" onClick={handleAddRole} disabled={submitting}>
                    {submitting ? <CircularProgress size={20} color="inherit" /> : 'حفظ'}
                  </Button>
                </Stack>
              </Box>
            )}
          </Box>
        )}

        {tab === 1 && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
              التعيينات الهيكلية ({orgAssignments.length})
            </Typography>
            {orgAssignments.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                لا توجد تعيينات هيكلية بعد.
              </Typography>
            )}
            <Stack spacing={1} sx={{ mb: 2 }}>
              {orgAssignments.map((oa) => (
                <Stack key={oa.id} direction="row" alignItems="center" spacing={1} sx={{ bgcolor: 'background.paper', p: 1, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                  {oa.position_name && <Chip label={oa.position_name} color="primary" size="small" />}
                  {oa.sector_name && <Chip label={oa.sector_name} size="small" variant="outlined" />}
                  {oa.department_name && <Chip label={oa.department_name} size="small" variant="outlined" />}
                  {oa.station_name && <Chip label={oa.station_name} size="small" variant="outlined" />}
                  {oa.entry_point_name && <Chip label={oa.entry_point_name} size="small" color="info" variant="outlined" />}
                  {oa.is_primary && <Chip label="أساسي" size="small" color="success" />}
                  {!oa.is_active && <Chip label="غير نشط" size="small" />}
                  <Box sx={{ flex: 1 }} />
                  <Tooltip title="حذف">
                    <IconButton size="small" color="error" onClick={() => deleteAssignment(oa.id).then(() => { loadAssignments(); onSaved(); }).catch(() => setError('تعذر الحذف'))}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              ))}
            </Stack>

            {!showOrgForm ? (
              <Button startIcon={<AddCircleIcon />} variant="outlined" onClick={() => { setShowOrgForm(true); setError(null); }}>
                إضافة تعيين هيكلي
              </Button>
            ) : (
              <Box sx={{ display: 'grid', gap: 2, mt: 1 }}>
                <Autocomplete
                  options={sectors}
                  getOptionLabel={(opt) => opt.name_ar}
                  isOptionEqualToValue={(opt, val) => opt.id === val.id}
                  value={orgSector}
                  onChange={(_, v) => { setOrgSector(v); setOrgEntryPoint(null); }}
                  renderInput={(params) => <TextField {...params} label="القطاع" fullWidth />}
                />
                <Autocomplete
                  options={departments}
                  getOptionLabel={(opt) => opt.name_ar}
                  isOptionEqualToValue={(opt, val) => opt.id === val.id}
                  value={orgDepartment}
                  onChange={(_, v) => setOrgDepartment(v)}
                  renderInput={(params) => <TextField {...params} label="القسم" fullWidth />}
                />
                <Autocomplete
                  options={stations}
                  getOptionLabel={(opt) => opt.name_ar}
                  isOptionEqualToValue={(opt, val) => opt.id === val.id}
                  value={orgStation}
                  onChange={(_, v) => setOrgStation(v)}
                  renderInput={(params) => <TextField {...params} label="المحطة" fullWidth />}
                />
                <Autocomplete
                  options={filteredEntryPoints}
                  getOptionLabel={(opt) => `${opt.name_ar} (${opt.code})`}
                  isOptionEqualToValue={(opt, val) => opt.id === val.id}
                  value={orgEntryPoint}
                  onChange={(_, v) => setOrgEntryPoint(v)}
                  renderInput={(params) => <TextField {...params} label="نقطة الدخول" fullWidth />}
                />
                <FormControlLabel
                  control={<Switch checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} />}
                  label="التعيين الأساسي"
                />
                <TextField label="تاريخ البداية" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button onClick={() => setShowOrgForm(false)} color="inherit">إلغاء</Button>
                  <Button variant="contained" onClick={handleAddOrg} disabled={submitting}>
                    {submitting ? <CircularProgress size={20} color="inherit" /> : 'حفظ'}
                  </Button>
                </Stack>
              </Box>
            )}
          </Box>
        )}

        <Divider sx={{ my: 1 }} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إغلاق</Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserAssignmentsDialog;
