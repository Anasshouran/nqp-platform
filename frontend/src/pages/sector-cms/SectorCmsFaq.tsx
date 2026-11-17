import { useEffect, useState } from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { SectorPageShell, SectorHomeLink, useSectorSite, usePageTitle } from './SectorCmsShared';
import { EmptyState } from '../../components/common';
import { getFaq } from '../../api/endpoints/public';
import type { FaqItem } from '../../api/endpoints/public';

const SectorCmsFaq = () => {
  const { sector } = useSectorSite();
  const { t } = useTranslation();
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);

  usePageTitle(t('sector-cms.faq.pageTitle'));

  useEffect(() => {
    getFaq(sector?.id)
      .then((data) => setItems(data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [sector?.id]);

  return (
    <SectorPageShell>
      <SectorHomeLink />
      <Typography component="h1" variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>{t('sector-cms.faq.pageTitle')}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t('sector-cms.faq.subtitle')}
      </Typography>

      {loading ? (
        <Box sx={{ display: 'grid', gap: 1.5 }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="rounded" height={52} />
          ))}
        </Box>
      ) : items.length === 0 ? (
        <EmptyState title={t('sector-cms.faq.emptyTitle')} description={t('sector-cms.faq.emptyDescription')} />
      ) : (
        <Box>
          {items.map((item) => (
            <Accordion key={item.id} sx={{ borderRadius: 2, '&:not(:last-child)': { mb: 1.5 } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography sx={{ fontWeight: 700 }}>{item.question}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                  {item.answer}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}
    </SectorPageShell>
  );
};

export default SectorCmsFaq;
