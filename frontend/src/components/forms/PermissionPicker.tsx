import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { getPermissionTree } from '../../api/endpoints/roles';
import { permissionAction, permissionResource } from '../../utils/status';
import type { Permission, PermissionTree } from '../../types/user';

interface PermissionPickerProps {
  value: string[];
  onChange: (codes: string[]) => void;
  label?: string;
  helperText?: string;
  density?: 'dense' | 'normal';
  columns?: { xs: number; sm: number };
}

const ACTION_ORDER = ['view', 'add', 'edit', 'delete', 'export'];

const PermissionPicker = ({
  value,
  onChange,
  label,
  helperText,
  density = 'normal',
  columns = { xs: 1, sm: 2 },
}: PermissionPickerProps) => {
  const [tree, setTree] = useState<PermissionTree>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getPermissionTree()
      .then((r) => {
        if (alive) setTree(r.data.data || {});
      })
      .catch(() => {
        if (alive) setError('تعذر تحميل الصلاحيات');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const selected = useMemo(() => new Set(value), [value]);

  const resources = useMemo(() => {
    const known = Object.keys(permissionResource);
    const rest = Object.keys(tree)
      .filter((res) => !known.includes(res))
      .sort();
    return [...known.filter((res) => tree[res]), ...rest];
  }, [tree]);

  const togglePermission = (code: string) => {
    const next = new Set(selected);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    onChange(Array.from(next));
  };

  const toggleResource = (res: string, checked: boolean) => {
    const next = new Set(selected);
    for (const perm of tree[res] || []) {
      if (checked) next.add(perm.code);
      else next.delete(perm.code);
    }
    onChange(Array.from(next));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 3 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 1 }}>
        {error}
      </Alert>
    );
  }

  const compact = density === 'dense';

  return (
    <Box>
      {(label || helperText) && (
        <Box sx={{ mb: 1 }}>
          {label && (
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {label}
              {value.length > 0 && (
                <Typography component="span" variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                  ({value.length})
                </Typography>
              )}
            </Typography>
          )}
          {helperText && (
            <Typography variant="caption" color="text.secondary">
              {helperText}
            </Typography>
          )}
        </Box>
      )}
      <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: `repeat(${columns.xs}, 1fr)`, sm: `repeat(${columns.sm}, 1fr)` } }}>
        {resources.map((res) => {
          const perms = tree[res] || [];
          const checkedCount = perms.filter((p) => selected.has(p.code)).length;
          const all = checkedCount === perms.length && perms.length > 0;
          const ordered: Permission[] = [
            ...ACTION_ORDER.flatMap((a) => perms.filter((p) => p.action === a)),
          ];
          const seen = new Set(ordered.map((p) => p.code));
          for (const p of perms) if (!seen.has(p.code)) ordered.push(p);
          return (
            <Box
              key={res}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1.5,
                p: compact ? 0.6 : 1,
                bgcolor: 'background.paper',
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={all}
                    indeterminate={checkedCount > 0 && !all}
                    onChange={(e) => toggleResource(res, e.target.checked)}
                  />
                }
                label={
                  <Typography sx={{ fontWeight: 700, fontSize: compact ? 12.5 : 13.5 }}>
                    {permissionResource[res] || res}
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
                      ({checkedCount}/{perms.length})
                    </Typography>
                  </Typography>
                }
                sx={{ m: 0, width: '100%' }}
              />
              <Box sx={{ pl: compact ? 1.5 : 2.5, mt: 0.2 }}>
                {ordered.map((perm) => (
                  <FormControlLabel
                    key={perm.code}
                    control={
                      <Checkbox
                        size="small"
                        checked={selected.has(perm.code)}
                        onChange={() => togglePermission(perm.code)}
                        sx={{ py: 0.25 }}
                      />
                    }
                    label={
                      <Typography fontSize={compact ? 12 : 13}>
                        {permissionAction[perm.action] || perm.action}
                      </Typography>
                    }
                    sx={{ m: 0, width: '100%' }}
                  />
                ))}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default PermissionPicker;