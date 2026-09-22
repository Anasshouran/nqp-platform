import { useEffect, useState } from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { SectorPageShell, SectorHomeLink, useSectorSite, usePageTitle } from './SectorCmsShared';
import { EmptyState } from '../../components/common';
import { getFaq } from '../../api/endpoints/public';
import type { FaqItem } from '../../api/endpoints/public';

const SectorCmsFaq = () => {
  const { sector } = useSectorSite();
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);

  usePageTitle('الأسئلة الشائعة');

  useEffect(() => {
    getFaq(sector?.id)
      .then((data) => setItems(data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [sector?.id]);

  return (
    <SectorPageShell>
      <SectorHomeLink />
      <Typography component="h1" variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>الأسئلة الشائعة</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        إجابات لأكثر الأسئلة تكراراً حول خدمات القطاع والمنصة.
      </Typography>

      {loading ? (
        <Box sx={{ display: 'grid', gap: 1.5 }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="rounded" height={52} />
          ))}
        </Box>
      ) : items.length === 0 ? (
        <EmptyState title="لا توجد أسئلة شائعة" description="لا توجد أسئلة شائعة منشورة حالياً." />
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
