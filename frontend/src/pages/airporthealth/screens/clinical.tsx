import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { PageTitle } from '../shared';
import { EmptyState } from '../../../components/uikit';

/* ========================== 8. الحالات المشتبهة ========================== */

export const Suspected = () => {
  const { t } = useTranslation();
  return (
    <Box>
      <PageTitle title={t('airporthealth.screens.clinical.suspected.title')} subtitle={t('airporthealth.screens.clinical.suspected.subtitle')} />
      <EmptyState title={t('airporthealth.screens.clinical.suspected.emptyTitle')} description={t('airporthealth.screens.clinical.suspected.emptyDescription')} />
    </Box>
  );
};

/* ============================= 9. العزل ============================= */

export const Isolation = () => {
  const { t } = useTranslation();
  return (
    <Box>
      <PageTitle title={t('airporthealth.screens.clinical.isolation.title')} subtitle={t('airporthealth.screens.clinical.isolation.subtitle')} />
      <EmptyState title={t('airporthealth.screens.clinical.isolation.emptyTitle')} description={t('airporthealth.screens.clinical.isolation.emptyDescription')} />
    </Box>
  );
};

/* ============================= 10. المختبر ============================= */

export const Lab = () => {
  const { t } = useTranslation();
  return (
    <Box>
      <PageTitle title={t('airporthealth.screens.clinical.lab.title')} subtitle={t('airporthealth.screens.clinical.lab.subtitle')} />
      <EmptyState title={t('airporthealth.screens.clinical.lab.emptyTitle')} description={t('airporthealth.screens.clinical.lab.emptyDescription')} />
    </Box>
  );
};

/* ========================= 11. تتبع المخالطين ========================= */

export const ContactTracing = () => {
  const { t } = useTranslation();
  return (
    <Box>
      <PageTitle title={t('airporthealth.screens.clinical.contactTracing.title')} subtitle={t('airporthealth.screens.clinical.contactTracing.subtitle')} />
      <EmptyState title={t('airporthealth.screens.clinical.contactTracing.emptyTitle')} description={t('airporthealth.screens.clinical.contactTracing.emptyDescription')} />
    </Box>
  );
};

/* ============================= 12. الطوارئ ============================= */

export const Emergency = () => {
  const { t } = useTranslation();
  return (
    <Box>
      <PageTitle title={t('airporthealth.screens.clinical.emergency.title')} subtitle={t('airporthealth.screens.clinical.emergency.subtitle')} />
      <EmptyState title={t('airporthealth.screens.clinical.emergency.emptyTitle')} description={t('airporthealth.screens.clinical.emergency.emptyDescription')} />
    </Box>
  );
};
