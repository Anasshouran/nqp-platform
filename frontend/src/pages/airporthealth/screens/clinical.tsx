import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import BiotechIcon from '@mui/icons-material/Biotech';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import MedicalInformationIcon from '@mui/icons-material/MedicalInformation';
import GroupsIcon from '@mui/icons-material/Groups';
import EmergencyIcon from '@mui/icons-material/Campaign';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PhoneForwardedIcon from '@mui/icons-material/PhoneForwarded';
import BloodtypeIcon from '@mui/icons-material/Bloodtype';
import { C, KpiCard, PageTitle, RiskBadge, StatusBadge, SurfaceCard, RiskGauge, StateBox, ProgressBar } from '../shared';
import { PASSENGERS, LAB_ORDERS, LAB_FLOW, LAB_DASHBOARD, CONTACT_TRACE, ISOLATION_CASES, EMERGENCY } from '../data';

/* ========================== 8. الحالات المشتبهة ========================== */

export const Suspected = () => {
  const suspects = PASSENGERS.filter((p) => p.status !== 'CLEARED' && p.score >= 25);
  return (
    <Box>
      <PageTitle title="الحالات المشتبهة" subtitle="تابع الحالات المحالة للفحص التفصيلي وإدارة قرارات العزل" />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <KpiCard icon={<WarningAmberIcon />} value="12" label="مشتبهة اليوم" trend="up" trendLabel="+2" status="يتطلب متابعة" statusColor={C.danger} />
        <KpiCard icon={<BloodtypeIcon />} value="5" label="قيد التقييم الطبي" status="نشطة" statusColor={C.warning} />
        <KpiCard icon={<GroupsIcon />} value="38" label="مخالطون رصدوا" trend="up" trendLabel="+9" />
        <KpiCard icon={<LocalHospitalIcon />} value="3" label="في العزل" status="نشطة" statusColor={C.primary} />
      </Grid>

      <SurfaceCard
        title="قائمة الحالات المشتبهة"
        subtitle="مرتبة حسب أولوية المتابعة — أعلى درجة مخاطر أولاً"
        action={<Button size="small" variant="outlined" startIcon={<MedicalInformationIcon />}>فتح نموذج تقييم</Button>}
      >
        <TableContainer sx={{ '& th': { fontWeight: 700, fontSize: 12.5 } }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>الحالة</TableCell>
                <TableCell>الجواز</TableCell>
                <TableCell align="center">الرحلة</TableCell>
                <TableCell align="center">الحرارة</TableCell>
                <TableCell align="center">الأعراض</TableCell>
                <TableCell align="center">التعرض</TableCell>
                <TableCell align="center">النقاط</TableCell>
                <TableCell align="center">الحالة</TableCell>
                <TableCell align="center">إجراء</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {suspects.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell sx={{ fontWeight: 700 }}>{p.name}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{p.passport}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{p.flight}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, color: Number(p.temperature.replace('°', '')) >= 37.5 ? C.danger : C.warning }}>{p.temperature}</TableCell>
                  <TableCell align="center">{p.symptoms.length ? p.symptoms.join('، ') : '—'}</TableCell>
                  <TableCell align="center">{p.exposure ? <Chip label="نعم" size="small" sx={{ bgcolor: C.dangerBg, color: C.danger, fontWeight: 700 }} /> : '—'}</TableCell>
                  <TableCell align="center"><b>{p.score}</b></TableCell>
                  <TableCell align="center"><StatusBadge status={p.status} /></TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5}>
                      <Button size="small" variant="contained" sx={{ minWidth: 0, px: 1 }}>تقييم</Button>
                      <Button size="small" variant="outlined" sx={{ minWidth: 0, px: 1 }}>تحويل</Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </SurfaceCard>
    </Box>
  );
};

/* ============================= 9. العزل ============================= */

export const Isolation = () => (
  <Box>
    <PageTitle title="إدارة العزل" subtitle="وحدة عزل الطوارئ الصحية بجوار الطيران — السعة والحالات والإشراف الطبي" />

    <Grid container spacing={2} sx={{ mb: 3 }}>
      <KpiCard icon={<HealthAndSafetyIcon />} value="3" label="قيد العزل" status="من أصل 12 سريراً" statusColor={C.primary} />
      <KpiCard icon={<BiotechIcon />} value="9" label="سرير متاح" status="القدرة التشغيلية 75%" statusColor={C.success} />
      <KpiCard icon={<HealthAndSafetyIcon />} value="45" label="معدل شغل اليوم" trend="flat" trendLabel="0%" />
    </Grid>

    <Grid container spacing={3}>
      <Grid item xs={12} lg={7}>
        <SurfaceCard title="حالات القبول" subtitle="الحالات المودعة في العزل حالياً">
          <TableContainer sx={{ '& th': { fontWeight: 700, fontSize: 12.5 } }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>الحالة</TableCell>
                  <TableCell align="center">الغرفة</TableCell>
                  <TableCell align="center">منذ</TableCell>
                  <TableCell align="center">الحرارة</TableCell>
                  <TableCell align="center">حالة المتابعة</TableCell>
                  <TableCell align="center">إجراء</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ISOLATION_CASES.map((c) => (
                  <TableRow key={c.room} hover>
                    <TableCell sx={{ fontWeight: 700 }}>{c.name}</TableCell>
                    <TableCell align="center" sx={{ fontFamily: 'monospace', fontWeight: 700, color: C.primary }}>{c.room}</TableCell>
                    <TableCell align="center">{c.start}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>{c.temperature}</TableCell>
                    <TableCell align="center">
                      <Chip label={c.status} size="small" sx={{ fontWeight: 700, borderRadius: 2, bgcolor: c.status === 'قيد العزل' ? C.warningBg : C.infoBg, color: c.status === 'قيد العزل' ? C.warning : C.info }} />
                    </TableCell>
                    <TableCell align="center"><Button size="small" variant="outlined" sx={{ minWidth: 0, px: 1 }}>خروج</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </SurfaceCard>
      </Grid>

      <Grid item xs={12} lg={5}>
        <Stack spacing={3}>
          <SurfaceCard title="قدرة الوحدة" subtitle="حوادث العزل (الغرف المخصصة)">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ flex: 1 }}>
                <ProgressBar value={(3 / 8) * 100} color={C.primary} />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>3 من 8 قيد الاستخدام</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: C.primary }}>37%</Typography>
            </Box>
          </SurfaceCard>

          <SurfaceCard title="الإشراف الطبي" subtitle="فريق متابعة الحالات">
            <Stack spacing={1} divider={<Divider />}>
              {[
                ['د. هالة محمد', 'طبيبة حجر صحي — مشرفة'],
                ['د. ريتا قاسم', 'استشارية صحة عامة'],
                ['تمّة مستشفى مطار الخرطوم', 'إحالة طوارئ'],
              ].map(([n, r]) => (
                <Stack key={n} direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{n}</Typography>
                    <Typography variant="caption" color="text.secondary">{r}</Typography>
                  </Box>
                  <Chip label="متاح" size="small" sx={{ bgcolor: C.successBg, color: C.success, fontWeight: 700 }} />
                </Stack>
              ))}
            </Stack>
          </SurfaceCard>
        </Stack>
      </Grid>
    </Grid>
  </Box>
);

/* ============================= 10. المختبر ============================= */

export const Lab = () => (
  <Box>
    <PageTitle title="مختبر الصحة بالمطار" subtitle="إدارة أوامر التحاليل والعينات ونتائج RT-PCR والمستضد السريع" />

    <Grid container spacing={2} sx={{ mb: 3 }}>
      {(Object.entries(LAB_DASHBOARD) as [string, number][]).map(([k, v]) => {
        const meta: Record<string, { label: string; color: string }> = {
          pending: { label: 'بانتظار السحب', color: C.primary },
          collected: { label: 'عيّنات مجمعة', color: C.info },
          inLab: { label: 'قيد التحليل', color: C.warning },
          resultsReady: { label: 'نتائج جاهزة', color: C.success },
          positive: { label: 'موجبة', color: C.danger },
          critical: { label: 'حرجة', color: C.danger },
        };
        return <KpiCard key={k} icon={<BiotechIcon />} value={String(v)} label={meta[k].label} status={k === 'critical' ? 'يحتاج إبلاغ' : undefined} statusColor={C.danger} />;
      })}
    </Grid>

    <Grid container spacing={3}>
      <Grid item xs={12} lg={7}>
        <SurfaceCard title="أوامر التحاليل المفتوحة" subtitle="سير العمل من الإحالة حتى النتيجة">
          <TableContainer sx={{ '& th': { fontWeight: 700, fontSize: 12.5 } }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>الأمر</TableCell>
                  <TableCell>الجهة</TableCell>
                  <TableCell>الرحلة</TableCell>
                  <TableCell>نوع الاختبار</TableCell>
                  <TableCell align="center">طلب في</TableCell>
                  <TableCell align="center">الحالة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {LAB_ORDERS.map((o) => {
                  const s = o.status === 'PENDING' ? { l: 'بانتظار', c: C.primary } : o.status === 'COLLECTED' ? { l: 'مجرى', c: C.info } : o.status === 'IN_LAB' ? { l: 'قيد التحليل', c: C.warning } : o.status === 'RESULT_READY' ? { l: 'نتيجة', c: C.success } : o.status === 'POSITIVE' ? { l: 'موجبة', c: C.danger } : { l: 'حرجة', c: C.danger };
                  return (
                    <TableRow key={o.id} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{o.id}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{o.passenger}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{o.flight}</TableCell>
                      <TableCell>{o.test}</TableCell>
                      <TableCell align="center">{o.requestedAt}</TableCell>
                      <TableCell align="center"><Chip label={s.l} size="small" sx={{ bgcolor: `${s.c}1A`, color: s.c, fontWeight: 700, borderRadius: 2 }} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </SurfaceCard>
      </Grid>

      <Grid item xs={12} lg={5}>
        <Stack spacing={3}>
          <SurfaceCard title="سير العمل" subtitle="خريطة معالجة العينة">
            <Stepper activeStep={3} orientation="vertical">
              {LAB_FLOW.map((f) => (
                <Step key={f}><StepLabel>{f}</StepLabel></Step>
              ))}
            </Stepper>
          </SurfaceCard>

          <SurfaceCard title="حالة الجهاز" subtitle="أجهزة التحليل في المختبر">
            <Stack spacing={1.25}>
              {[
                ['RT-PCR — GeneXpert', 'تعمل', C.success],
                ['مستضد سريع — كاشفات', 'تعمل', C.success],
                ['ثقافة / حساسية', 'صيانة مجدولة', C.warning],
              ].map(([n, s, c]) => (
                <Stack key={n as string} direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1.1, borderRadius: 2.5, border: `1px solid ${C.border}` }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{n}</Typography>
                  <Chip label={s} size="small" sx={{ bgcolor: `${c}1A`, color: c as string, fontWeight: 700 }} />
                </Stack>
              ))}
            </Stack>
          </SurfaceCard>
        </Stack>
      </Grid>
    </Grid>
  </Box>
);

/* ========================= 11. تتبع المخالطين ========================= */

export const ContactTracing = () => (
  <Box>
    <PageTitle title="تتبع المخالطين" subtitle={`الحالة المؤشرة: ${CONTACT_TRACE.index} · رحلة ${CONTACT_TRACE.flight} · الطائرة ${CONTACT_TRACE.aircraft}`} />

    <Grid container spacing={2} sx={{ mb: 3 }}>
      <KpiCard icon={<GroupsIcon />} value={String(CONTACT_TRACE.contacts.length)} label="مخالطون في خريطة الرحلة" trend="up" trendLabel="+2" />
      <KpiCard icon={<PhoneForwardedIcon />} value="4" label="تم التبليغ" trend="up" trendLabel="+3" />
      <KpiCard icon={<PhoneForwardedIcon />} value="1" label="قيد التبليغ" status="يحتاج إنهاء" statusColor={C.warning} />
    </Grid>

    <Grid container spacing={3}>
      <Grid item xs={12} lg={7}>
        <SurfaceCard title="مخالطو الرحلة" subtitle="حسب قرب المقعد من الحالة المؤشرة (صفين حول المقعد 14B)">
          <TableContainer sx={{ '& th': { fontWeight: 700, fontSize: 12.5 } }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>المقعد</TableCell>
                  <TableCell>المخالط</TableCell>
                  <TableCell align="center">المخاطر</TableCell>
                  <TableCell align="center">تم التبليغ</TableCell>
                  <TableCell align="center">المتابعة</TableCell>
                  <TableCell align="center">إجراء</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {CONTACT_TRACE.contacts.map((c) => (
                  <TableRow key={c.seat} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: c.seat === '14A' ? C.danger : C.primary }}>{c.seat}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{c.name}</TableCell>
                    <TableCell align="center"><RiskBadge risk={c.risk as 'HIGH' | 'MEDIUM' | 'LOW'} /></TableCell>
                    <TableCell align="center">
                      <Chip label={c.notified} size="small" sx={{ fontWeight: 700, bgcolor: c.notified === 'نعم' ? C.successBg : C.warningBg, color: c.notified === 'نعم' ? C.success : C.warning, borderRadius: 2 }} />
                    </TableCell>
                    <TableCell align="center">{c.followUp}</TableCell>
                    <TableCell align="center"><Button size="small" variant="outlined" sx={{ minWidth: 0, px: 1 }} disabled={c.name === 'مجهول'}>{c.name === 'مجهول' ? 'تعريف' : 'متابعة'}</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </SurfaceCard>
      </Grid>

      <Grid item xs={12} lg={5}>
        <Stack spacing={3}>
          <SurfaceCard title="ملف الحالة المؤشرة" subtitle="بيانات التشخيص الأولي">
            <Stack spacing={0.9}>
              {[
                ['الحالة', CONTACT_TRACE.index],
                ['الرحلة / الطائرة', `${CONTACT_TRACE.flight} / ${CONTACT_TRACE.aircraft}`],
                ['المقعد', CONTACT_TRACE.seat],
                ['تاريخ السفر', CONTACT_TRACE.travelDate],
              ].map(([k, v]) => (
                <Stack key={k} direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">{k}</Typography>
                  <Typography sx={{ fontWeight: 700 }}>{v}</Typography>
                </Stack>
              ))}
              <Box sx={{ mt: 1 }}><RiskBadge risk="HIGH" /></Box>
              <Button variant="contained" startIcon={<PhoneForwardedIcon />} sx={{ mt: 1, borderRadius: 2.5 }}>إرسال إشعار إبلاغ جماعي</Button>
            </Stack>
          </SurfaceCard>

          <SurfaceCard title="تغطية التتبع">
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between" sx={{ fontSize: 12.5, fontWeight: 700, color: 'text.secondary' }}><span>التبليغ المكتمل</span><b>80%</b></Stack>
              <ProgressBar value={80} color={C.success} />
              <Stack direction="row" justifyContent="space-between" sx={{ fontSize: 12.5, fontWeight: 700, color: 'text.secondary' }}><span>مخالطون مؤكدون</span><b>75%</b></Stack>
              <ProgressBar value={75} color={C.info} />
            </Stack>
          </SurfaceCard>
        </Stack>
      </Grid>
    </Grid>
  </Box>
);

/* ============================= 12. الطوارئ ============================= */

export const Emergency = () => (
  <Box>
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ mb: 2 }}>
      <PageTitle title="غرفة عمليات الطوارئ" subtitle={`${EMERGENCY.incidentId} · ${EMERGENCY.airport}`} />
      <Chip icon={<NotificationsActiveIcon sx={{ fontSize: 15 }} />} label={`الحالة: ${EMERGENCY.responseStatus}`} sx={{ bgcolor: C.dangerBg, color: C.danger, fontWeight: 700, borderRadius: 2 }} />
    </Stack>

    <Grid container spacing={2} sx={{ mb: 3 }}>
      <KpiCard icon={<EmergencyIcon />} value={EMERGENCY.severity} label="مستوى الخطورة" status="استجابة فورية" statusColor={C.danger} />
      <KpiCard icon={<WarningAmberIcon />} value={String(EMERGENCY.affected)} label="متأثرون" trend="up" trendLabel="+2" />
      <KpiCard icon={<GroupsIcon />} value={EMERGENCY.team} label="فريق الاستجابة" status="في الميدان" statusColor={C.success} />
    </Grid>

    <Grid container spacing={3}>
      <Grid item xs={12} lg={7}>
        <SurfaceCard title="سجل حالة الطوارئ" subtitle="الأحداث المسجلة في غرفة العمليات">
          <Stack spacing={1.25}>
            {[
              ['14:02', 'إبلاغ الطاقم عن مشتبهين بالحمى الصفراء على متن TK-577', C.danger],
              ['14:05', 'تفعيل خطة الطوارئ الصحية — إخلاء الركاب لمنطقة التقييم الطبي', C.warning],
              ['14:09', 'تحويل الحالتين إلى وحدة العزل وتفعيل فريق الاستجابة (A)', C.primary],
              ['14:14', 'بدء تتبع المخالطين ونشر إشعار التبليغ الجماعي', C.info],
              ['14:20', 'طلب عينات RT-PCR عاجلة من المختبر', C.success],
            ].map(([t, e, c]) => (
              <Box key={t as string} sx={{ p: 1.4, borderRadius: 2.5, border: `1px solid ${C.border}`, bgcolor: '#FCFDFD' }}>
                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                  <Chip label={t} size="small" sx={{ bgcolor: `${c}1A`, color: c as string, fontWeight: 700, fontFamily: 'monospace' }} />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{e}</Typography>
                </Stack>
              </Box>
            ))}
          </Stack>
        </SurfaceCard>
      </Grid>

      <Grid item xs={12} lg={5}>
        <Stack spacing={3}>
          <SurfaceCard title="نقاط الاتصال التشغيلية">
            <Stack spacing={1}>
              {[
                ['قيادة المطار', '1909'],
                ['الإسعاف الجوي', '1902'],
                ['استقبال المستشفى', '0155-4411'],
                ['غرفة عمليات وزارة الصحة', '1911'],
              ].map(([n, num]) => (
                <Box key={n} sx={{ p: 1.2, borderRadius: 2.5, border: `1px solid ${C.border}`, bgcolor: '#FAFBFD' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{n}</Typography>
                    <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, color: C.primary, direction: 'ltr' }}>{num}</Typography>
                  </Stack>
                </Box>
              ))}
            </Stack>
          </SurfaceCard>

          <SurfaceCard title="جاهزية الموارد">
            <Stack spacing={1.25}>
              {[['فرق ميدانية', 3, 4], ['معدات وقاية شخصية', 92, 100], ['وحدات إسعاف', 2, 3]].map(([n, v, m]) => (
                <Box key={n as string}>
                  <Stack direction="row" justifyContent="space-between" sx={{ fontSize: 12.5, fontWeight: 700 }}>
                    <span>{n}</span>
                    <Typography sx={{ fontWeight: 700 }}>{String(v)}/{String(m)}</Typography>
                  </Stack>
                  <ProgressBar value={(Number(v) / Number(m)) * 100} color={Number(v) / Number(m) > 0.75 ? C.success : C.warning} />
                </Box>
              ))}
            </Stack>
          </SurfaceCard>

          <StateBox type="empty" text="حدّث خطة الطوارئ عند تشغيل مطار بورتسودان الجديد" />
        </Stack>
      </Grid>
    </Grid>
  </Box>
);