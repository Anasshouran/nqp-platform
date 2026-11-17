import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PrintIcon from '@mui/icons-material/Print';
import { useTranslation } from 'react-i18next';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { foodFinalDecision, messageType, samplingReason, shipmentStatus } from '../../utils/status';
import type { ExportInspectionForm as ExportFormData } from '../../types/food';
import { escapeHtml, escapeHtmlOr } from '../../utils/escapeHtml';

const field = (label: string, value: string | number | null | undefined, placeholder = '—'): string =>
  `<p><b>${escapeHtml(label)}:</b> ${escapeHtmlOr(value, placeholder)}</p>`;

const getBenchLabel = (t: (key: string) => string): Record<string, string> => ({
  MICROBIOLOGY: t('food.exportInspection.bench.microbiology'),
  CHEMISTRY: t('food.exportInspection.bench.chemistry'),
  TOXICOLOGY: t('food.exportInspection.bench.toxicology'),
  MOLECULAR: t('food.exportInspection.bench.molecular'),
});

const label = (map: Record<string, { label: string }>, key?: string | null): string =>
  (key && map[key]?.label) || key || '—';

const getSampleStatusLabel = (t: (key: string) => string): Record<string, string> => ({
  RECEIVED: t('food.exportInspection.sampleStatus.received'),
  UNDER_TESTING: t('food.exportInspection.sampleStatus.underTesting'),
  COMPLETED: t('food.exportInspection.sampleStatus.completed'),
  REJECTED: t('food.exportInspection.sampleStatus.rejected'),
  SENT_TO_LAB: t('food.exportInspection.sampleStatus.sentToLab'),
});

const getInspectionDecisionLabel = (t: (key: string) => string) => (d?: string | null): string => {
  if (!d) return '—';
  if (d === 'NEEDS_ANALYSIS') return t('food.exportInspection.decision.needsAnalysis');
  if (d === 'NON_COMPLIANT') return t('food.exportInspection.decision.nonCompliant');
  if (d === 'COMPLIANT') return t('food.exportInspection.decision.compliant');
  return d;
};

const buildPrintHtml = (form: ExportFormData, t: (key: string, opts?: Record<string, unknown>) => string): string => {
  const benchLabel = getBenchLabel(t);
  const sampleStatusLabel = getSampleStatusLabel(t);
  const s = form.shipment;
  const rows = form.items
    .map(
      (it) =>
        `<tr><td>${escapeHtmlOr(it.product_name)}</td><td>${escapeHtmlOr(it.brand)}</td><td>${escapeHtmlOr(it.origin)}</td><td>${escapeHtmlOr(it.weight_kg)}</td><td>${escapeHtmlOr(it.package_count)}</td><td>${escapeHtmlOr(it.package_type)}</td></tr>`,
    )
    .join('');
  const samples = form.samples.length
    ? form.samples
        .map(
          (x) =>
            `<tr><td>${escapeHtml(x.sample_number)}</td><td>${escapeHtmlOr(x.sample_type)}</td><td>${escapeHtml(label(samplingReason, x.sampling_reason))}</td><td>${escapeHtmlOr(benchLabel[x.bench] || x.bench)}</td><td>${escapeHtml(sampleStatusLabel[x.status] || x.status)}</td></tr>`,
        )
        .join('')
    : `<tr><td colspan="5" style="text-align:center;color:#777">${escapeHtml(t('food.exportInspection.noSamples'))}</td></tr>`;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(t('food.exportInspection.title'))} ${escapeHtml(s.manifest_number)}</title>
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
    <h1>${escapeHtml(t('food.exportInspection.title'))}</h1>
    <h2>${escapeHtml(t('food.exportInspection.subtitle'))}</h2>
  </div>

  <section>
    <div class="sec-title">${escapeHtml(t('food.exportInspection.section1'))}</div>
    <div class="grid3">
      ${field(t('food.exportInspection.field.manifestNumber'), s.manifest_number)}
      ${field(t('food.exportInspection.field.date'), formatDate(s.created_at))}
      ${field(t('food.exportInspection.field.customsNumber'), s.customs_number)}
      ${field(t('food.exportInspection.field.submittedAt'), formatDate(s.submitted_at))}
      ${field(t('food.exportInspection.field.messageType'), label(messageType, s.message_type))}
      ${field(t('food.exportInspection.field.port'), [s.port_name, s.port_type].filter(Boolean).join(' — '))}
    </div>
  </section>

  <section>
    <div class="sec-title">${escapeHtml(t('food.exportInspection.section2'))}</div>
    <div class="grid3">
      ${field(t('food.exportInspection.field.exporterName'), s.exporter_name)}
      ${field(t('food.exportInspection.field.supplierName'), s.supplier_name)}
      ${field(t('food.exportInspection.field.clearingAgent'), s.clearing_agent)}
      ${field(t('food.exportInspection.field.originCountry'), s.origin_country)}
      ${field(t('food.exportInspection.field.vesselName'), s.vessel_name)}
      ${field(t('food.exportInspection.field.loadingPort'), s.loading_port)}
      ${field(t('food.exportInspection.field.billOfLading'), s.bill_of_lading)}
      ${field(t('food.exportInspection.field.certificateNo'), s.certificate_no)}
      ${field(t('food.exportInspection.field.totalWeightKg'), s.total_weight_kg)}
    </div>
  </section>

  <section>
    <div class="sec-title">${escapeHtml(t('food.exportInspection.section3'))}</div>
    <table>
      <thead><tr><th>${escapeHtml(t('food.exportInspection.table.item'))}</th><th>${escapeHtml(t('food.exportInspection.table.brand'))}</th><th>${escapeHtml(t('food.exportInspection.table.origin'))}</th><th>${escapeHtml(t('food.exportInspection.table.weightKg'))}</th><th>${escapeHtml(t('food.exportInspection.table.packageCount'))}</th><th>${escapeHtml(t('food.exportInspection.table.packageType'))}</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </section>

  <section>
    <div class="sec-title">${escapeHtml(t('food.exportInspection.section4'))}</div>
    ${
      form.inspection
        ? `<div class="grid3">
      ${field(t('food.exportInspection.field.inspectionDate'), formatDateTime(form.inspection.inspected_at))}
      ${field(t('food.exportInspection.field.inspector'), form.inspection.inspector_name)}
      ${field(t('food.exportInspection.field.result'), getInspectionDecisionLabel(t)(form.inspection.decision))}
      ${field(t('food.exportInspection.field.temperature'), form.inspection.temperature)}
      ${field(t('food.exportInspection.field.productionDate'), formatDate(form.inspection.production_date))}
      ${field(t('food.exportInspection.field.expiryDate'), formatDate(form.inspection.expiry_date))}
      ${field(t('food.exportInspection.field.batchNumber'), form.inspection.batch_number)}
      ${field(t('food.exportInspection.field.containerStatus'), form.inspection.container_status)}
      ${field(t('food.exportInspection.field.packageCondition'), form.inspection.package_condition)}
      ${field(t('food.exportInspection.field.damaged'), form.inspection.damaged_count)}
      ${field(t('food.exportInspection.field.sound'), form.inspection.sound_count)}
      ${field(t('food.exportInspection.field.damagedWeight'), form.inspection.damaged_weight_kg)}
      ${field(t('food.exportInspection.field.soundWeight'), form.inspection.sound_weight_kg)}
    </div>
    ${form.inspection.notes ? `<p><b>${escapeHtml(t('food.exportInspection.field.notes'))}:</b> ${escapeHtml(form.inspection.notes)}</p>` : ''}`
        : `<div class="grid2"><p style="color:#888">${escapeHtml(t('food.exportInspection.noInspection'))}</p></div>`
    }
  </section>

  <section>
    <div class="sec-title">${escapeHtml(t('food.exportInspection.section5'))}</div>
    <table>
      <thead><tr><th>${escapeHtml(t('food.exportInspection.sampleTable.sampleNumber'))}</th><th>${escapeHtml(t('food.exportInspection.sampleTable.sampleType'))}</th><th>${escapeHtml(t('food.exportInspection.sampleTable.reason'))}</th><th>${escapeHtml(t('food.exportInspection.sampleTable.lab'))}</th><th>${escapeHtml(t('food.exportInspection.sampleTable.status'))}</th></tr></thead>
      <tbody>${samples}</tbody>
    </table>
  </section>

  <section>
    <div class="sec-title">${escapeHtml(t('food.exportInspection.section6'))}</div>
    <div class="grid2 decision">
      ${
        form.decision
          ? `<p><b>${escapeHtml(t('food.exportInspection.field.finalDecision'))}:</b> ${escapeHtml(label(foodFinalDecision, form.decision.final_decision))}</p>
             <p><b>${escapeHtml(t('food.exportInspection.field.finalApproval'))}:</b> ${escapeHtmlOr(form.decision.decided_by_name)}</p>
             <p><b>${escapeHtml(t('food.exportInspection.field.decisionDate'))}:</b> ${escapeHtml(formatDateTime(form.decision.decided_at))}</p>
             ${form.decision.decision_reason ? `<p><b>${escapeHtml(t('food.exportInspection.field.decisionReason'))}:</b> ${escapeHtml(form.decision.decision_reason)}</p>` : ''}`
          : `<p style="color:#888">${escapeHtml(t('food.exportInspection.noFinalDecision'))}</p>`
      }
    </div>
  </section>

  <section>
    <div class="sec-title">${escapeHtml(t('food.exportInspection.section7'))}</div>
    <div class="grid2">
      ${
        form.certificate
          ? field(t('food.exportInspection.field.certificateNumber'), form.certificate.certificate_number)
          : `<p style="color:#888">${escapeHtml(t('food.exportInspection.noCertificate'))}</p>`
      }
      ${form.certificate ? field(t('food.exportInspection.field.certificateType'), form.certificate.certificate_type) : ''}
      ${form.certificate ? field(t('food.exportInspection.field.issuedAt'), formatDateTime(form.certificate.issued_at)) : ''}
    </div>
  </section>

  <div class="signs">
    <div class="sign">${escapeHtml(t('food.exportInspection.sign.inspector'))}<br/><br/><br/></div>
    <div class="sign">${escapeHtml(t('food.exportInspection.sign.sectionHead'))}<br/><br/><br/></div>
    <div class="sign">${escapeHtml(t('food.exportInspection.sign.foodDirector'))}<br/><br/><br/></div>
  </div>

  <div class="footer">${escapeHtml(t('food.exportInspection.footer', { date: new Date().toLocaleDateString('ar-EG') }))}</div>
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
  const { t } = useTranslation();
  const benchLabel = getBenchLabel(t);
  const sampleStatusLabel = getSampleStatusLabel(t);
  const s = form.shipment;
  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=820,height=900');
    if (!win) return;
    win.document.write(buildPrintHtml(form, t));
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 250);
  };

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 4 } }} id="export-inspection-form">
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{t('food.exportInspection.title')}</Typography>
          <Typography variant="body2" color="text.secondary">{t('food.exportInspection.subtitle')}</Typography>
        </Box>
        <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint}>
          {t('food.exportInspection.print')}
        </Button>
      </Stack>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, bgcolor: 'action.hover', px: 1.5, py: 0.75, borderRadius: 1, mb: 1 }}>{t('food.exportInspection.section1')}</Typography>
          <Stack spacing={0.5} sx={{ px: 0.5 }}>
            <DataRow title={t('food.exportInspection.field.manifestNumber')}>{s.manifest_number}</DataRow>
            <DataRow title={t('food.exportInspection.field.date')}>{formatDate(s.created_at)}</DataRow>
            <DataRow title={t('food.exportInspection.field.customsNumber')}>{s.customs_number}</DataRow>
            <DataRow title={t('food.exportInspection.field.messageType')}>{label(messageType, s.message_type)}</DataRow>
            <DataRow title={t('food.exportInspection.field.status')}>{label(shipmentStatus, s.status)}</DataRow>
            <DataRow title={t('food.exportInspection.field.port')}>{[s.port_name, s.port_type].filter(Boolean).join(' — ')}</DataRow>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, bgcolor: 'action.hover', px: 1.5, py: 0.75, borderRadius: 1, mb: 1 }}>{t('food.exportInspection.section2')}</Typography>
          <Stack spacing={0.5} sx={{ px: 0.5 }}>
            <DataRow title={t('food.exportInspection.field.exporterName')}>{s.exporter_name || s.supplier_name}</DataRow>
            <DataRow title={t('food.exportInspection.field.supplierName')}>{s.supplier_name}</DataRow>
            <DataRow title={t('food.exportInspection.field.clearingAgent')}>{s.clearing_agent}</DataRow>
            <DataRow title={t('food.exportInspection.field.originCountry')}>{s.origin_country}</DataRow>
            <DataRow title={t('food.exportInspection.field.vesselName')}>{s.vessel_name}</DataRow>
            <DataRow title={t('food.exportInspection.field.loadingPort')}>{s.loading_port}</DataRow>
            <DataRow title={t('food.exportInspection.field.billOfLading')}>{s.bill_of_lading}</DataRow>
            <DataRow title={t('food.exportInspection.field.totalWeightKg')}>{s.total_weight_kg}</DataRow>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, bgcolor: 'action.hover', px: 1.5, py: 0.75, borderRadius: 1, mb: 1 }}>{t('food.exportInspection.section3')}</Typography>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <Box component="tr" sx={{ bgcolor: 'action.hover' }}>
                {[t('food.exportInspection.table.item'), t('food.exportInspection.table.brand'), t('food.exportInspection.table.origin'), t('food.exportInspection.table.weightKg'), t('food.exportInspection.table.packageCount'), t('food.exportInspection.table.packageType')].map((h) => (
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
          <Typography variant="subtitle1" sx={{ fontWeight: 700, bgcolor: 'action.hover', px: 1.5, py: 0.75, borderRadius: 1, mb: 1 }}>{t('food.exportInspection.section4')}</Typography>
          {form.inspection ? (
            <Stack spacing={0.5} sx={{ px: 0.5 }}>
              <DataRow title={t('food.exportInspection.field.inspectionDate')}>{formatDateTime(form.inspection.inspected_at)}</DataRow>
              <DataRow title={t('food.exportInspection.field.inspector')}>{form.inspection.inspector_name}</DataRow>
              <DataRow title={t('food.exportInspection.field.result')}>{getInspectionDecisionLabel(t)(form.inspection.decision)}</DataRow>
              <DataRow title={t('food.exportInspection.field.temperature')}>{form.inspection.temperature}</DataRow>
              <DataRow title={t('food.exportInspection.field.productionDate')}>{formatDate(form.inspection.production_date)}</DataRow>
              <DataRow title={t('food.exportInspection.field.expiryDate')}>{formatDate(form.inspection.expiry_date)}</DataRow>
              <DataRow title={t('food.exportInspection.field.batchNumber')}>{form.inspection.batch_number}</DataRow>
              <DataRow title={t('food.exportInspection.field.containerStatus')}>{form.inspection.container_status}</DataRow>
              <DataRow title={t('food.exportInspection.field.packageCondition')}>{form.inspection.package_condition}</DataRow>
              <DataRow title={t('food.exportInspection.field.damagedSound')}>{`${form.inspection.damaged_count} / ${form.inspection.sound_count}`}</DataRow>
              <DataRow title={t('food.exportInspection.field.damagedSoundWeight')}>{`${form.inspection.damaged_weight_kg ?? 0} / ${form.inspection.sound_weight_kg ?? 0}`}</DataRow>
              {form.inspection.notes && <DataRow title={t('food.exportInspection.field.notes')}>{form.inspection.notes}</DataRow>}
            </Stack>
          ) : (
            <Typography color="text.secondary">{t('food.exportInspection.noInspection')}</Typography>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, bgcolor: 'action.hover', px: 1.5, py: 0.75, borderRadius: 1, mb: 1 }}>{t('food.exportInspection.section5')}</Typography>
          {form.samples.length ? (
            <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <Box component="tr" sx={{ bgcolor: 'action.hover' }}>
                  {[t('food.exportInspection.sampleTable.sampleNumber'), t('food.exportInspection.sampleTable.sampleType'), t('food.exportInspection.sampleTable.reason'), t('food.exportInspection.sampleTable.lab'), t('food.exportInspection.sampleTable.status')].map((h) => (
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
            <Typography color="text.secondary">{t('food.exportInspection.noSamples')}</Typography>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, bgcolor: 'action.hover', px: 1.5, py: 0.75, borderRadius: 1, mb: 1 }}>{t('food.exportInspection.section6')}</Typography>
          {form.decision ? (
            <Stack spacing={0.5} sx={{ px: 0.5 }}>
              <DataRow title={t('food.exportInspection.field.finalDecision')}>{label(foodFinalDecision, form.decision.final_decision)}</DataRow>
              <DataRow title={t('food.exportInspection.field.finalApproval')}>{form.decision.decided_by_name}</DataRow>
              <DataRow title={t('food.exportInspection.field.decisionDate')}>{formatDateTime(form.decision.decided_at)}</DataRow>
              {form.decision.decision_reason && <DataRow title={t('food.exportInspection.field.decisionReason')}>{form.decision.decision_reason}</DataRow>}
            </Stack>
          ) : (
            <Typography color="text.secondary">{t('food.exportInspection.noFinalDecision')}</Typography>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, bgcolor: 'action.hover', px: 1.5, py: 0.75, borderRadius: 1, mb: 1 }}>{t('food.exportInspection.section7')}</Typography>
          {form.certificate ? (
            <Stack spacing={0.5} sx={{ px: 0.5 }}>
              <DataRow title={t('food.exportInspection.field.certificateNumber')}>{form.certificate.certificate_number}</DataRow>
              <DataRow title={t('food.exportInspection.field.certificateType')}>{form.certificate.certificate_type}</DataRow>
              <DataRow title={t('food.exportInspection.field.issuedAt')}>{formatDateTime(form.certificate.issued_at)}</DataRow>
            </Stack>
          ) : (
            <Typography color="text.secondary">{t('food.exportInspection.noCertificate')}</Typography>
          )}
        </CardContent>
      </Card>

      <Divider sx={{ my: 3 }} />
      <Stack direction="row" justifyContent="space-between" sx={{ px: 2 }}>
        {[t('food.exportInspection.sign.inspector'), t('food.exportInspection.sign.sectionHead'), t('food.exportInspection.sign.foodDirector')].map((role) => (
          <Box key={role} sx={{ textAlign: 'center', borderTop: '1px solid #000', pt: 0.75, width: 160 }}>
            <Typography variant="caption">{role}</Typography>
          </Box>
        ))}
      </Stack>
    </Paper>
  );
};

export default ExportInspectionFormView;