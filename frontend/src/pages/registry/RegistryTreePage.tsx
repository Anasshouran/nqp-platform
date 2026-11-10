import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box, Paper, Typography, CircularProgress, Alert, Stack,
} from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';

import { getRegistryTree } from '../../api/endpoints/registry';
import type { ReportingNodeTree } from '../../types/registry';
import { RegistryNodeTree } from '../../components/registry/RegistryNodeTree';
import { RegistryRootPicker } from '../../components/registry/RegistryRootPicker';

export default function RegistryTreePage() {
  const { t } = useTranslation();
  const [nodes, setNodes] = useState<ReportingNodeTree[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRootId, setSelectedRootId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getRegistryTree()
      .then((data) => {
        if (!cancelled) {
          setNodes(data ?? []);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.response?.data?.message || t('registry.tree.error.load'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [t]);

  const displayNodes = useMemo(() => {
    if (!selectedRootId) return nodes;
    const find = (list: ReportingNodeTree[]): ReportingNodeTree | null => {
      for (const n of list) {
        if (n.id === selectedRootId) return n;
        const found = find(n.children ?? []);
        if (found) return found;
      }
      return null;
    };
    const root = find(nodes);
    return root ? [root] : nodes;
  }, [nodes, selectedRootId]);

  const hasFederalRoot = nodes.some((n) => n.kind === 'FEDERAL');

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <AccountTreeIcon color="primary" fontSize="large" />
        <Typography variant="h5">{t('registry.tree.title')}</Typography>
      </Stack>

      {!hasFederalRoot && nodes.length > 0 && (
        <Alert severity="info" icon={<AccountTreeIcon />} sx={{ mb: 2 }}>
          {t('registry.tree.banner.scoped')}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <RegistryRootPicker roots={nodes} value={selectedRootId} onChange={setSelectedRootId} />
      </Paper>

      <Paper sx={{ p: 2, minHeight: 400 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        )}
        {!loading && error && <Alert severity="error">{error}</Alert>}
        {!loading && !error && displayNodes.length === 0 && (
          <Alert severity="info">{t('registry.tree.empty')}</Alert>
        )}
        {!loading && !error && displayNodes.length > 0 && (
          <RegistryNodeTree nodes={displayNodes} />
        )}
      </Paper>
    </Box>
  );
}