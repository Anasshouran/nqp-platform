import { Box, Alert, Stack, Chip, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

import type { ReportingNode } from '../../../types/registry';

interface Props {
  node: ReportingNode | null;
  allNodes: ReportingNode[];
}

export function TreePositionTab({ node, allNodes }: Props) {
  const { t } = useTranslation();
  if (!node) {
    return <Alert severity="info">{t('registry.facility.tree_position.empty')}</Alert>;
  }

  // Build ancestor chain by walking parent_id
  const byId = new Map(allNodes.map((n) => [n.id, n]));
  const chain: ReportingNode[] = [];
  let cur: ReportingNode | undefined = node;
  const seen = new Set<string>();
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    chain.unshift(cur);
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
  }

  if (chain.length === 0) {
    return <Alert severity="info">{t('registry.facility.tree_position.empty')}</Alert>;
  }

  return (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
      {chain.map((n, i) => (
        <Stack key={n.id} direction="row" spacing={1} alignItems="center">
          {i > 0 && <Typography variant="body2">→</Typography>}
          <Chip label={`${n.name_ar} (${n.kind})`} color={i === chain.length - 1 ? 'success' : 'default'} />
        </Stack>
      ))}
    </Stack>
  );
}