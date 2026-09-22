import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ContactSupportIcon from '@mui/icons-material/ContactSupport';
import { getFaq } from '../../api/endpoints/public';
import type { FaqItem } from '../../api/endpoints/public';
import { PageHeader, EmptyState, ListSkeleton } from '../../components/common';

const FaqPage = () => {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | false>(false);

  useEffect(() => {
    getFaq()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <PageHeader
        title="الأسئلة الشائعة"
        subtitle="إجابات عن أكثر الأسئلة تكراراً حول إجراءات الحجر الصحي والسفر"
        eyebrow="مركز المساعدة"
      />
      {loading ? (
        <ListSkeleton count={4} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ContactSupportIcon />}
          title="لا توجد أسئلة مسجلة"
          description="يمكنك التواصل معنا مباشرة لطرح استفساراتك."
        />
      ) : (
        <Box>
          {items.map((item, index) => (
            <Accordion
              key={item.id}
              expanded={expanded === item.id}
              onChange={() => setExpanded((prev) => (prev === item.id ? false : item.id))}
              sx={{ mb: 1.5, '&.Mui-expanded': { boxShadow: 3, borderColor: 'primary.main' } }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls={`faq-${item.id}-content`}
                id={`faq-${item.id}-header`}
                sx={{ '& .MuiAccordionSummary-content': { gap: 1.5, alignItems: 'center' } }}
              >
                <Box
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: 2,
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: 'primary.light',
                    color: 'primary.main',
                    fontWeight: 700,
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                >
                  {index + 1}
                </Box>
                <Typography sx={{ fontWeight: 700 }}>{item.question}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary" sx={{ pr: 6, lineHeight: 2 }}>
                  {item.answer}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}
    </Container>
  );
};

export default FaqPage;
