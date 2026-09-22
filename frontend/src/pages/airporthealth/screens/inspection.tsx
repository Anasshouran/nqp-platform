import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import AirplaneTicketIcon from '@mui/icons-material/AirplaneTicket';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import VerifiedIcon from '@mui/icons-material/Verified';
import DescriptionIcon from '@mui/icons-material/Description';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import { C, PageTitle, SurfaceCard, ProgressBar, StateBox, RiskBadge } from '../shared';
import { INSPECTION_AIRCRAFT, INSPECTION_CHECKLIST, ANALYTICS, CERTIFICATES } from '../data';

/* ============================ 13. تفتيش الطائرات ============================ */

export const Inspection = () => {
  const pass = INSPECTION_CHECKLIST.filter((i) => i.result === 'PASS').length;
  const fail = INSPECTION_CHECKLIST.filter((i) => i.result === 'FAIL').length;
  const na = INSPECTION_CHECKLIST.filter((i) => i.result === 'NA').length;
  const score = Math.round((pass / (pass + fail)) * 100);
  return (
    <Box>
      <PageTitle title="تفتيش الطائرات" subtitle={`فحص النظافة البيئية للطائرة ${INSPECTION_AIRCRAFT.registration} — المفتش ${INSPECTION_AIRCRAFT.inspector}`} />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}><KpiInline icon={<AirplaneTicketIcon />} value={String(pass)} label="بنود مجتازة" color={C.success} /></Grid>
        <Grid item xs={12} sm={6} md={3}><KpiInline icon={<CleaningServicesIcon />} value={String(fail)} label="بنود مرفوضة" color={C.danger} /></Grid>
        <Grid item xs={12} sm={6} md={3}><KpiInline icon={<RemoveCircleOutlineIcon />} value={String(na)} label="غير مطبقة" color={C.textMuted} /></Grid>
        <Grid item xs={12} sm={6} md={3}><KpiInline icon={<VerifiedIcon />} value={`${score}%`} label="درجة الفحص الكلية" color={score >= 80 ? C.success : C.warning} /></Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <SurfaceCard title="قائمة الفحص البيئي للطائرة" subtitle={`${INSPECTION_AIRCRAFT.airline} · ${INSPECTION_AIRCRAFT.origin} → ${INSPECTION_AIRCRAFT.destination} · الوصول ${INSPECTION_AIRCRAFT.arrival}`}>
            <TableContainer sx={{ '& th': { fontWeight: 700, fontSize: 12.5 } }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>البند</TableCell>
                    <TableCell align="center">النتيجة</TableCell>
                    <TableCell>ملاحظة المفتش</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {INSPECTION_CHECKLIST.map((i) => (
                    <TableRow key={i.item} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{i.item}</TableCell>
                      <TableCell align="center">
                        <Chip
                          icon={i.result === 'PASS' ? <CheckCircleIcon sx={{ fontSize: 15 }} /> : i.result === 'FAIL' ? <CancelIcon sx={{ fontSize: 15 }} /> : <RemoveCircleOutlineIcon sx={{ fontSize: 15 }} />}
                          label={i.result === 'PASS' ? 'مطابق' : i.result === 'FAIL' ? 'مرفوض' : 'غير مطبّق'}
                          size="small"
                          sx={{ fontWeight: 700, borderRadius: 2, bgcolor: i.result === 'PASS' ? C.successBg : i.result === 'FAIL' ? C.dangerBg : '#F3F4F6', color: i.result === 'PASS' ? C.success : i.result === 'FAIL' ? C.danger : C.textMuted }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color={i.result === 'FAIL' ? C.danger : 'text.secondary'} sx={{ fontWeight: i.result === 'FAIL' ? 800 : 500 }}>{i.note}</Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Box sx={{ mt: 2, p: 2, borderRadius: 3, bgcolor: fail > 0 ? C.dangerBg : C.successBg }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: fail > 0 ? C.danger : C.success }}>
                {fail > 0 ? `⚠ يوجد ${fail} بند(اً) مرفوضاً — يلزم معالجة النفايات قبل الفسح النهائي للطائرة.` : 'الطائرة مطابقة صحياً — يُسمح بالفسح.'}
              </Typography>
            </Box>
          </SurfaceCard>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Stack spacing={3}>
            <SurfaceCard title="بيانات الفحص">
              <Stack spacing={0.9}>
                {[
                  ['التسجيل', INSPECTION_AIRCRAFT.registration],
                  ['الرحلة', INSPECTION_AIRCRAFT.flight],
                  ['المفتش', INSPECTION_AIRCRAFT.inspector],
                  ['التاريخ', INSPECTION_AIRCRAFT.date],
                ].map(([k, v]) => (
                  <Stack key={k} direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">{k}</Typography>
                    <Typography sx={{ fontWeight: 700 }}>{v}</Typography>
                  </Stack>
                ))}
                <Button variant="contained" startIcon={<VerifiedIcon />} sx={{ mt: 1, borderRadius: 2.5 }} disabled={fail > 0}>إصدار شهادة فسح</Button>
              </Stack>
            </SurfaceCard>
            <SurfaceCard title="نتيجة تقييم المفتش" subtitle="نسبة الاجتياز">
              <Stack direction="row" alignItems="center" gap={2}>
                <Typography variant="h3" sx={{ fontWeight: 700, color: score >= 80 ? C.success : C.warning }}>{score}%</Typography>
                <Box sx={{ flex: 1 }}><ProgressBar value={score} color={score >= 80 ? C.success : C.warning} /></Box>
              </Stack>
            </SurfaceCard>
            <StateBox type="empty" text="فواتير الفحص القادمة (المسلحية القادمة) تُدار من جدول الرحلات" />
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

const KpiInline = ({ icon, value, label, color }: { icon: React.ReactNode; value: string; label: string; color: string }) => (
  <Box sx={{ p: 2, borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: C.surface, boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 8px 24px rgba(17,24,39,0.05)' }}>
    <Stack direction="row" alignItems="center" gap={1.5}>
      <Box sx={{ width: 40, height: 40, borderRadius: 2.5, display: 'grid', placeItems: 'center', bgcolor: `${color}1A`, color, flexShrink: 0 }}>{icon}</Box>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700, color }}>{value}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{label}</Typography>
      </Box>
    </Stack>
  </Box>
);

/* ============================== 14. التحليلات ============================== */

export const Analytics = () => (
  <Box>
    <PageTitle title="التحليلات والإحصاءات" subtitle="مؤشرات أداء الفحص والمختبر وتفتيش الطائرات خلال الفترات الأخيرة" />

    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} lg={7}>
        <SurfaceCard title="المسافرون المفحوصون خلال اليوم" subtitle="بالآلاف حسب فترات المراقبة">
          <LineChart data={ANALYTICS.screening.labels.map((l, i) => ({ l, v: ANALYTICS.screening.values[i] }))} height={220} />
        </SurfaceCard>
      </Grid>
      <Grid item xs={12} lg={5}>
        <SurfaceCard title="الرحلات اليومية (آخر أسبوع)">
          <LineChart data={ANALYTICS.flightsPerDay.labels.map((l, i) => ({ l, v: ANALYTICS.flightsPerDay.values[i] }))} height={220} color={C.medicalBlue} />
        </SurfaceCard>
      </Grid>
    </Grid>

    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} lg={4}>
        <SurfaceCard title="توزيع المخاطر">
          <Box sx={{ display: 'grid', placeItems: 'center' }}>
            <RiskDoughnut />
          </Box>
          <RiskLegend />
        </SurfaceCard>
      </Grid>
      <Grid item xs={12} lg={4}>
        <SurfaceCard title="اختبارات المختبر" subtitle="النسبة حسب نوع الاختبار">
          <Box sx={{ display: 'grid', placeItems: 'center' }}>
            <RiskDoughnut variant="lab" />
          </Box>
          <LabLegend />
        </SurfaceCard>
      </Grid>
      <Grid item xs={12} lg={4}>
        <SurfaceCard title="الإيجابيات الأسبوعية" subtitle="العدد المكتشف أسبوعياً">
          <BarChart data={ANALYTICS.positivesByWeek.labels.map((l, i) => ({ l, v: ANALYTICS.positivesByWeek.values[i] }))} height={180} color={C.danger} />
        </SurfaceCard>
      </Grid>
    </Grid>

    <Grid container spacing={3}>
      <Grid item xs={12}>
        <SurfaceCard title="نتائج التفتيش البيئي" subtitle="اجتياز / رفض بنود تفتيش الطائرات">
          <GroupedBars labels={ANALYTICS.inspectionResults.labels} pass={ANALYTICS.inspectionResults.pass} fail={ANALYTICS.inspectionResults.fail} height={200} />
        </SurfaceCard>
      </Grid>
    </Grid>
  </Box>
);

const LineChart = ({ data, height, color = C.primary }: { data: { l: string; v: number }[]; height: number; color?: string }) => {
  const max = Math.max(...data.map((d) => d.v)) * 1.15;
  const W = 600, H = height;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * (W - 40) + 20;
    const y = H - 30 - (d.v / max) * (H - 60);
    return { x, y, ...d };
  });
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H + 30}>
      {[0.25, 0.5, 0.75, 1].map((g) => {
        const y = H - 30 - g * (H - 60);
        return <line key={g} x1={20} x2={W - 20} y1={y} y2={y} stroke="#EDF0F4" strokeWidth={1} />;
      })}
      <path d={line} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p) => <circle key={p.l} cx={p.x} cy={p.y} r={4} fill={color} stroke="#fff" strokeWidth={2} />)}
      {pts.map((p, i) => <text key={`t${i}`} x={p.x} y={H - 8} textAnchor="middle" fontSize={11} fill={C.textMuted}>{p.l}</text>)}
      {pts.map((p, i) => <text key={`v${i}`} x={p.x} y={p.y - 10} textAnchor="middle" fontSize={11} fontWeight={800} fill={color}>{p.v}</text>)}
    </svg>
  );
};

const RiskDoughnut = ({ variant = 'risk' }: { variant?: 'risk' | 'lab' }) => {
  const data = variant === 'risk'
    ? ([7420, 860, 118, 22].map((v, i) => ({ v, color: [C.success, C.warning, C.danger, C.medicalBlue][i] })))
    : ([48, 31, 7, 5].map((v, i) => ({ v, color: [C.primary, C.medicalBlue, C.warning, C.medicalGreen][i] })));
  const total = data.reduce((s, d) => s + d.v, 0);
  let acc = 0;
  return (
    <svg width={170} height={170} viewBox="0 0 120 120">
      {data.map((d, i) => {
        const frac = (d.v / total) * 260;
        const seg = <circle key={i} cx="60" cy="60" r="48" fill="none" stroke={d.color} strokeWidth="16" strokeDasharray={`${frac} 260`} strokeDashoffset={-acc} transform="rotate(-90 60 60)" strokeLinecap="round" />;
        acc += frac;
        return seg;
      })}
    </svg>
  );
};

const RiskLegend = () => (
  <Stack direction="row" spacing={1.5} justifyContent="center" sx={{ mt: 1 }}>
    {[['منخفض', 7420, C.success], ['متوسط', 860, C.warning], ['مرتفع', 118, C.danger], ['قيد', 22, C.medicalBlue]].map(([l, v, c]) => (
      <Stack key={l as string} alignItems="center" sx={{ fontSize: 11.5 }}>
        <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: c as string }} />
        <Typography variant="caption" sx={{ fontWeight: 700 }}>{l}</Typography>
        <Typography variant="caption" color="text.secondary">{v}</Typography>
      </Stack>
    ))}
  </Stack>
);

const LabLegend = () => (
  <Stack direction="row" spacing={1.5} justifyContent="center" sx={{ mt: 1 }}>
    {[['مستضد', 48, C.primary], ['PCR', 31, C.medicalBlue], ['ثقافة', 7, C.warning], ['أخرى', 5, C.medicalGreen]].map(([l, v, c]) => (
      <Stack key={l as string} alignItems="center" sx={{ fontSize: 11.5 }}>
        <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: c as string }} />
        <Typography variant="caption" sx={{ fontWeight: 700 }}>{l}</Typography>
        <Typography variant="caption" color="text.secondary">{v}</Typography>
      </Stack>
    ))}
  </Stack>
);

const BarChart = ({ data, height, color }: { data: { l: string; v: number }[]; height: number; color: string }) => {
  const max = Math.max(...data.map((d) => d.v)) * 1.2;
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, height, pt: 2 }}>
      {data.map((d) => (
        <Stack key={d.l} alignItems="center" sx={{ flex: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color }}>{d.v}</Typography>
          <Box sx={{ width: '100%', maxWidth: 42, height: (d.v / max) * (height - 60), borderRadius: '8px 8px 4px 4px', bgcolor: color }} />
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mt: 0.5 }}>{d.l}</Typography>
        </Stack>
      ))}
    </Box>
  );
};

const GroupedBars = ({ labels, pass, fail, height }: { labels: string[]; pass: number[]; fail: number[]; height: number }) => {
  const max = Math.max(...pass, ...fail) * 1.15;
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2, height, pt: 2, px: 1 }}>
      {labels.map((l, i) => (
        <Stack key={l} alignItems="center" sx={{ flex: 1 }}>
          <Stack direction="row" alignItems="flex-end" gap={0.6}>
            <Box sx={{ width: 22, height: (pass[i] / max) * (height - 62), borderRadius: '6px 6px 2px 2px', bgcolor: C.success }} />
            <Box sx={{ width: 22, height: Math.max(3, (fail[i] / max) * (height - 62)), borderRadius: '6px 6px 2px 2px', bgcolor: C.danger }} />
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mt: 0.5 }}>{l}</Typography>
        </Stack>
      ))}
      <Stack sx={{ justifyContent: 'flex-end', gap: 0.5, alignItems: 'flex-start', fontSize: 11.5 }}>
        <Stack direction="row" spacing={0.5} alignItems="center"><Box sx={{ width: 10, height: 10, borderRadius: 2, bgcolor: C.success }} /><Typography variant="caption" sx={{ fontWeight: 700 }}>مطابق</Typography></Stack>
        <Stack direction="row" spacing={0.5} alignItems="center"><Box sx={{ width: 10, height: 10, borderRadius: 2, bgcolor: C.danger }} /><Typography variant="caption" sx={{ fontWeight: 700 }}>مرفوض</Typography></Stack>
      </Stack>
    </Box>
  );
};

/* ============================= 15. الشهادات ============================= */

export const Certificates = () => (
  <Box>
    <PageTitle title="الشهادات والفسوحات الصحية" subtitle="إصدار الشهادات الصحية وفسوح الطائرات وفق اللوائح الصحية الدولية" />

    <Grid container spacing={2} sx={{ mb: 3 }}>
      <KpiInline icon={<AssessmentIcon />} value="3,420" label="شهادات مصدرة هذا الشهر" color={C.primary} />
      <KpiInline icon={<DescriptionIcon />} value="18" label="قيد المراجعة" color={C.warning} />
      <KpiInline icon={<VerifiedIcon />} value="99.2%" label="نسبة الإصدار الآلي" color={C.success} />
      <KpiInline icon={<DescriptionIcon />} value="44" label="فسوحات طائرات" color={C.medicalBlue} />
    </Grid>

    <Grid container spacing={3}>
      <Grid item xs={12} lg={8}>
        <SurfaceCard title="أحدث الشهادات" subtitle="السجلات الصحية الصادرة بعد الفحص">
          <TableContainer sx={{ '& th': { fontWeight: 700, fontSize: 12.5 } }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>الرقم</TableCell>
                  <TableCell>النوع</TableCell>
                  <TableCell>الحامل</TableCell>
                  <TableCell align="center">الإصدار</TableCell>
                  <TableCell align="center">الصلاحية</TableCell>
                  <TableCell align="center">الحالة</TableCell>
                  <TableCell align="center">إجراء</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {CERTIFICATES.map((c) => (
                  <TableRow key={c.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{c.id}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{c.type}</TableCell>
                    <TableCell>{c.holder}</TableCell>
                    <TableCell align="center">{c.issued}</TableCell>
                    <TableCell align="center">{c.validUntil}</TableCell>
                    <TableCell align="center">
                      <Chip label={c.status} size="small" sx={{ fontWeight: 700, borderRadius: 2, bgcolor: c.status === 'سارية' || c.status === 'صادرة' ? C.successBg : C.warningBg, color: c.status === 'سارية' || c.status === 'صادرة' ? C.success : C.warning }} />
                    </TableCell>
                    <TableCell align="center"><Button size="small" variant="outlined" sx={{ minWidth: 0, px: 1 }}>عرض</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </SurfaceCard>
      </Grid>

      <Grid item xs={12} lg={4}>
        <Stack spacing={3}>
          <SurfaceCard title="التحقق من الشهادة" subtitle="رقم الشهادة الدولية">
            <Stack spacing={1.25}>
              <Box sx={{ p: 1.5, borderRadius: 2.5, border: `1px dashed ${C.border}`, textAlign: 'center' }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: C.primary, fontFamily: 'monospace' }}>CD-51122</Typography>
                <Typography variant="caption" color="text.secondary">شهادة خلو من الأمراض — صالحة حتى 2026-11-13</Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button variant="contained" startIcon={<VerifiedIcon />} sx={{ flex: 1, borderRadius: 2.5 }}>التحقق</Button>
                <Button variant="outlined" startIcon={<DescriptionIcon />} sx={{ flex: 1, borderRadius: 2.5 }}>طباعة</Button>
              </Stack>
            </Stack>
          </SurfaceCard>
          <StateBox type="empty" text="ربط التصديق الرقمي مع اللوائح الصحية الدولية قيد الإعداد" />
        </Stack>
      </Grid>
    </Grid>
  </Box>
);