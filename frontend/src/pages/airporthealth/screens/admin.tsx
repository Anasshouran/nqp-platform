import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Divider from '@mui/material/Divider';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import GroupIcon from '@mui/icons-material/Group';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import HistoryIcon from '@mui/icons-material/History';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SecurityIcon from '@mui/icons-material/Security';
import { C, PageTitle, SurfaceCard, StateBox } from '../shared';
import { USERS, AUDIT_LOGS } from '../data';

/* ============================== 16. المستخدمون ============================== */

export const Users = () => (
  <Box>
    <PageTitle title="المستخدمون والأدوار" subtitle="إدارة الوصول إلى نظام الصحة بمطار" />

    <Grid container spacing={2} sx={{ mb: 3 }}>
      {[
        { icon: <GroupIcon />, v: '48', l: 'مستخدمون نشطون', c: C.primary },
        { icon: <AdminPanelSettingsIcon />, v: '9', l: 'أدوار نظام', c: C.medicalBlue },
        { icon: <SecurityIcon />, v: '24', l: 'وضعت أذونات', c: C.medicalGreen },
        { icon: <PersonAddIcon />, v: '3', l: 'بانتظار الاعتماد', c: C.warning },
      ].map(({ icon, v, l, c }) => (
        <Grid item xs={12} sm={6} md={3} key={l}>
          <Box sx={{ p: 2, borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: C.surface, boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 8px 24px rgba(17,24,39,0.05)' }}>
            <Stack direction="row" alignItems="center" gap={1.5}>
              <Box sx={{ width: 40, height: 40, borderRadius: 2.5, display: 'grid', placeItems: 'center', bgcolor: `${c}1A`, color: c, flexShrink: 0 }}>{icon}</Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: c }}>{v}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{l}</Typography>
              </Box>
            </Stack>
          </Box>
        </Grid>
      ))}
    </Grid>

    <SurfaceCard
      title="فريق المحطة الصحية"
      subtitle="مستخدمي النظام حسب الوحدات التشغيلية"
      action={<Button startIcon={<PersonAddIcon />} variant="contained" size="small" sx={{ borderRadius: 2 }}>إضافة مستخدم</Button>}
    >
      <TableContainer sx={{ '& th': { fontWeight: 700, fontSize: 12.5 } }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>الاسم</TableCell>
              <TableCell>الدور</TableCell>
              <TableCell>الوحدة</TableCell>
              <TableCell align="center">الحالة</TableCell>
              <TableCell align="center">آخر نشاط</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {USERS.map((u) => (
              <TableRow key={u.name} hover>
                <TableCell sx={{ fontWeight: 700 }}>{u.name}</TableCell>
                <TableCell>{u.role}</TableCell>
                <TableCell><Chip label={u.area} size="small" sx={{ fontWeight: 700 }} variant="outlined" /></TableCell>
                <TableCell align="center">
                  <Chip label={u.status} size="small" sx={{ fontWeight: 700, borderRadius: 2, bgcolor: u.status === 'نشط' ? C.successBg : C.dangerBg, color: u.status === 'نشط' ? C.success : C.danger }} />
                </TableCell>
                <TableCell align="center" color="text.secondary">اليوم · {['12:48', '11:35', '11:10', '10:42', '09:15'][USERS.findIndex((x) => x.name === u.name)] || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </SurfaceCard>
  </Box>
);

/* ================================ 17. الأدوار ================================ */

export const Roles = () => {
  const roles = [
    { label: 'مسؤول النظام', scope: 'الكل', perms: 24, users: 2 },
    { label: 'طبيب حجر صحي', scope: 'فحص وتقييم طبي', perms: 14, users: 6 },
    { label: 'مفتش حجر صحي', scope: 'تفتيش الطائرات والمرافق', perms: 10, users: 9 },
    { label: 'مسؤول مختبر', scope: 'المختبر والنتائج', perms: 8, users: 4 },
    { label: 'مسجل مدخل', scope: 'تسجيل المسافرين', perms: 6, users: 11 },
    { label: 'مدير محطة', scope: 'كل التشغيل', perms: 20, users: 2 },
    { label: 'مراقب', scope: 'قراءة فقط', perms: 4, users: 14 },
  ];
  return (
    <Box>
      <PageTitle title="الأدوار والأذونات" subtitle="منح الوصول لوحدات نظام الحجر الصحي حسب الدور الوظيفي" />

      <Grid container spacing={2}>
        {roles.map((r) => (
          <Grid item xs={12} sm={6} lg={4} key={r.label}>
            <SurfaceCard>
              <Stack spacing={1.25}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography sx={{ fontWeight: 700, color: C.text }}>{r.label}</Typography>
                  <AdminPanelSettingsIcon sx={{ color: C.primary }} />
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>النطاق: {r.scope}</Typography>
                <Stack direction="row" spacing={1}>
                  <Chip label={`${r.perms} إذن`} size="small" variant="outlined" />
                  <Chip label={`${r.users} مستخدم`} size="small" variant="outlined" />
                </Stack>
                <Stack direction="row" spacing={1}>
                  <Button size="small" variant="outlined" sx={{ flex: 1 }}>تحرير الأذونات</Button>
                  <Button size="small" variant="text">الأعضاء</Button>
                </Stack>
              </Stack>
            </SurfaceCard>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

/* =============================== 18. سجل التدقيق =============================== */

export const AuditLogs = () => (
  <Box>
    <PageTitle title="سجل التدقيق" subtitle="السجل غير القابل للتعديل لأحداث النظام الحساسة" />

    <SurfaceCard title="أحداث النظام" subtitle="آخر العمليات وفق متطلبات مكافحة الفساد وأمن المعلومات">
      <TableContainer sx={{ '& th': { fontWeight: 700, fontSize: 12.5 } }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>الوقت</TableCell>
              <TableCell>المستخدم</TableCell>
              <TableCell>الحدث</TableCell>
              <TableCell>الوحدة</TableCell>
              <TableCell align="center">الحالة</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {AUDIT_LOGS.map((a) => (
              <TableRow key={`${a.time}-${a.action}`} hover>
                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{a.time}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{a.actor}</TableCell>
                <TableCell>{a.action}</TableCell>
                <TableCell><Chip label={a.module} size="small" variant="outlined" /></TableCell>
                <TableCell align="center"><Chip label="مسجّل" size="small" sx={{ bgcolor: C.successBg, color: C.success, fontWeight: 700 }} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </SurfaceCard>
  </Box>
);

/* =============================== 19. الإعدادات =============================== */

export const Settings = () => (
  <Box>
    <PageTitle title="إعدادات النظام" subtitle="تهيئة سلوك النظام وإعدادات التشغيل المحلي" />

    <Grid container spacing={3}>
      <Grid item xs={12} lg={6}>
        <SurfaceCard title="إعدادات التشغيل">
          <Stack spacing={1.5} divider={<Divider />}>
            {[
              ['وضع عدم الاتصال (Offline) للمحطات', 'يعمل النظام على الشبكة الداخلية دون اتصال بالإنترنت', true],
              ['المزامنة التلقائية مع المركز', 'مزامنة البيانات لحظياً إلى المركز الوطني لعلم الأوبئة', true],
              ['طباعة الملصقات فوراً', 'طباعة الباركود لكل عينة بشكل تلقائي', true],
              ['الإبلاغ الجماعي عبر النافذة', 'تفعيل إشعار التبليغ الجماعي للمخالطين', true],
              ['وضع المراقبة الليلية', 'تقليل الفحوصات الضوضائية بعد منتصف الليل', false],
            ].map(([t, d, on]) => (
              <Stack key={t as string} direction="row" justifyContent="space-between" alignItems="center" gap={2}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{t}</Typography>
                  <Typography variant="caption" color="text.secondary">{d}</Typography>
                </Box>
                <Switch defaultChecked={on as boolean} />
              </Stack>
            ))}
            <Button variant="contained" sx={{ alignSelf: 'flex-start', borderRadius: 2.5 }} startIcon={<SettingsSuggestIcon />}>حفظ التغييرات</Button>
          </Stack>
        </SurfaceCard>
      </Grid>

      <Grid item xs={12} lg={6}>
        <Stack spacing={3}>
          <SurfaceCard title="التكاملات">
            <Stack spacing={1} divider={<Divider />}>
              {[
                ['نظام مطار الخرطوم للمسافرين', 'متصل ✓'],
                ['منصة علم الأوبئة متلازمة الجهاز التنفسي', 'متصل مزامنة ✓'],
                ['قاعدة بيانات النفايات الصحية', 'بانتظار الربط'],
                ['منصة اللوائح الصحية الدولية eLAP', 'بانتظار الربط'],
              ].map(([n, s]) => (
                <Stack key={n as string} direction="row" justifyContent="space-between">
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{n}</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: s === 'متصل ✓' || s === 'متصل مزامنة ✓' ? C.success : C.warning }}>{s}</Typography>
                </Stack>
              ))}
            </Stack>
          </SurfaceCard>

          <SurfaceCard title="تنبيهات النظام">
            <Stack spacing={1} divider={<Divider />}>
              {[
                ['نتائج مخبرية موجبة', 'إشعار فوري للمشرف وطبيب الواجب', true],
                ['اكتمال تكدس الفحص (طابور)', 'تنبيه عند تجاوز سعة بوابة الفحص', true],
                ['انتهاء صلاحية الشهادات', 'إشعار قبل 7 أيام من انتهاء الصلاحية', false],
              ].map(([t, d, on]) => (
                <FormControlLabel
                  key={t as string}
                  control={<Switch size="small" defaultChecked={on as boolean} />}
                  label={
                    <Stack spacing={0}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{t}</Typography>
                      <Typography variant="caption" color="text.secondary">{d}</Typography>
                    </Stack>
                  }
                />
              ))}
            </Stack>
          </SurfaceCard>
        </Stack>
      </Grid>
    </Grid>
  </Box>
);

/* ============================== 20. الإشعارات ============================== */

export const NotificationsAdmin = () => (
  <Box>
    <PageTitle title="مركز الإشعارات" subtitle="إعلانات وتنبيهات النظام للوحدات التشغيلية" />

    <Grid container spacing={3}>
      <Grid item xs={12} lg={7}>
        <SurfaceCard title="الإشعارات الأخيرة" subtitle="مرتبة حسب الأولوية والوقت">
          <Stack spacing={1}>
            {[
              { t: '10:12', title: 'نتيجة موجبة RT-PCR', body: 'العينة LO-305 — مخالطة رحلة TK-577', tone: C.danger },
              { t: '09:45', title: 'تنبيه صحة عمومية', body: 'حالتا حمى صفراء مشتبهتان — رحلة TK-577', tone: C.danger },
              { t: '09:20', title: 'طلب فحص ثانوي', body: 'المسافر أحمد إبراهيم — رحلة MS-842', tone: C.warning },
              { t: '08:50', title: 'تقرير جاهز', body: 'نتائج مختبر الصباح متاحة (9 نتائج)', tone: C.success },
              { t: '08:15', title: 'نظام وتحديث أمني', body: 'تم تطبيق تحديث 2.4.1 في منتصف الليل', tone: C.medicalBlue },
            ].map((n) => (
              <Box key={n.t} sx={{ p: 1.4, borderRadius: 2.5, border: `1px solid ${C.border}`, bgcolor: '#FCFDFD' }}>
                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: n.tone, mt: 0.6, flexShrink: 0 }} />
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{n.title}</Typography>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'text.secondary' }}>{n.t}</Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{n.body}</Typography>
                  </Box>
                </Stack>
              </Box>
            ))}
          </Stack>
        </SurfaceCard>
      </Grid>

      <Grid item xs={12} lg={5}>
        <Stack spacing={3}>
          <SurfaceCard title="قنوات الإبلاغ" subtitle="مستويات الإبلاغ النافذة">
            <Stack spacing={1}>
              {([
                ['المشرف المناوب — فوري', NotificationsActiveIcon, C.danger],
                ['غرفة العمليات — فوري', NotificationsActiveIcon, C.warning],
                ['مدير المحطة — موجز يومي', NotificationsActiveIcon, C.primary],
              ] as const).map(([l, I, c]) => {
                const Icon = I as React.ElementType;
                return (
                  <Stack key={l} direction="row" alignItems="center" spacing={1.25} sx={{ p: 1.2, borderRadius: 2.5, border: `1px solid ${C.border}`, bgcolor: '#FAFBFD' }}>
                    <Icon sx={{ color: c, fontSize: 18 }} />
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{l}</Typography>
                  </Stack>
                );
              })}
            </Stack>
          </SurfaceCard>
          <StateBox type="empty" text="لا إشعارات معطّلة حالياً" />
        </Stack>
      </Grid>
    </Grid>
  </Box>
);