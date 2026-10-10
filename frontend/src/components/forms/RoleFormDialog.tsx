import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import ShieldIcon from '@mui/icons-material/Shield';
import { FormTextField, FormSelect } from '../uikit';
import { createRole, updateRole } from '../../api/endpoints/roles';
import { notifySuccess } from '../../utils/toast';
import PermissionPicker from './PermissionPicker';
import type { Role } from '../../types/user';

interface RoleFormDialogProps {
  open: boolean;
  role: Role | null;
  onClose: () => void;
  onSaved: () => void;
}

const RoleFormDialog = ({ open, role, onClose, onSaved }: RoleFormDialogProps) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState('GLOBAL');
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCode(role?.code || '');
      setName(role?.name || '');
      setNameAr(role?.name_ar || '');
      setDescription(role?.description || '');
      setScope(role?.default_scope || 'GLOBAL');
      setSelected(role?.permissions || []);
      setError(null);
    }
  }, [open, role]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const payload = {
      code: code.trim(),
      name: name.trim(),
      name_ar: nameAr.trim(),
      description: description.trim(),
      default_scope: scope,
      permissions: selected,
    };
    try {
      if (role) {
        await updateRole(role.id, payload);
        notifySuccess('تم تحديث الدور بنجاح');
      } else {
        await createRole(payload);
        notifySuccess('تم إنشاء الدور بنجاح');
      }
      onSaved();
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, unknown> } })
        ?.response?.data;
      const msg =
        (data?.message as string) ||
        (data?.code as string) ||
        (data?.detail as string) ||
        'حدث خطأ أثناء الحفظ';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const totalChecked = selected.length;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <Box
        className="gradient-shift"
        sx={{
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          background: 'linear-gradient(120deg, #075e4d, #0a6b58, #0c7f6a)',
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
          <ShieldIcon />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff' }}>
            {role ? 'تعديل الدور' : 'دور جديد'}
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)' }}>
            {totalChecked} صلاحية محددة
          </Typography>
        </Box>
      </Box>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <FormTextField
            label="كود الدور"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={!!role}
            hint="مثال: PORT_OFFICER"
          />
          <FormTextField
            label="الاسم بالإنجليزية"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <FormTextField
            label="الاسم بالعربية"
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
          />
          <FormTextField
            label="الوصف"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            minRows={1}
            maxRows={3}
          />
          <FormSelect
            label="النطاق الافتراضي"
            value={scope}
            onChange={setScope}
            options={[
              { value: 'GLOBAL', label: 'عام (كل النظام)' },
              { value: 'SECTOR', label: 'قطاع' },
              { value: 'DEPARTMENT', label: 'إدارة' },
              { value: 'STATION', label: 'محطة' },
              { value: 'PORT', label: 'ميناء' },
              { value: 'POINT', label: 'نقطة حدودية' },
              { value: 'REGION', label: 'منطقة' },
            ]}
            hint="نطاق الوصول الافتراضي عند تعيين هذا الدور لمستخدم"
          />
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
          الصلاحيات
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          حدد الصلاحيات الممنوحة لهذا الدور حسب وحدة النظام
        </Typography>

        <PermissionPicker value={selected} onChange={setSelected} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          إلغاء
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || !code.trim() || !name.trim()}
        >
          {submitting ? <CircularProgress size={20} color="inherit" /> : 'حفظ'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RoleFormDialog;
