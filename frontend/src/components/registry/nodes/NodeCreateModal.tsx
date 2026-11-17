import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Select, FormControl, InputLabel,
  Alert, CircularProgress, Stack,
} from '@mui/material';

import { createNode } from '../../../api/endpoints/registry';
import type { ReportingNodeTree } from '../../../types/registry';

const CREATABLE_KINDS = ['STATE', 'LOCALITY', 'FACILITY', 'DEPARTMENT', 'SERVICE'] as const;

interface Props {
  open: boolean;
  allNodes: ReportingNodeTree[];
  onClose: () => void;
  onSaved: () => void;
}

const flatten = (list: ReportingNodeTree[], level = 0, out: Array<ReportingNodeTree & { depth: number }> = []) => {
  for (const n of list) {
    out.push({ ...n, depth: level });
    flatten(n.children ?? [], level + 1, out);
  }
  return out;
};

export function NodeCreateModal({ open, allNodes, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const [kind, setKind] = useState<string>('LOCALITY');
  const [parentId, setParentId] = useState<string>('');
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const parentOptions = useMemo(
    () => flatten(allNodes).filter((n) => n.kind !== 'SERVICE'),
    [allNodes],
  );

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await createNode({ kind, code, name_ar: nameAr, name_en: nameEn || undefined, parent: parentId || undefined });
      onSaved();
      handleClose();
    } catch (e: unknown) {
      const data = (e as { response?: { data?: unknown } })?.response?.data;
      const msg =
        (data as { message?: string } | undefined)?.message
        ?? (typeof data === 'object' ? JSON.stringify(data) : String(data ?? ''));
      setError(msg || t('registry.nodes.error.create'));
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
    setKind('LOCALITY');
    setParentId('');
    setNameAr('');
    setNameEn('');
    setCode('');
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('registry.nodes.create.title')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormControl fullWidth>
            <InputLabel>{t('registry.nodes.field.kind')}</InputLabel>
            <Select
              value={kind}
              label={t('registry.nodes.field.kind')}
              onChange={(e) => setKind(e.target.value)}
            >
              {CREATABLE_KINDS.map((k) => <MenuItem key={k} value={k}>{k}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth required>
            <InputLabel>{t('registry.nodes.field.parent')}</InputLabel>
            <Select
              value={parentId}
              label={t('registry.nodes.field.parent')}
              onChange={(e) => setParentId(e.target.value)}
            >
              {parentOptions.map((n) => (
                <MenuItem key={n.id} value={n.id}>
                  {'\u00a0'.repeat(n.depth * 2)}{n.name_ar} ({n.code}) — {n.kind}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label={t('registry.nodes.field.code')}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            fullWidth
          />
          <TextField
            label={t('registry.nodes.field.name_ar')}
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
            required
            fullWidth
          />
          <TextField
            label={t('registry.nodes.field.name_en')}
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            fullWidth
          />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>{t('common.cancel')}</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || !nameAr || !code || !parentId}
        >
          {saving ? <CircularProgress size={20} /> : t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
