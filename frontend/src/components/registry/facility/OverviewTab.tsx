import { Box, Typography, Stack, Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';

import type { ReportingNode } from '../../../types/registry';
import type { MasterHealthFacility } from '../../../types/masterdata';

interface Props {
  node: ReportingNode | null;
  facility: MasterHealthFacility | null;
}

export function OverviewTab({ node, facility }: Props) {
  const { t } = useTranslation();

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="subtitle2" color="text.secondary">{t('registry.facility.overview.name')}</Typography>
        <Typography variant="body1">{facility?.name_ar || node?.name_ar || '—'}</Typography>
      </Box>
      <Box>
        <Typography variant="subtitle2" color="text.secondary">{t('registry.facility.overview.code')}</Typography>
        <Typography variant="body1">{facility?.code || node?.code || '—'}</Typography>
      </Box>
      {facility?.kind && (
        <Box>
          <Typography variant="subtitle2" color="text.secondary">Kind</Typography>
          <Chip label={facility.kind} size="small" />
        </Box>
      )}
      {facility?.sector_name && (
        <Box>
          <Typography variant="subtitle2" color="text.secondary">{t('registry.facility.overview.sector')}</Typography>
          <Typography variant="body1">{facility.sector_name}</Typography>
        </Box>
      )}
      {facility?.locality_name && (
        <Box>
          <Typography variant="subtitle2" color="text.secondary">{t('registry.facility.overview.locality')}</Typography>
          <Typography variant="body1">{facility.locality_name}</Typography>
        </Box>
      )}
      {facility?.entry_point_name && (
        <Box>
          <Typography variant="subtitle2" color="text.secondary">{t('registry.facility.overview.entry_point')}</Typography>
          <Typography variant="body1">{facility.entry_point_name}</Typography>
        </Box>
      )}
      {node && (
        <Box>
          <Typography variant="subtitle2" color="text.secondary">Node kind</Typography>
          <Chip label={node.kind} size="small" color="success" />
        </Box>
      )}
    </Stack>
  );
}