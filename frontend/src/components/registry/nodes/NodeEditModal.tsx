import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Alert, CircularProgress, Stack,
} from '@mui/material';

import { updateNode } from '../../../api/endpoints/registry';
import type { ReportingNodeTree } from '../../../types/registry';

interface Props {
  open: boolean;
  node: ReportingNodeTree | null;
  onClose: () => void;
  onSaved: () => void;
}

export function NodeEditModal({ open, node, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && node) {
      setNameAr(node.name_ar);
      setNameEn(node.name_en ?? '');
      setCode(node.code);
      setError(null);
    }
  }, [open, node]);

  const handleSave = async () => {
    if (!node) return;
    setSaving(true);
    setError(null);
    try {
      await updateNode(node.id, { name_ar: nameAr, name_en: nameEn, code });
      onSaved();
      onClose();
    } catch (e: unknown) {
      const data = (e as { response?: { data?: { message?: string } } })?.response?.data;
      setError(data?.message || t('registry.nodes.error.edit'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('registry.nodes.edit.title')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label={t('registry.nodes.field.kind')}
            value={node?.kind ?? ''}
            disabled
            fullWidth
          />
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
        <Button onClick={onClose} disabled={saving}>{t('common.cancel')}</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || !nameAr || !code}
        >
          {saving ? <CircularProgress size={20} /> : t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
