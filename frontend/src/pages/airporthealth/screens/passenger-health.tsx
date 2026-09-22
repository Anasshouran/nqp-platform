import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Divider from '@mui/material/Divider';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import SearchIcon from '@mui/icons-material/Search';
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import GppGoodIcon from '@mui/icons-material/GppGood';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import BiotechIcon from '@mui/icons-material/Biotech';
import VaccinesIcon from '@mui/icons-material/Vaccines';
import EditNoteIcon from '@mui/icons-material/EditNote';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import * as React from 'react';
import { C, KpiCard, PageTitle, RiskBadge, StatusBadge, SurfaceCard, RiskGauge, StateBox, ProgressBar } from '../shared';
import { PASSENGERS, RISK_FACTORS, VACCINATION } from '../data';

/* =========================== 4. فحص المسافرين =========================== */

export const Screening = () => (
  <Box>
    <PageTitle title="فحص المسافرين" subtitle="مكتب بوابة الفحص الصحي الأساسي والثانوي — نقطة الوصول للمسافرين" />

    <Grid container spacing={2} sx={{ mb: 3 }}>
      <KpiCard icon={<SearchIcon />} value="1,890" label="مفحوصون اليوم" trend="up" trendLabel="+11%" />
      <KpiCard icon={<FactCheckIcon />} value="1,640" label="فحص أساسي" trend="up" trendLabel="+8%" />
      <KpiCard icon={<BiotechIcon />} value="38" label="فحص ثانوي" trend="up" trendLabel="+4" />
      <KpiCard icon={<EditNoteIcon />} value="16" label="تقييم طبي" trend="down" trendLabel="-2" />
      <KpiCard icon={<ImageSearchIcon />} value="86" label="متوسط وقت الفحص" status="ثانية" statusColor={C.success} />
    </Grid>

    <Grid container spacing={3}>
      <Grid item xs={12} lg={7}>
        <SurfaceCard
          title="طابور بوابة الفحص"
          subtitle="أحدث المسافرين المعالجين في النقاط — انقر لفتح ملف المسافر"
          action={<TextField size="small" placeholder="مسح جواز السفر / بحث بالاسم" sx={{ width: 240 }} InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />}
        >
          <TableContainer sx={{ '& th': { fontWeight: 700, fontSize: 12.5 } }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>المسافر</TableCell>
                  <TableCell>الرحلة</TableCell>
                  <TableCell align="center">المقعد</TableCell>
                  <TableCell align="center">الحرارة</TableCell>
                  <TableCell align="center">الأعراض</TableCell>
                  <TableCell align="center">النقاط</TableCell>
                  <TableCell align="center">الحالة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {PASSENGERS.map((p) => (
                  <TableRow key={p.id} hover sx={{ cursor: 'pointer' }}>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700 }}>{p.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{p.passport} · {p.nationality}</Typography>
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{p.flight}</TableCell>
                    <TableCell align="center">{p.seat}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, color: Number(p.temperature.replace('°', '')) >= 37.5 ? C.danger : C.text }}>{p.temperature}</TableCell>
                    <TableCell align="center">{p.symptoms.length ? p.symptoms.join('، ') : <Typography variant="caption" color="text.disabled">—</Typography>}</TableCell>
                    <TableCell align="center">
                      <Chip label={p.score} size="small" sx={{ fontWeight: 700, bgcolor: p.score >= 50 ? C.dangerBg : p.score >= 25 ? C.warningBg : C.successBg, color: p.score >= 50 ? C.danger : p.score >= 25 ? C.warning : C.success }} />
                    </TableCell>
                    <TableCell align="center"><StatusBadge status={p.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </SurfaceCard>
      </Grid>

      <Grid item xs={12} lg={5}>
        <Stack spacing={3}>
          <SurfaceCard title="نقطة الفحص الحرارية — مباشر" subtitle="كاشف الحرارة عن بعد للمسافرين">
            <Box sx={{ position: 'relative', borderRadius: 3, overflow: 'hidden', height: 200, bg: 'linear-gradient(180deg,#0B5CAD,#0E7490)', display: 'grid', placeItems: 'center' }}>
              <Typography variant="h6" sx={{ color: '#DFF1FF', fontWeight: 700 }}>لوحة الكاميرا الحرارية</Typography>
              <Chip label="مباشر — LIVE" size="small" sx={{ position: 'absolute', top: 10, right: 10, bgcolor: C.dangerBg, color: C.danger, fontWeight: 700, '& > span:first-of-type': { animation: 'pulse 1.4s infinite' } }} />
            </Box>
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>قراءة مدخل البوابة (متوسط)</Typography>
              <Box sx={{ mt: 0.75, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: C.success }}>36.7°</Typography>
                <ProgressBar value={42} color={C.success} />
              </Box>
            </Box>
          </SurfaceCard>

          <SurfaceCard title="إجراءات سريعة">
            <Stack spacing={1.25}>
              <Button fullWidth variant="contained" startIcon={<PersonAddIcon />} sx={{ justifyContent: 'flex-start', borderRadius: 2.5 }}>تسجيل مسافر جديد</Button>
              <Button fullWidth variant="outlined" startIcon={<ImageSearchIcon />} sx={{ justifyContent: 'flex-start', borderRadius: 2.5 }}>تحويل إلى فحص ثانوي</Button>
              <Button fullWidth variant="outlined" startIcon={<GppGoodIcon />} sx={{ justifyContent: 'flex-start', borderRadius: 2.5 }}>اصدار قرار الإفراج</Button>
            </Stack>
          </SurfaceCard>
        </Stack>
      </Grid>
    </Grid>
  </Box>
);

/* =========================== 5. الإعلان الصحي =========================== */

export const Declaration = () => (
  <Box>
    <PageTitle title="الإعلان الصحي للمسافرين" subtitle="نموذج إعلان الحالة الصحية — بيانات مطلوبة قبل الوصول للمطار" />

    <Grid container spacing={3}>
      <Grid item xs={12} lg={5}>
        <SurfaceCard title="نموذج الإعلان الصحي" subtitle="تُجمع هيئة حجر المطارات بموجب اللوائح الصحية الدولية 2005">
          <Stack spacing={1.5}>
            {[
              ['الاسم الكامل (كما في الجواز)', 'مثال: محمد الحسن عوض'],
              ['رقم جواز السفر', 'SD-000000'],
              ['رقم الرحلة / تاريخ الوصول', 'TK-577'],
              ['المقعد', '14B'],
            ].map(([label, ph]) => (
              <TextField key={label} label={label} placeholder={ph} size="small" fullWidth variant="outlined" />
            ))}
            <Divider />
            <Typography variant="caption" sx={{ fontWeight: 700, color: C.text }}>هل لديك اليوم أو خلال آخر 14 يوماً؟</Typography>
            {['حمى أو ارتفاع حرارة', 'سعال أو صعوبة تنفس', 'طفح جلدي / اشتباه حمى صفراء', 'مخالطة حالة مؤكدة', 'أعراض مرتبطة بالحمل أو المناعة'].map((q) => (
              <FormControlLabel key={q} control={<Switch size="small" />} label={<Typography variant="body2">{q}</Typography>} />
            ))}
            <Button variant="contained" startIcon={<EditNoteIcon />} sx={{ borderRadius: 2.5 }}>إرسال الإعلان</Button>
          </Stack>
        </SurfaceCard>
      </Grid>

      <Grid item xs={12} lg={7}>
        <SurfaceCard title="الإعلانات المستلمة" subtitle="أحدث الإعلانات الصحية الواردة من المسافرين">
          <TableContainer sx={{ '& th': { fontWeight: 700, fontSize: 12.5 } }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>المسافر</TableCell>
                  <TableCell>الجواز</TableCell>
                  <TableCell>الرحلة</TableCell>
                  <TableCell align="center">إعلان مخاطر</TableCell>
                  <TableCell align="center">حالة التحقق</TableCell>
                  <TableCell align="center">النقاط</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {PASSENGERS.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell sx={{ fontWeight: 700 }}>{p.name}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{p.passport}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{p.flight}</TableCell>
                    <TableCell align="center">
                      {p.declaredRisk
                        ? <Chip label="أقر بوجود أعراض" size="small" sx={{ bgcolor: C.warningBg, color: C.warning, fontWeight: 700, borderRadius: 2 }} />
                        : <Chip label="لا مخاطر معلنة" size="small" sx={{ bgcolor: C.successBg, color: C.success, fontWeight: 700, borderRadius: 2 }} />}
                    </TableCell>
                    <TableCell align="center"><StatusBadge status={p.status} /></TableCell>
                    <TableCell align="center"><b>{p.score}</b></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </SurfaceCard>
      </Grid>
    </Grid>
  </Box>
);

/* ========================== 6. تقييم المخاطر ========================== */

export const RiskAssessment = () => {
  const p = PASSENGERS[0];
  return (
    <Box>
      <PageTitle title="تقييم مخاطر المسافر" subtitle={`نموذج تقييم المخاطر — ${p.name} · رحلة ${p.flight}`} />

      <Grid container spacing={3}>
        <Grid item xs={12} lg={4}>
          <SurfaceCard title="بطاقة المسافر">
            <Stack spacing={0.75}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">الاسم</Typography>
                <Typography sx={{ fontWeight: 700 }}>{p.name}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">الجواز</Typography>
                <Typography sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{p.passport}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">الرحلة</Typography>
                <Typography sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{p.flight}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">الحرارة</Typography>
                <Typography sx={{ fontWeight: 700, color: C.danger }}>{p.temperature}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">الأعراض</Typography>
                <Typography sx={{ fontWeight: 600 }}>{p.symptoms.length ? p.symptoms.join('، ') : '—'}</Typography>
              </Stack>
              <Box sx={{ mt: 0.75 }}><StatusBadge status={p.status} /></Box>
            </Stack>
          </SurfaceCard>
          <Box sx={{ mt: 3 }}>
            <SurfaceCard title="التصنيف الآلي" subtitle="درجة المخاطر الكلية / 100">
              <RiskGauge score={p.score} label="مخاطر مرتفعة" color={C.danger} />
              <Box sx={{ mt: 2, p: 1.5, borderRadius: 2.5, bgcolor: C.dangerBg }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: C.danger }}>
                  ⚠ قرار موصى به: {p.risk === 'HIGH' ? 'تحويل فوري للتقييم الطبي والعزل الاحترازي' : 'متابعة الفحص الثانوي'}
                </Typography>
              </Box>
            </SurfaceCard>
          </Box>
        </Grid>

        <Grid item xs={12} lg={8}>
          <SurfaceCard title="تفاصيل تقييم المخاطر" subtitle="أوزان ومخرجات العوامل حسب سياسة تقييم المخاطر">
            <TableContainer sx={{ '& th': { fontWeight: 700, fontSize: 12.5 } }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>عامل المخاطر</TableCell>
                    <TableCell align="center">الوزن</TableCell>
                    <TableCell align="center">القيمة</TableCell>
                    <TableCell>ملاحظة</TableCell>
                    <TableCell width="28%">الإسهام</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {RISK_FACTORS.map((f) => (
                    <TableRow key={f.factor} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{f.factor}</TableCell>
                      <TableCell align="center">{f.weight}%</TableCell>
                      <TableCell align="center"><b>{f.value}</b></TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{f.note}</Typography></TableCell>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <ProgressBar value={(f.value / f.weight) * 100} color={f.value / f.weight > 0.66 ? C.danger : f.value / f.weight > 0.4 ? C.warning : C.success} />
                          <Typography variant="caption" sx={{ fontWeight: 700, color: f.value / f.weight > 0.66 ? C.danger : f.value / f.weight > 0.4 ? C.warning : C.success }}>{(f.value / f.weight) * 100 | 0}%</Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Box sx={{ mt: 2, p: 2, borderRadius: 3, border: `1px dashed ${C.warning}`, bgcolor: C.warningBg }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: C.warning }}>
                ∑ مجموع الإسهامات يُعادلت مع فئات: &lt;25 منخفض · 25–49 متوسط · ≥50 مرتفع · تشخيص إيجابي = قيد التقييم.
              </Typography>
            </Box>
          </SurfaceCard>
        </Grid>
      </Grid>
    </Box>
  );
};

/* ============================= 7. التطعيم ============================= */

export const Vaccination = () => (
  <Box>
    <PageTitle title="التطعيم والتحقق من الشهادات" subtitle="التحقق من التطعيم الإلزامي (الحمى الصفراء وغيرها) للمسافرين القادمين" />

    <Grid container spacing={3}>
      <Grid item xs={12} lg={8}>
        <SurfaceCard title="دفتر التطعيم للمسافرين" subtitle="حالة التطعيم المسجلة وتوصية الفحص">
          <TableContainer sx={{ '& th': { fontWeight: 700, fontSize: 12.5 } }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>المسافر</TableCell>
                  <TableCell align="center">الجواز</TableCell>
                  <TableCell align="center">الرحلة</TableCell>
                  <TableCell align="center">حالة التطعيم</TableCell>
                  <TableCell align="center">التحقق</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {VACCINATION.map((v) => (
                  <TableRow key={v.passport} hover>
                    <TableCell sx={{ fontWeight: 700 }}>{v.passenger}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{v.passport}</TableCell>
                    <TableCell align="center" sx={{ fontFamily: 'monospace' }}>{PASSENGERS.find((p) => p.passport === v.passport)?.flight || '—'}</TableCell>
                    <TableCell align="center">
                      <Chip label={v.vaccine} size="small" sx={{ fontWeight: 700, borderRadius: 2, bgcolor: v.vaccine === 'مكتمل' ? C.successBg : v.vaccine === 'مؤكد' ? C.successBg : C.warningBg, color: v.vaccine === 'مكتمل' ? C.success : v.vaccine === 'جرعة واحدة مطعومة' ? C.info : C.warning }} />
                    </TableCell>
                    <TableCell align="center">
                      {v.status === 'مؤكد'
                        ? <Chip icon={<CheckCircleIcon sx={{ fontSize: 15 }} />} label={v.status} size="small" color="success" variant="outlined" />
                        : <Chip icon={<HourglassTopIcon sx={{ fontSize: 15 }} />} label={v.status} size="small" color="warning" variant="outlined" />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </SurfaceCard>
      </Grid>

      <Grid item xs={12} lg={4}>
        <Stack spacing={3}>
          <SurfaceCard title="متطلبات الدخول" subtitle="التطعيم الإلزامي للحمى الصفراء">
            <Stack spacing={1}>
              {[
                ['دول موبوءة', 'الأقوى تطبيقاً للقادمين'],
                ['إثبات التطعيم', 'شهادة دولية معتمدة'],
                ['مهلة الاعتماد', '10+ أيام قبل الوصول'],
              ].map(([t, d]) => (
                <Box key={t} sx={{ p: 1.25, borderRadius: 2.5, border: `1px solid ${C.border}`, bgcolor: '#FAFBFD' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}><VaccinesIcon sx={{ fontSize: 15, verticalAlign: '-3px', ml: 0.5 }} />{t}</Typography>
                  <Typography variant="caption" color="text.secondary">{d}</Typography>
                </Box>
              ))}
            </Stack>
          </SurfaceCard>

          <SurfaceCard title="معدل التغطية بالتحقق">
            <Stack spacing={1.25}>
              <Stack direction="row" justifyContent="space-between" sx={{ fontSize: 12.5, fontWeight: 700, color: 'text.secondary' }}>
                <span>تحقق مؤكد</span><Typography sx={{ color: C.success, fontWeight: 700 }}>96%</Typography>
              </Stack>
              <ProgressBar value={96} color={C.success} />
              <Stack direction="row" justifyContent="space-between" sx={{ fontSize: 12.5, fontWeight: 700, color: 'text.secondary' }}>
                <span>يتطلب فحصاً إضافياً</span><Typography sx={{ color: C.warning, fontWeight: 700 }}>3%</Typography>
              </Stack>
              <ProgressBar value={3} color={C.warning} />
            </Stack>
          </SurfaceCard>

          <StateBox type="empty" text="التكامل مع نظام السجلات الطبية الوطنى قيد الربط" />
        </Stack>
      </Grid>
    </Grid>
  </Box>
);