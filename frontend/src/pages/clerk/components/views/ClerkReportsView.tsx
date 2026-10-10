// Report shortcuts and exports.
// Extracted from ClerkDashboardPage without behavioural change.
import type { useClerkData } from '../../hooks/useClerkData';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Paper from '@mui/material/Paper';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import SendIcon from '@mui/icons-material/Send';
import PaidIcon from '@mui/icons-material/Paid';
import EditIcon from '@mui/icons-material/Edit';
import InfoIcon from '@mui/icons-material/Info';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import FlightIcon from '@mui/icons-material/Flight';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import KpiCard from '../../../../components/dashboard/KpiCard';

type Props = {
  data: Pick<ReturnType<typeof useClerkData>, 'counts' | 'shipments'>;
};

export const ClerkReportsView = ({ data }: Props) => {
  const { counts, shipments } = data;
  return (
    <>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Card variant="outlined" sx={{ borderRadius: 3 }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>التقارير — رقابة الأغذية</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>مؤشرات محسوبة من بيانات الطلبات الحالية.</Typography>
                      <Paper variant="outlined" sx={{ p: 1.5, mb: 3, borderRadius: 2, bgcolor: 'rgba(12,127,106,0.04)' }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <InfoIcon fontSize="small" color="info" />
                          <Typography variant="caption" color="text.secondary">
                            مؤشرات الوارد والصادر والرسوم تُحسب من أحدث {shipments.length} طلب محمّل في اللوحة.
                          </Typography>
                        </Stack>
                      </Paper>
                      <Grid container spacing={1.5}>
                        <Grid item xs={12} sm={6} lg={3}>
                          <KpiCard
                            label="الوارد"
                            value={shipments.filter((s) => s.shipment_type === 'IMPORT').length}
                            icon={<MoveToInboxIcon />}
                            hint="من الطلبات المحمّلة"
                            accent="#0c7f6a"
                          />
                        </Grid>
                        <Grid item xs={12} sm={6} lg={3}>
                          <KpiCard
                            label="الصادر"
                            value={shipments.filter((s) => s.shipment_type === 'EXPORT').length}
                            icon={<SendIcon />}
                            hint="من الطلبات المحمّلة"
                            accent="#0a6b58"
                          />
                        </Grid>
                        <Grid item xs={12} sm={6} lg={3}>
                          <KpiCard label="المسودات" value={counts.drafts} icon={<EditIcon />} hint="بانتظار الإرسال" accent="#8c6d1f" />
                        </Grid>
                        <Grid item xs={12} sm={6} lg={3}>
                          <KpiCard
                            label="إجمالي الرسوم"
                            value={`${shipments.reduce((sum, s) => sum + Number(s.fee_preview?.total ?? 0), 0).toLocaleString('ar-EG')} ج.س`}
                            icon={<PaidIcon />}
                            hint="تقديرية — من الطلبات المحمّلة"
                            accent="#6f5516"
                          />
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>التوزيع حسب الحالة</Typography>
                      <Stack spacing={1.5}>
                        {[
                          { label: 'مسودات', value: counts.drafts, color: '#8c6d1f' },
                          { label: 'بانتظار الرسوم', value: counts.submitted, color: '#6f5516' },
                          { label: 'بانتظار المراجعة', value: counts.underReview, color: '#a86400' },
                          { label: 'قيد الفحص', value: counts.inspection, color: 'primary.main' },
                          { label: 'بانتظار المعدل', value: counts.sampling, color: '#12a585' },
                          { label: 'مرفوضة', value: counts.rejected, color: 'error.main' },
                        ].map((row) => (
                          <Stack key={row.label} direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1.25, borderRadius: 2, border: '1px solid rgba(16,40,34,0.07)' }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: row.color }} />
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>{row.label}</Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{row.value}</Typography>
                          </Stack>
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>التوزيع حسب وسيلة النقل</Typography>
                      <Stack spacing={1.5}>
                        {[
                          { label: 'بحري (باخرة)', icon: <DirectionsBoatIcon />, count: shipments.filter((s) => s.vessel_name && !s.vessel_name.includes('شاحنة') && !s.vessel_name.includes('طائرة') && !s.vessel_name.includes('جوي')).length },
                          { label: 'بري (شاحنة)', icon: <LocalShippingIcon />, count: shipments.filter((s) => s.vessel_name?.includes('شاحنة')).length },
                          { label: 'جوي (طائرة)', icon: <FlightIcon />, count: shipments.filter((s) => s.vessel_name?.includes('طائرة') || s.vessel_name?.includes('جوي') || s.vessel_name?.includes('طيران')).length },
                        ].map((row) => (
                          <Stack key={row.label} direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1.25, borderRadius: 2, border: '1px solid rgba(16,40,34,0.07)' }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Box sx={{ color: 'primary.main', display: 'grid', placeItems: 'center' }}>{row.icon}</Box>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>{row.label}</Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{row.count}</Typography>
                          </Stack>
                        ))}
                      </Stack>
                      <Paper variant="outlined" sx={{ p: 1.5, mt: 2, borderRadius: 2, bgcolor: 'rgba(12,127,106,0.04)' }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <InfoIcon fontSize="small" color="info" />
                          <Typography variant="caption" color="text.secondary">التقارير مبنية على بيانات الطلبات الحالية — يمكن تصديرها كـ PDF أو Excel.</Typography>
                        </Stack>
                      </Paper>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
    </>
  );
};
