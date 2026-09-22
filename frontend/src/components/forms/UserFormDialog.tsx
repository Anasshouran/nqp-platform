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
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import PersonIcon from '@mui/icons-material/Person';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { createUser, getRoles, updateUser } from '../../api/endpoints/users';
import { notifySuccess } from '../../utils/toast';
import PermissionPicker from './PermissionPicker';
import type { Role, User } from '../../types/user';

interface UserFormDialogProps {
  open: boolean;
  user: User | null;
  onClose: () => void;
  onSaved: () => void;
}

const UserFormDialog = ({ open, user, onClose, onSaved }: UserFormDialogProps) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [role, setRole] = useState('');
  const [password, setPassword] = useState('');
  const [extraPermissions, setExtraPermissions] = useState<string[]>([]);
  const [blockedPermissions, setBlockedPermissions] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      getRoles()
        .then((response) => setRoles(response.data.data))
        .catch(() => setRoles([]));
      setFullName(user?.full_name || '');
      setEmail(user?.email || '');
      setUsername(user?.username || '');
      setEmployeeNumber(user?.employee_number || '');
      setPhone(user?.phone || '');
      setNationalId(user?.national_id || '');
      setRole(user?.role || '');
      setPassword('');
      setExtraPermissions(user?.extra_permissions || []);
      setBlockedPermissions(user?.blocked_permissions || []);
      setIsActive(user?.is_active ?? true);
      setError(null);
    }
  }, [open, user]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        full_name: fullName,
        email,
        username: username || null,
        employee_number: employeeNumber || null,
        phone,
        national_id: nationalId,
        role: role || null,
        extra_permissions: extraPermissions,
        blocked_permissions: blockedPermissions,
        is_active: isActive,
      };
      if (user) {
        await updateUser(user.id, payload);
      } else {
        await createUser({ ...payload, password });
      }
      notifySuccess(user ? 'تم تحديث بيانات المستخدم بنجاح' : 'تم إنشاء المستخدم بنجاح');
      onSaved();
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, unknown> } })
        ?.response?.data;
      const msg =
        (data?.detail as string) ||
        (data?.email as string) ||
        (data?.message as string) ||
        'حدث خطأ أثناء الحفظ';
      setError(msg);
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
          {user ? <PersonIcon /> : <PersonAddIcon />}
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff' }}>
          {user ? 'تعديل مستخدم' : 'مستخدم جديد'}
        </Typography>
      </Box>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <TextField
          label="الاسم الكامل"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          fullWidth
          margin="dense"
        />
        <TextField
          label="البريد الإلكتروني"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          fullWidth
          margin="dense"
          disabled={!!user}
        />
        <TextField
          label="اسم المستخدم"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          fullWidth
          margin="dense"
          helperText="اختياري — يستخدم لتسجيل الدخول"
          inputProps={{ dir: 'ltr', autoComplete: 'username' }}
        />
        <TextField
          label="الرقم الوظيفي"
          value={employeeNumber}
          onChange={(e) => setEmployeeNumber(e.target.value)}
          fullWidth
          margin="dense"
          inputProps={{ dir: 'ltr' }}
        />
        <TextField
          label="رقم الهاتف"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          fullWidth
          margin="dense"
        />
        <TextField
          label="الرقم الوطني"
          value={nationalId}
          onChange={(e) => setNationalId(e.target.value)}
          fullWidth
          margin="dense"
        />
        <TextField
          select
          label="الدور"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          fullWidth
          margin="dense"
        >
          <MenuItem value="">بدون دور</MenuItem>
          {roles.map((r) => (
            <MenuItem key={r.id} value={r.code}>
              {r.name_ar} ({r.code})
            </MenuItem>
          ))}
        </TextField>
        {!user && (
          <TextField
            label="كلمة المرور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            fullWidth
            margin="dense"
            helperText="8 أحرف على الأقل"
          />
        )}
        <FormControlLabel
          control={
            <Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          }
          label="حساب نشط"
          sx={{ mt: 1 }}
        />

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'grid', gap: 3 }}>
          <PermissionPicker
            label="صلاحيات إضافية (منح)"
            helperText="تعطى لهذا المستخدم مباشرة وتتجاوز صلاحيات دوره في نطاق أقل"
            value={extraPermissions}
            onChange={setExtraPermissions}
          />
          <PermissionPicker
            label="صلاحيات محظورة (منع)"
            helperText="تُمنع عنه حتى لو كانت ضمن صلاحيات دوره — الأولوية أعلى من المنح"
            value={blockedPermissions}
            onChange={setBlockedPermissions}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          إلغاء
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || !fullName.trim() || !email.trim() || (!user && !password)}
        >
          {submitting ? <CircularProgress size={20} color="inherit" /> : 'حفظ'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserFormDialog;
