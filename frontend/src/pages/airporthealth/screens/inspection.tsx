import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { PageTitle } from '../shared';
import { EmptyState } from '../../../components/uikit';

/* ============================ 13. تفتيش الطائرات ============================ */

export const Inspection = () => {
  const { t } = useTranslation();
  return (
    <Box>
      <PageTitle title={t('airporthealth.screens.inspection.aircraftInspection.title')} subtitle={t('airporthealth.screens.inspection.aircraftInspection.subtitle')} />
      <EmptyState title={t('airporthealth.screens.inspection.aircraftInspection.emptyTitle')} description={t('airporthealth.screens.inspection.aircraftInspection.emptyDescription')} />
    </Box>
  );
};

/* ============================== 14. التحليلات ============================== */

export const Analytics = () => {
  const { t } = useTranslation();
  return (
    <Box>
      <PageTitle title={t('airporthealth.screens.inspection.analytics.title')} subtitle={t('airporthealth.screens.inspection.analytics.subtitle')} />
      <EmptyState title={t('airporthealth.screens.inspection.analytics.emptyTitle')} description={t('airporthealth.screens.inspection.analytics.emptyDescription')} />
    </Box>
  );
};

/* ============================= 15. الشهادات ============================= */

export const Certificates = () => {
  const { t } = useTranslation();
  return (
    <Box>
      <PageTitle title={t('airporthealth.screens.inspection.certificates.title')} subtitle={t('airporthealth.screens.inspection.certificates.subtitle')} />
      <EmptyState title={t('airporthealth.screens.inspection.certificates.emptyTitle')} description={t('airporthealth.screens.inspection.certificates.emptyDescription')} />
    </Box>
  );
};
