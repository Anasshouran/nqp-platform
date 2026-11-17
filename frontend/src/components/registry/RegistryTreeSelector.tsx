import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { getRegistryTree } from '../../api/endpoints/registry';
import type { ReportingNodeKind, ReportingNodeTree } from '../../types/registry';

/** القيمة المختارة — تُرسل للـ payload (nodeId/facilityId) وتُعرض (code/nameAr/path). */
export interface SelectedNode {
  nodeId: string;
  facilityId: string | null;
  code: string;
  nameAr: string;
  nameEn?: string;
  path: string;
  kind: ReportingNodeKind;
}

interface FlatNode extends ReportingNodeTree {
  breadcrumb: string;
}

interface Props {
  value: SelectedNode | null;
  onChange: (node: SelectedNode | null) => void;
  kindFilter?: ReportingNodeKind[];
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  label?: string;
  size?: 'small' | 'medium';
}

/** شجرة مسطّحة مع breadcrumb محسوب (ReportingNodeTree لا يحوي path). */
function flattenTree(nodes: ReportingNodeTree[], ancestors: string[] = []): FlatNode[] {
  return nodes.flatMap((node) => {
    const current = [...ancestors, node.name_ar];
    const breadcrumb = current.join(' / ');
    return [
      { ...node, breadcrumb },
      ...flattenTree(node.children || [], current),
    ];
  });
}

/**
 * M7-A2b-full — منتقي العقد التنظيمية (شجرة السجل).
 *
 * بحث أولاً + عرض مُسطَّح مع مسافة بادئة حسب العمق.
 * الافتراضي: FACILITY فقط (المنشأة الصحية للحالة).
 * عند الاختيار يُرجع SelectedNode كاملاً (nodeId + facilityId) — لا استعلام إضافي.
 */
export function RegistryTreeSelector({
  value,
  onChange,
  kindFilter = ['FACILITY'],
  disabled = false,
  error = false,
  helperText,
  label,
  size = 'small',
}: Props) {
  const { t } = useTranslation();
  const [nodes, setNodes] = useState<FlatNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getRegistryTree()
      .then((tree) => {
        if (cancelled) return;
        setNodes(flattenTree(tree));
        setLoadError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : t('registry.selector.error'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const filteredNodes = useMemo(
    () => nodes.filter((n) => kindFilter.includes(n.kind as ReportingNodeKind)),
    [nodes, kindFilter],
  );

  const selectedNode = value ? filteredNodes.find((n) => n.id === value.nodeId) || null : null;

  const handleChange = (_: unknown, node: FlatNode | null) => {
    if (!node) {
      onChange(null);
      return;
    }
    onChange({
      nodeId: node.id,
      facilityId: node.facility_id,
      code: node.code,
      nameAr: node.name_ar,
      nameEn: node.name_en,
      path: node.breadcrumb,
      kind: node.kind as ReportingNodeKind,
    });
  };

  return (
    <Autocomplete
      value={selectedNode}
      onChange={handleChange}
      options={filteredNodes}
      loading={loading}
      disabled={disabled}
      size={size}
      getOptionLabel={(n) => `${n.name_ar} (${n.code})`}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      renderOption={(props, option) => (
        <li {...props} key={option.id}>
          <Box sx={{ pl: option.depth * 1.5 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip size="small" label={option.kind} />
              <Typography variant="body2">{option.name_ar}</Typography>
              <Typography variant="caption" color="text.secondary">
                ({option.code})
              </Typography>
            </Stack>
          </Box>
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label || t('registry.selector.label')}
          placeholder={t('registry.selector.placeholder')}
          error={error || !!loadError}
          helperText={loadError || helperText}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading && <CircularProgress color="inherit" size={16} />}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      noOptionsText={t('registry.selector.no_options')}
      loadingText={t('registry.selector.loading')}
      clearText={t('registry.selector.clear')}
    />
  );
}
