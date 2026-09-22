import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import InputAdornment from '@mui/material/InputAdornment';
import EditIcon from '@mui/icons-material/Edit';
import { createRoleAssignment, updateRoleAssignment } from '../../api/endpoints/roleAssignments';
import { getRoles, getUsers } from '../../api/endpoints/users';
import { SCOPE_TYPES } from '../../types/user';
import { scopeType } from '../../utils/status';
import { notifySuccess } from '../../utils/toast';
import type { RoleAssignment, RoleAssignmentInput, Role, User, ScopeType } from '../../types/user';

interface Props {
  open: boolean;
  assignment: RoleAssignment | null;
  defaultUserId?: string | null;
  onClose: () => void;
  onSaved: () => void;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

const RoleAssignmentFormDialog = ({ open, assignment, defaultUserId, onClose, onSaved }: Props) => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [scopeTypeVal, setScopeTypeVal] = useState<ScopeType>('GLOBAL');
  const [scopeId, setScopeId] = useState('');
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    Promise.all([
      getUsers({ page_size: 500 }).then((r) => setUsers(r.data.data.results)),
      getRoles().then((r) => {
        const data = Array.isArray(r.data.data) ? r.data.data : [];
        setRoles(data);
      }),
    ]).catch(() => undefined);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (assignment) {
      setSelectedUser(users.find((u) => u.id === assignment.user) || null);
      setSelectedRole(roles.find((r) => r.code === assignment.role_code || r.id === assignment.role) || null);
      setScopeTypeVal((assignment.scope_type as ScopeType) || 'GLOBAL');
      setScopeId(assignment.scope_id || '');
      setStartDate(assignment.start_date || todayStr());
      setEndDate(assignment.end_date || '');
      setIsActive(assignment.is_active);
    } else {
      setSelectedUser(defaultUserId ? users.find((u) => u.id === defaultUserId) || null : null);
      setSelectedRole(null);
      setScopeTypeVal('GLOBAL');
      setScopeId('');
      setStartDate(todayStr());
      setEndDate('');
      setIsActive(true);
    }
  }, [open, assignment, users, roles, defaultUserId]);

  const handleSubmit = async () => {
    if (!selectedUser || !selectedRole) {
      setError('يجب اختيار المستخدم والدور');
      return;
    }
    setSubmitting(true);
    setError(null);
    const payload: RoleAssignmentInput = {
      user: selectedUser.id,
      role: selectedRole.code,
      scope_type: scopeTypeVal,
      scope_id: scopeId || null,
      start_date: startDate || null,
      end_date: endDate || null,
      is_active: isActive,
    };
    try {
      if (assignment) {
        await updateRoleAssignment(assignment.id, payload);
        notifySuccess('تم تحديث التعيين بنجاح');
      } else {
        await createRoleAssignment(payload);
        notifySuccess('تم إنشاء التعيين بنجاح');
      }
      onSaved();
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string; detail?: string } } })?.response?.data;
      setError(data?.message || data?.detail || 'حدث خطأ أثناء الحفظ');
    } finally {
      setSubmitting(false);
    }
  };

  const disableCreate = submitting || !selectedUser || !selectedRole;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
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
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'rgba(255,255,255,0.16)',
            color: '#fff',
            flexShrink: 0,
          }}
        >
          <EditIcon />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff' }}>
            {assignment ? 'تعديل التعيين' : 'تعيين دور جديد'}
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)' }}>
            تحديد الدور والنطاق والصلاحية الزمنية
          </Typography>
        </Box>
      </Box>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box sx={{ display: 'grid', gap: 2.5 }}>
          <Autocomplete
            options={users}
            getOptionLabel={(opt) => `${opt.full_name} — ${opt.email}`}
            isOptionEqualToValue={(opt, val) => opt.id === val.id}
            value={selectedUser}
            onChange={(_, v) => setSelectedUser(v)}
            disabled={!!assignment}
            renderInput={(params) => (
              <TextField
                {...params}
                label="المستخدم"
                placeholder="ابحث بالاسم أو البريد..."
                fullWidth
                required
              />
            )}
          />

          <Autocomplete
            options={roles}
            getOptionLabel={(opt) => `${opt.name_ar || opt.name} (${opt.code})`}
            isOptionEqualToValue={(opt, val) => opt.id === val.id}
            value={selectedRole}
            onChange={(_, v) => {
              setSelectedRole(v);
              if (v?.default_scope) setScopeTypeVal(v.default_scope as ScopeType);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="الدور"
                placeholder="ابحث عن الدور..."
                fullWidth
                required
              />
            )}
          />

          <TextField
            select
            label="النطاق"
            value={scopeTypeVal}
            onChange={(e) => setScopeTypeVal(e.target.value as ScopeType)}
            fullWidth
            helperText="نطاق تطبيق الصلاحيات"
          >
            {SCOPE_TYPES.map((s) => (
              <MenuItem key={s} value={s}>
                {scopeType[s] || s}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="معرف النطاق (scope ID)"
            value={scopeId}
            onChange={(e) => setScopeId(e.target.value)}
            fullWidth
            placeholder="UUID محدد — اختياري"
            helperText="اتركه فارغاً إذا كان النطاق عاماً (GLOBAL)"
            disabled={scopeTypeVal === 'GLOBAL'}
          />

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField
              label="تاريخ البداية"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="تاريخ النهاية (اختياري)"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
              helperText="اتركه فارغاً لدور مفتوح"
            />
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                color="success"
              />
            }
            label={
              <Box>
                <Typography sx={{ fontWeight: 700 }}>نشط</Typography>
                <Typography variant="caption" color="text.secondary">
                  التفعيل يحدد ما إذا كانت صلاحيات التعيين سارية المفعول
                </Typography>
              </Box>
            }
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          إلغاء
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={disableCreate}>
          {submitting ? <CircularProgress size={20} color="inherit" /> : 'حفظ'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RoleAssignmentFormDialog;
