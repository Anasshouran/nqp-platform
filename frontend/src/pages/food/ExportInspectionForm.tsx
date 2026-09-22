import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PrintIcon from '@mui/icons-material/Print';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { foodFinalDecision, messageType, samplingReason, shipmentStatus } from '../../utils/status';
import type { ExportInspectionForm as ExportFormData } from '../../types/food';

const field = (label: string, value: string | number | null | undefined, placeholder = '—'): string =>
  `<p><b>${label}:</b> ${value ?? placeholder}</p>`;

const benchLabel: Record<string, string> = {
  MICROBIOLOGY: 'الأحياء الدقيقة',
  CHEMISTRY: 'الكيمياء',
  TOXICOLOGY: 'السموم',
  MOLECULAR: 'الجزيئي',
};

const label = (map: Record<string, { label: string }>, key?: string | null): string =>
  (key && map[key]?.label) || key || '—';

const sampleStatusLabel: Record<string, string> = {
  RECEIVED: 'مستلمة',
  UNDER_TESTING: 'قيد التحليل',
  COMPLETED: 'مكتملة',
  REJECTED: 'مرفوضة',
  SENT_TO_LAB: 'أُرسلت للمختبر',
};

const inspectionDecisionLabel = (d?: string | null): string => {
  if (!d) return '—';
  if (d === 'NEEDS_ANALYSIS') return 'يحتاج تحليل';
  if (d === 'NON_COMPLIANT') return 'غير مطابق';
  if (d === 'COMPLIANT') return 'مطابق';
  return d;
};

const buildPrintHtml = (form: ExportFormData): string => {
  const s = form.shipment;
  const rows = form.items
    .map(
      (it) =>
        `<tr><td>${it.product_name || '—'}</td><td>${it.brand || '—'}</td><td>${it.origin || '—'}</td><td>${it.weight_kg ?? '—'}</td><td>${it.package_count ?? '—'}</td><td>${it.package_type || '—'}</td></tr>`,
    )
    .join('');
  const samples = form.samples.length
    ? form.samples
        .map(
          (x) =>
            `<tr><td>${x.sample_number}</td><td>${x.sample_type || '—'}</td><td>${label(samplingReason, x.sampling_reason)}</td><td>${benchLabel[x.bench] || x.bench || '—'}</td><td>${sampleStatusLabel[x.status] || x.status}</td></tr>`,
        )
        .join('')
    : '<tr><td colspan="5" style="text-align:center;color:#777">لا توجد عينات</td></tr>';

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>استمارة كشف الموارد الغذائية الصادرة ${s.manifest_number}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Tahoma, Arial, sans-serif; color: #111; margin: 0; padding: 24px; }
  .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 16px; }
  .header h1 { margin: 0; font-size: 22px; }
  .header h2 { margin: 4px 0 0; font-weight: normal; font-size: 16px; color: #333; }
  section { margin-bottom: 16px; }
  .sec-title { background: #eee; padding: 6px 10px; font-weight: bold; font-size: 14px; border: 1px solid #999; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 24px; border: 1px solid #999; padding: 8px 12px; }
  .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2px 24px; border: 1px solid #999; padding: 8px 12px; }
  p { margin: 3px 0; font-size: 13.5px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { border: 1px solid #999; padding: 6px 8px; }
  th { background: #f5f5f5; }
  .decision p { font-size: 14px; margin: 4px 0; }
  .signs { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 26px; }
  .sign { border-top: 1px solid #000; padding-top: 6px; text-align: center; font-size: 13px; }
  .footer { margin-top: 18px; font-size: 11.5px; color: #555; text-align: center; border-top: 1px solid #ccc; padding-top: 8px; }
</style>
</head>
<body>
  <div class="header">
    <h1>استمارة كشف الموارد الغذائية الصادرة</h1>
    <h2>إدارة رقابة الأغذية — نظام رقابة الأغذية (الصادر) / نظام الحجر الصحي القومي</h2>
  </div>

  <section>
    <div class="sec-title">1) بيانات الطلب</div>
    <div class="grid3">
      ${field('رقم الطلب / البيان', s.manifest_number)}
      ${field('التاريخ', formatDate(s.created_at))}
      ${field('الرقم الجمركي', s.customs_number)}
      ${field('تاريخ الإحالة', formatDate(s.submitted_at))}
      ${field('نوع الرسالة', label(messageType, s.message_type))}
      ${field('المنفذ', [s.port_name, s.port_type].filter(Boolean).join(' — '))}
    </div>
  </section>

  <section>
    <div class="sec-title">2) بيانات المصدّر</div>
    <div class="grid3">
      ${field('اسم المصدر', s.exporter_name)}
      ${field('الشركة / المورّد', s.supplier_name)}
      ${field('المخلص الجمركي', s.clearing_agent)}
      ${field('بلد المنشأ', s.origin_country)}
      ${field('وسيلة النقل / الباخرة', s.vessel_name)}
      ${field('ميناء الشحن', s.loading_port)}
      ${field('بوليصة الشحن', s.bill_of_lading)}
      ${field('رقم شهادة الاعتماد', s.certificate_no)}
      ${field('الوزن الإجمالي (كغ)', s.total_weight_kg)}
    </div>
  </section>

  <section>
    <div class="sec-title">3) بيانات الموارد الغذائية</div>
    <table>
      <thead><tr><th>اسم المادة</th><th>الماركة</th><th>المنشأ</th><th>الوزن (كغ)</th><th>العبوات</th><th>نوع التعبئة</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </section>

  <section>
    <div class="sec-title">4) الكشف والتفتيش</div>
    ${
      form.inspection
        ? `<div class="grid3">
      ${field('تاريخ الكشف', formatDateTime(form.inspection.inspected_at))}
      ${field('المفتش', form.inspection.inspector_name)}
      ${field('النتيجة', inspectionDecisionLabel(form.inspection.decision))}
      ${field('درجة الحرارة (م°)', form.inspection.temperature)}
      ${field('تاريخ الإنتاج', formatDate(form.inspection.production_date))}
      ${field('تاريخ الانتهاء', formatDate(form.inspection.expiry_date))}
      ${field('رقم التشغيلة', form.inspection.batch_number)}
      ${field('حالة الحاوية', form.inspection.container_status)}
      ${field('حالة العبوات', form.inspection.package_condition)}
      ${field('عبوات تالفة', form.inspection.damaged_count)}
      ${field('عبوات سليمة', form.inspection.sound_count)}
      ${field('وزن تالف (كغ)', form.inspection.damaged_weight_kg)}
      ${field('وزن سليم (كغ)', form.inspection.sound_weight_kg)}
    </div>
    ${form.inspection.notes ? `<p><b>ملاحظات:</b> ${form.inspection.notes}</p>` : ''}`
        : `<div class="grid2"><p style="color:#888">لم يُسجَّل كشف تفتيش بعد لهذه الشحنة.</p></div>`
    }
  </section>

  <section>
    <div class="sec-title">5) العينات والفحص المخبري</div>
    <table>
      <thead><tr><th>رقم العينة</th><th>النوع</th><th>سبب السحب</th><th>المختبر</th><th>الحالة</th></tr></thead>
      <tbody>${samples}</tbody>
    </table>
  </section>

  <section>
    <div class="sec-title">6) القرار</div>
    <div class="grid2 decision">
      ${
        form.decision
          ? `<p><b>القرار النهائي:</b> ${label(foodFinalDecision, form.decision.final_decision)}</p>
             <p><b>الاعتماد النهائي:</b> ${form.decision.decided_by_name || '—'}</p>
             <p><b>تاريخ القرار:</b> ${formatDateTime(form.decision.decided_at)}</p>
             ${form.decision.decision_reason ? `<p><b>السبب:</b> ${form.decision.decision_reason}</p>` : ''}`
          : `<p style="color:#888">لا يوجد قرار نهائي بعد.</p>`
      }
    </div>
  </section>

  <section>
    <div class="sec-title">7) شهادة الصادر</div>
    <div class="grid2">
      ${
        form.certificate
          ? field('رقم الشهادة', form.certificate.certificate_number)
          : '<p style="color:#888">لم تُصدر شهادة بعد.</p>'
      }
      ${form.certificate ? field('النوع', form.certificate.certificate_type) : ''}
      ${form.certificate ? field('تاريخ الإصدار', formatDateTime(form.certificate.issued_at)) : ''}
    </div>
  </section>

  <div class="signs">
    <div class="sign">المفتش<br/><br/><br/></div>
    <div class="sign">رئيس القسم<br/><br/><br/></div>
    <div class="sign">مدير إدارة رقابة الأغذية<br/><br/><br/></div>
  </div>

  <div class="footer">وثيقة إلكترونية من منصة الحجر الصحي القومي — نظام رقابة الأغذية · ${new Date().toLocaleDateString('ar-EG')}</div>
</body>
</html>`;
};

const DataRow = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Stack direction="row" spacing={1}>
    <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 200 }}>{title}</Typography>
    <Typography variant="body2">{children || '—'}</Typography>
  </Stack>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Box sx={{ mb: 2 }}>
    <Typography variant="subtitle1" sx={{ fontWeight: 700, bgcolor: 'action.hover', px: 1.5, py: 0.75, borderRadius: 1, mb: 1 }}>
      {title}
    </Typography>
    <Stack spacing={0.5} sx={{ px: 0.5 }}>{children}</Stack>
  </Box>
);

export const ExportInspectionFormView = ({ form }: { form: ExportFormData }) => {
  const s = form.shipment;
  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=820,height=900');
    if (!win) return;
    win.document.write(buildPrintHtml(form));
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 250);
  };

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 4 } }} id="export-inspection-form">
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>استمارة كشف الموارد الغذائية الصادرة</Typography>
          <Typography variant="body2" color="text.secondary">سجل إلكتروني — بيانات تُقرأ تلقائياً من الطلب والكشف والمختبر والقرار</Typography>
        </Box>
        <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint}>
          طباعة / PDF
        </Button>
      </Stack>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, bgcolor: 'action.hover', px: 1.5, py: 0.75, borderRadius: 1, mb: 1 }}>1) بيانات الطلب</Typography>
          <Stack spacing={0.5} sx={{ px: 0.5 }}>
            <DataRow title="رقم الطلب / البيان">{s.manifest_number}</DataRow>
            <DataRow title="التاريخ">{formatDate(s.created_at)}</DataRow>
            <DataRow title="الرقم الجمركي">{s.customs_number}</DataRow>
            <DataRow title="نوع الرسالة">{label(messageType, s.message_type)}</DataRow>
            <DataRow title="الحالة">{label(shipmentStatus, s.status)}</DataRow>
            <DataRow title="المنفذ">{[s.port_name, s.port_type].filter(Boolean).join(' — ')}</DataRow>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, bgcolor: 'action.hover', px: 1.5, py: 0.75, borderRadius: 1, mb: 1 }}>2) بيانات المصدّر</Typography>
          <Stack spacing={0.5} sx={{ px: 0.5 }}>
            <DataRow title="اسم المصدر">{s.exporter_name || s.supplier_name}</DataRow>
            <DataRow title="الشركة / المورّد">{s.supplier_name}</DataRow>
            <DataRow title="المخلص الجمركي">{s.clearing_agent}</DataRow>
            <DataRow title="بلد المنشأ">{s.origin_country}</DataRow>
            <DataRow title="وسيلة النقل / الباخرة">{s.vessel_name}</DataRow>
            <DataRow title="ميناء الشحن">{s.loading_port}</DataRow>
            <DataRow title="بوليصة الشحن">{s.bill_of_lading}</DataRow>
            <DataRow title="الوزن الإجمالي (كغ)">{s.total_weight_kg}</DataRow>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, bgcolor: 'action.hover', px: 1.5, py: 0.75, borderRadius: 1, mb: 1 }}>3) بيانات الموارد الغذائية</Typography>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <Box component="tr" sx={{ bgcolor: 'action.hover' }}>
                {['اسم المادة', 'الماركة', 'المنشأ', 'الوزن (كغ)', 'العبوات', 'نوع التعبئة'].map((h) => (
                  <Box component="th" key={h} sx={{ p: 1, border: '1px solid', borderColor: 'divider', textAlign: 'right', fontSize: 13 }}>{h}</Box>
                ))}
              </Box>
            </thead>
            <tbody>
              {form.items.map((it, i) => (
                <Box component="tr" key={i}>
                  <Box component="td" sx={{ p: 1, border: '1px solid', borderColor: 'divider', fontSize: 13 }}>{it.product_name || '—'}</Box>
                  <Box component="td" sx={{ p: 1, border: '1px solid', borderColor: 'divider', fontSize: 13 }}>{it.brand || '—'}</Box>
                  <Box component="td" sx={{ p: 1, border: '1px solid', borderColor: 'divider', fontSize: 13 }}>{it.origin || '—'}</Box>
                  <Box component="td" sx={{ p: 1, border: '1px solid', borderColor: 'divider', fontSize: 13 }}>{it.weight_kg ?? '—'}</Box>
                  <Box component="td" sx={{ p: 1, border: '1px solid', borderColor: 'divider', fontSize: 13 }}>{it.package_count ?? '—'}</Box>
                  <Box component="td" sx={{ p: 1, border: '1px solid', borderColor: 'divider', fontSize: 13 }}>{it.package_type || '—'}</Box>
                </Box>
              ))}
            </tbody>
          </Box>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, bgcolor: 'action.hover', px: 1.5, py: 0.75, borderRadius: 1, mb: 1 }}>4) الكشف والتفتيش</Typography>
          {form.inspection ? (
            <Stack spacing={0.5} sx={{ px: 0.5 }}>
              <DataRow title="تاريخ الكشف">{formatDateTime(form.inspection.inspected_at)}</DataRow>
              <DataRow title="المفتش">{form.inspection.inspector_name}</DataRow>
              <DataRow title="النتيجة">{inspectionDecisionLabel(form.inspection.decision)}</DataRow>
              <DataRow title="درجة الحرارة (م°)">{form.inspection.temperature}</DataRow>
              <DataRow title="تاريخ الإنتاج">{formatDate(form.inspection.production_date)}</DataRow>
              <DataRow title="تاريخ الانتهاء">{formatDate(form.inspection.expiry_date)}</DataRow>
              <DataRow title="رقم التشغيلة">{form.inspection.batch_number}</DataRow>
              <DataRow title="حالة الحاوية">{form.inspection.container_status}</DataRow>
              <DataRow title="حالة العبوات">{form.inspection.package_condition}</DataRow>
              <DataRow title="عبوات تالفة / سليمة">{`${form.inspection.damaged_count} / ${form.inspection.sound_count}`}</DataRow>
              <DataRow title="وزن تالف / سليم (كغ)">{`${form.inspection.damaged_weight_kg ?? 0} / ${form.inspection.sound_weight_kg ?? 0}`}</DataRow>
              {form.inspection.notes && <DataRow title="ملاحظات">{form.inspection.notes}</DataRow>}
            </Stack>
          ) : (
            <Typography color="text.secondary">لم يُسجَّل كشف تفتيش بعد لهذه الشحنة.</Typography>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, bgcolor: 'action.hover', px: 1.5, py: 0.75, borderRadius: 1, mb: 1 }}>5) العينات والفحص المخبري</Typography>
          {form.samples.length ? (
            <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <Box component="tr" sx={{ bgcolor: 'action.hover' }}>
                  {['رقم العينة', 'النوع', 'سبب السحب', 'المختبر', 'الحالة'].map((h) => (
                    <Box component="th" key={h} sx={{ p: 1, border: '1px solid', borderColor: 'divider', textAlign: 'right', fontSize: 13 }}>{h}</Box>
                  ))}
                </Box>
              </thead>
              <tbody>
                {form.samples.map((x) => (
                  <Box component="tr" key={x.sample_number}>
                    <Box component="td" sx={{ p: 1, border: '1px solid', borderColor: 'divider', fontSize: 13 }}>{x.sample_number}</Box>
                    <Box component="td" sx={{ p: 1, border: '1px solid', borderColor: 'divider', fontSize: 13 }}>{x.sample_type || '—'}</Box>
                    <Box component="td" sx={{ p: 1, border: '1px solid', borderColor: 'divider', fontSize: 13 }}>{label(samplingReason, x.sampling_reason)}</Box>
                    <Box component="td" sx={{ p: 1, border: '1px solid', borderColor: 'divider', fontSize: 13 }}>{benchLabel[x.bench] || x.bench || '—'}</Box>
                    <Box component="td" sx={{ p: 1, border: '1px solid', borderColor: 'divider', fontSize: 13 }}>{sampleStatusLabel[x.status] || x.status}</Box>
                </Box>
              ))}
              </tbody>
            </Box>
          ) : (
            <Typography color="text.secondary">لم تُسحب عينات بعد.</Typography>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, bgcolor: 'action.hover', px: 1.5, py: 0.75, borderRadius: 1, mb: 1 }}>6) القرار</Typography>
          {form.decision ? (
            <Stack spacing={0.5} sx={{ px: 0.5 }}>
              <DataRow title="القرار النهائي">{label(foodFinalDecision, form.decision.final_decision)}</DataRow>
              <DataRow title="الاعتماد النهائي">{form.decision.decided_by_name}</DataRow>
              <DataRow title="تاريخ القرار">{formatDateTime(form.decision.decided_at)}</DataRow>
              {form.decision.decision_reason && <DataRow title="السبب">{form.decision.decision_reason}</DataRow>}
            </Stack>
          ) : (
            <Typography color="text.secondary">لا يوجد قرار نهائي بعد.</Typography>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, bgcolor: 'action.hover', px: 1.5, py: 0.75, borderRadius: 1, mb: 1 }}>7) شهادة الصادر</Typography>
          {form.certificate ? (
            <Stack spacing={0.5} sx={{ px: 0.5 }}>
              <DataRow title="رقم الشهادة">{form.certificate.certificate_number}</DataRow>
              <DataRow title="النوع">{form.certificate.certificate_type}</DataRow>
              <DataRow title="تاريخ الإصدار">{formatDateTime(form.certificate.issued_at)}</DataRow>
            </Stack>
          ) : (
            <Typography color="text.secondary">لم تُصدر شهادة بعد.</Typography>
          )}
        </CardContent>
      </Card>

      <Divider sx={{ my: 3 }} />
      <Stack direction="row" justifyContent="space-between" sx={{ px: 2 }}>
        {['المفتش', 'رئيس القسم', 'مدير إدارة رقابة الأغذية'].map((role) => (
          <Box key={role} sx={{ textAlign: 'center', borderTop: '1px solid #000', pt: 0.75, width: 160 }}>
            <Typography variant="caption">{role}</Typography>
          </Box>
        ))}
      </Stack>
    </Paper>
  );
};

export default ExportInspectionFormView;