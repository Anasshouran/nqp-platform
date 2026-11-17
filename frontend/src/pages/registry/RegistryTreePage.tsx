import { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box, Paper, Typography, CircularProgress, Alert, Stack, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AddIcon from '@mui/icons-material/Add';

import {
  getRegistryTree,
  deactivateNode,
} from '../../api/endpoints/registry';
import type { ReportingNodeTree } from '../../types/registry';
import { RegistryNodeTree } from '../../components/registry/RegistryNodeTree';
import { RegistryRootPicker } from '../../components/registry/RegistryRootPicker';
import { NodeEditModal } from '../../components/registry/nodes/NodeEditModal';
import { NodeCreateModal } from '../../components/registry/nodes/NodeCreateModal';
import { useAppSelector } from '../../store/hooks';
import { hasGlobalScope } from '../../utils/scopes';

export default function RegistryTreePage() {
  const { t } = useTranslation();
  const user = useAppSelector((s) => s.auth.user);
  const isGlobal = hasGlobalScope(user);

  const [nodes, setNodes] = useState<ReportingNodeTree[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRootId, setSelectedRootId] = useState<string | null>(null);

  const [editingNode, setEditingNode] = useState<ReportingNodeTree | null>(null);
  const [creating, setCreating] = useState(false);
  const [deactivatingNode, setDeactivatingNode] = useState<ReportingNodeTree | null>(null);
  const [deactivateBusy, setDeactivateBusy] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  const loadTree = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRegistryTree();
      setNodes(data ?? []);
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string } } })?.response?.data;
      setError(data?.message || t('registry.tree.error.load'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  // Refetch after any write — keeps the current root picker selection stable.
  const handleSaved = useCallback(() => {
    loadTree();
  }, [loadTree]);

  const handleDeactivate = async () => {
    if (!deactivatingNode) return;
    setDeactivateBusy(true);
    setDeactivateError(null);
    try {
      await deactivateNode(deactivatingNode.id);
      setDeactivatingNode(null);
      loadTree();
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string } } })?.response?.data;
      setDeactivateError(data?.message || t('registry.nodes.error.deactivate'));
    } finally {
      setDeactivateBusy(false);
    }
  };

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
        {isGlobal && (
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            size="small"
            sx={{ ml: 'auto' }}
            onClick={() => setCreating(true)}
          >
            {t('registry.nodes.create.button')}
          </Button>
        )}
      </Stack>

      {!hasFederalRoot && nodes.length > 0 && (
        <Alert severity="info" icon={<AccountTreeIcon />} sx={{ mb: 2 }}>
          {t('registry.tree.banner.scoped')}
        </Alert>
      )}

      {!hasFederalRoot && nodes.length > 0 && (
        <Paper sx={{ p: 1.5, mb: 2, bgcolor: 'action.hover' }}>
          <Typography variant="caption" color="text.secondary">
            {t('registry.tree.virtual_root', { name: nodes[0]?.name_ar ?? '' })}
          </Typography>
        </Paper>
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
          <RegistryNodeTree
            nodes={displayNodes}
            isGlobal={isGlobal}
            onEdit={isGlobal ? setEditingNode : undefined}
            onDeactivate={isGlobal ? setDeactivatingNode : undefined}
          />
        )}
      </Paper>

      <NodeEditModal
        open={editingNode !== null}
        node={editingNode}
        onClose={() => setEditingNode(null)}
        onSaved={handleSaved}
      />

      <NodeCreateModal
        open={creating}
        allNodes={nodes}
        onClose={() => setCreating(false)}
        onSaved={handleSaved}
      />

      <Dialog
        open={deactivatingNode !== null}
        onClose={deactivateBusy ? undefined : () => setDeactivatingNode(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{t('registry.nodes.deactivate.button')}</DialogTitle>
        <DialogContent>
          <Typography>{t('registry.nodes.deactivate.confirm')}</Typography>
          {deactivatingNode && (
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
              {deactivatingNode.name_ar} ({deactivatingNode.code})
            </Typography>
          )}
          {deactivateError && <Alert severity="error" sx={{ mt: 1 }}>{deactivateError}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeactivatingNode(null)} disabled={deactivateBusy}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeactivate}
            disabled={deactivateBusy}
          >
            {deactivateBusy ? <CircularProgress size={18} /> : t('common.confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
