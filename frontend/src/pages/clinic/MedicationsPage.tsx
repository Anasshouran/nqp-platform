import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import MedicationIcon from '@mui/icons-material/Medication';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import { PageHeader, EmptyState } from '../../components/common';
import { getClinicMedications } from '../../api/endpoints/clinic';
import type { ClinicMedication } from '../../types/clinic';
import { extractErrorMessage, notifyError } from '../../utils/toast';
import { GlassPanel, SectionHeader } from './ui';

const MedicationPage = () => {
  const [items, setItems] = useState<ClinicMedication[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getClinicMedications()
      .then((res) => setItems(res.data.data))
      .catch((err) => {
        setError(true);
        setItems([]);
        notifyError(extractErrorMessage(err, 'تعذر تحميل الأدوية'));
      });
  }, []);

  return (
    <Box>
      <PageHeader
        title="الأدوية والمخزون"
        subtitle="سجل الأدوية المتاحة للصرف من عيادة الموانئ الطبية"
        eyebrow="العيادة"
      />
      <GlassPanel accent="linear-gradient(90deg, #0c7f6a, transparent)">
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          <SectionHeader
            icon={<MedicationIcon fontSize="small" />}
            title="أصناف الأدوية"
            count={items?.length ?? '…'}
          />
          {items === null ? (
            <Grid container spacing={2}>
              {[0, 1, 2, 3].map((i) => (
                <Grid item xs={12} sm={6} lg={3} key={i}>
                  <Skeleton variant="rounded" height={120} />
                </Grid>
              ))}
            </Grid>
          ) : error && items.length === 0 ? (
            <EmptyState
              icon={<MedicalServicesIcon sx={{ fontSize: 40 }} />}
              title="تعذر تحميل الأدوية"
              description="حدث خطأ أثناء الاتصال بالخادم — يرجى المحاولة لاحقاً"
            />
          ) : items.length === 0 ? (
            <EmptyState
              icon={<MedicationIcon sx={{ fontSize: 40 }} />}
              title="لا توجد أدوية مسجلة"
              description="أدوية العيادة ستظهر هنا عند إضافتها من الإدارة"
            />
          ) : (
            <Grid container spacing={2}>
              {items.map((m) => (
                <Grid item xs={12} sm={6} lg={3} key={m.id}>
                  <Box
                    sx={{
                      height: '100%',
                      p: 2,
                      borderRadius: 3,
                      border: '1px solid rgba(16,40,34,0.07)',
                      bgcolor: 'rgba(255,255,255,0.72)',
                      transition: 'border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease',
                      '&:hover': {
                        borderColor: 'primary.main',
                        boxShadow: '0 10px 26px -14px rgba(16,40,34,0.4)',
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                      <Box
                        sx={{
                          width: 42,
                          height: 42,
                          borderRadius: 2.4,
                          display: 'grid',
                          placeItems: 'center',
                          color: '#fff',
                          background: 'linear-gradient(135deg, #0c7f6a, #075447)',
                          flexShrink: 0,
                        }}
                      >
                        <MedicationIcon fontSize="small" />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: 14.5, lineHeight: 1.3 }} noWrap>
                          {m.name}
                        </Typography>
                        {m.generic_name && (
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                            {m.generic_name}
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {m.unit && (
                        <Chip
                          size="small"
                          label={m.unit}
                          sx={{ bgcolor: 'rgba(12,127,106,0.1)', color: '#0c7f6a', fontWeight: 700, fontSize: 11 }}
                        />
                      )}
                      {(m.interactions ?? []).length > 0 && (
                        <Chip
                          size="small"
                          label={`${m.interactions!.length} تفاعلات`}
                          sx={{ bgcolor: 'rgba(168,100,0,0.1)', color: '#a86400', fontWeight: 700, fontSize: 11 }}
                        />
                      )}
                    </Stack>
                  </Box>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </GlassPanel>
    </Box>
  );
};

export default MedicationPage;