import { Box, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { useTranslation } from 'react-i18next';

import type { ReportingNodeTree } from '../../types/registry';

interface Props {
  roots: ReportingNodeTree[];
  value: string | null;
  onChange: (id: string | null) => void;
}

export function RegistryRootPicker({ roots, value, onChange }: Props) {
  const { t } = useTranslation();

  return (
    <Box sx={{ maxWidth: 400 }}>
      <FormControl fullWidth size="small">
        <InputLabel>{t('registry.tree.picker.label')}</InputLabel>
        <Select
          value={value ?? ''}
          label={t('registry.tree.picker.label')}
          onChange={(e) => onChange(e.target.value || null)}
        >
          <MenuItem value="">
            <em>{t('registry.tree.picker.all')}</em>
          </MenuItem>
          {roots.map((root) => (
            <MenuItem key={root.id} value={root.id}>
              {root.name_ar} ({root.code})
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
}