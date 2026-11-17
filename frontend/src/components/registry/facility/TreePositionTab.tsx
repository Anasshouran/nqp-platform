import { Box, Alert, Stack, Chip, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { Link as MuiLink } from '@mui/material';
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
      {chain.map((n, i) => {
        const isLast = i === chain.length - 1;
        const facilityId = (n as ReportingNode & { facility_id?: string | null }).facility_id;
        const linkable = !isLast && !!facilityId;
        return (
          <Stack key={n.id} direction="row" spacing={1} alignItems="center">
            {i > 0 && <Typography variant="body2">→</Typography>}
            {linkable ? (
              <MuiLink component={Link} to={`/app/registry/facility/${facilityId}`} underline="hover">
                {n.name_ar} ({n.kind})
              </MuiLink>
            ) : (
              <Chip label={`${n.name_ar} (${n.kind})`} color={isLast ? 'success' : 'default'} />
            )}
          </Stack>
        );
      })}
    </Stack>
  );
}
