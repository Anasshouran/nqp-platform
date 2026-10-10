// The multi-step new-request wizard: stepper, per-step forms, item picker and submit actions.
// Extracted from ClerkDashboardPage without behavioural change.
import type { useClerkActions } from '../hooks/useClerkActions';
import type { useClerkData } from '../hooks/useClerkData';
import type { useClerkWizard } from '../hooks/useClerkWizard';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import LinearProgress from '@mui/material/LinearProgress';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import SendIcon from '@mui/icons-material/Send';
import PaidIcon from '@mui/icons-material/Paid';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { riskGroupMeta } from '../samplingPolicy';
import { WizardField, WizardItems } from './ClerkRequestWizard';
import { WIZARD_STEPS } from '../constants';

type Props = {
  actions: Pick<ReturnType<typeof useClerkActions>, 'docFileRef' | 'handleDocFileChange' | 'triggerDocFilePicker' | 'uploadedDocs' | 'uploadingDoc'>;
  data: Pick<ReturnType<typeof useClerkData>, 'clerkName' | 'ports'>;
  wizard: Pick<ReturnType<typeof useClerkWizard>, 'clearWizardError' | 'handleWizardNext' | 'setStep' | 'setWizardForm' | 'setWizardItems' | 'setWizardOpen' | 'setWizardType' | 'step' | 'wizardContentRef' | 'wizardErrors' | 'wizardForm' | 'wizardItems' | 'wizardOpen' | 'wizardType'>;
};

export const ClerkRequestDrawer = ({ actions, data, wizard }: Props) =>{
  const { docFileRef, handleDocFileChange, triggerDocFilePicker, uploadedDocs, uploadingDoc } = actions;
  const { clerkName, ports } = data;
  const { clearWizardError, handleWizardNext, setStep, setWizardForm, setWizardItems, setWizardOpen, setWizardType, step, wizardContentRef, wizardErrors, wizardForm, wizardItems, wizardOpen, wizardType } = wizard;

  return (
    <>

        <Dialog open={wizardOpen} onClose={() => setWizardOpen(false)} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 4 } }}>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Box sx={{ width: 34, height: 34, borderRadius: 2, display: 'grid', placeItems: 'center', color: '#fff', bgcolor: wizardType === 'IMPORT' ? 'primary.main' : 'secondary.main' }}>
                {wizardType === 'IMPORT' ? <MoveToInboxIcon fontSize="small" /> : <SendIcon fontSize="small" />}
              </Box>
              إنشاء طلب {wizardType === 'IMPORT' ? 'وارد' : 'صادر'} — {clerkName}
            </Stack>
            <IconButton aria-label="إغلاق" onClick={() => setWizardOpen(false)}><CloseIcon /></IconButton>
          </DialogTitle>
          <DialogContent dividers ref={wizardContentRef}>
            <Stepper
              activeStep={step}
              alternativeLabel
              sx={{
                mb: 3,
                '& .MuiStepLabel-label': { fontWeight: 700 },
                '& .MuiStepLabel-iconContainer .MuiSvgIcon-root': { fontSize: 26 },
                '& .MuiStepConnector-line': { borderTopWidth: 2 },
              }}
            >
              {WIZARD_STEPS.map((label) => (
                <Step key={label}><StepLabel>{label}</StepLabel></Step>
              ))}
            </Stepper>
            <LinearProgress
              variant="determinate"
              value={((step + 1) / WIZARD_STEPS.length) * 100}
              sx={{
                mb: 3,
                borderRadius: 2,
                height: 8,
                bgcolor: 'rgba(16,40,34,0.06)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 2,
                  background: wizardType === 'IMPORT' ? 'linear-gradient(90deg,#0c7f6a,#12a585)' : 'linear-gradient(90deg,#8c6d1f,#b18b2f)',
                },
              }}
            />

            {step === 0 && (
              <Stack spacing={2}>
                <Typography variant="body2" color="text.secondary">اختر نوع الطلب لتظهر الحقول الخاصة به:</Typography>
                <Grid container spacing={2}>
                  {([
                    { key: 'IMPORT', icon: <MoveToInboxIcon />, title: 'طلب وارد', desc: 'استيراد مواد غذائية إلى البلاد — شهادات منشأ وصحية وجمركية', selected: wizardType === 'IMPORT', accent: 'primary' },
                    { key: 'EXPORT', icon: <SendIcon />, title: 'طلب صادر', desc: 'تصدير مواد غذائية للخارج — توثيق الشحنات الصادرة', selected: wizardType === 'EXPORT', accent: 'secondary' },
                  ] as const).map((c) => (
                    <Grid key={c.key} item xs={12} sm={6}>
                      <Button
                        fullWidth
                        variant={c.selected ? 'contained' : 'outlined'}
                        color={c.accent}
                        onClick={() => setWizardType(c.key)}
                        sx={{
                          py: 3,
                          px: 2.5,
                          borderRadius: 3.5,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 1.25,
                          textTransform: 'none',
                          background: c.selected
                            ? c.key === 'IMPORT'
                              ? 'linear-gradient(135deg,#0c7f6a,#12a585)'
                              : 'linear-gradient(135deg,#8c6d1f,#b18b2f)'
                            : undefined,
                          boxShadow: c.selected ? (c.key === 'IMPORT' ? '0 10px 24px rgba(12,127,106,0.3)' : '0 10px 24px rgba(140,109,31,0.3)') : 'none',
                          transition: 'all .15s ease',
                          '&:hover': { transform: 'translateY(-2px)' },
                        }}
                      >
                        <Box sx={{ fontSize: 34, lineHeight: 1 }}>{c.icon}</Box>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{c.title}</Typography>
                          <Typography variant="caption" sx={{ opacity: 0.85, display: 'block', mt: 0.25 }}>{c.desc}</Typography>
                        </Box>
                        {c.selected && <Chip size="small" label="مُختار" sx={{ fontWeight: 700, bgcolor: 'rgba(255,255,255,0.22)' }} />}
                      </Button>
                    </Grid>
                  ))}
                </Grid>
              </Stack>
            )}

            {step === 1 && (
              <Stack spacing={2}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'info.main' }}>بيانات الشحنة والنقل</Typography>
                <Grid container spacing={2}>
                  {wizardType === 'IMPORT' ? (
                    <>
                      <WizardField label="رقم البيان" placeholder="IMP-2026-00001 (اختياري — يُولَّد تلقائيًا)" fieldKey="manifest_number" form={wizardForm} onChange={setWizardForm} />
                      <WizardField label="اسم الباخرة / وسيلة النقل" placeholder="مثال: SSV Nile Crown" required fieldKey="vessel_name" form={wizardForm} onChange={setWizardForm} errorText={wizardErrors.vessel_name} clearError={clearWizardError} />
                      <WizardField label="رقم البوليصة" placeholder="BL-XXXXX" required fieldKey="bill_of_lading" form={wizardForm} onChange={setWizardForm} errorText={wizardErrors.bill_of_lading} clearError={clearWizardError} />
                      <Grid item xs={12} sm={6}>
                        <TextField
                          size="small"
                          type="date"
                          label="تاريخ الوصول"
                          fullWidth
                          required
                          error={Boolean(wizardErrors.arrival_date)}
                          helperText={wizardErrors.arrival_date}
                          InputLabelProps={{ shrink: true }}
                          value={wizardForm.arrival_date ?? ''}
                          onChange={(e) => { setWizardForm((p) => ({ ...p, arrival_date: e.target.value })); clearWizardError('arrival_date'); }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          size="small"
                          label="ميناء الدخول"
                          select
                          required
                          fullWidth
                          error={Boolean(wizardErrors.port)}
                          value={wizardForm.port ?? ''}
                          onChange={(e) => { setWizardForm((p) => ({ ...p, port: e.target.value })); clearWizardError('port'); }}
                          helperText={wizardErrors.port || 'حقل إلزامي — يُملأ من نطاق حسابك'}
                        >
                          {ports.map((p) => (
                            <MenuItem key={p.id} value={p.code}>{p.code} — {p.name_ar}</MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <WizardField label="بلد المنشأ" placeholder="مثال: الهند" required fieldKey="origin_country" form={wizardForm} onChange={setWizardForm} errorText={wizardErrors.origin_country} clearError={clearWizardError} />
                    </>
                  ) : (
                    <>
                      <WizardField label="وسيلة النقل" placeholder="باخرة / شاحنة / قطار / طائرة" fieldKey="vessel_name" form={wizardForm} onChange={setWizardForm} />
                      <WizardField label="بلد الوجهة" placeholder="المرسل إليه" required fieldKey="origin_country" form={wizardForm} onChange={setWizardForm} errorText={wizardErrors.origin_country} clearError={clearWizardError} />
                      <Grid item xs={12} sm={6}>
                        <TextField
                          size="small"
                          type="date"
                          label="تاريخ الشحن"
                          fullWidth
                          required
                          error={Boolean(wizardErrors.arrival_date)}
                          helperText={wizardErrors.arrival_date}
                          InputLabelProps={{ shrink: true }}
                          value={wizardForm.arrival_date ?? ''}
                          onChange={(e) => { setWizardForm((p) => ({ ...p, arrival_date: e.target.value })); clearWizardError('arrival_date'); }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          size="small"
                          label="ميناء التخليص"
                          select
                          required
                          fullWidth
                          error={Boolean(wizardErrors.port)}
                          value={wizardForm.port ?? ''}
                          onChange={(e) => { setWizardForm((p) => ({ ...p, port: e.target.value })); clearWizardError('port'); }}
                          helperText={wizardErrors.port || 'حقل إلزامي'}
                        >
                          {ports.map((p) => (
                            <MenuItem key={p.id} value={p.code}>{p.code} — {p.name_ar}</MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                    </>
                  )}
                </Grid>
              </Stack>
            )}

            {step === 2 && (
              <Stack spacing={2}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'warning.main' }}>البيانات الحكومية والجمركية</Typography>
                <Typography variant="body2" color="text.secondary">البيانات الحكومية مطلوبة لاعتماد المعاملة — يُفضل مراجعة المستندات الأصلية.</Typography>
                <Grid container spacing={2}>
                  <WizardField label="رقم البيان الجمركي" placeholder="C-XXXXX" fieldKey="customs_number" form={wizardForm} onChange={setWizardForm} />
                  <WizardField label="رقم الشهادة الصحية / الاعتماد" placeholder="CC-XXXXX" fieldKey="certificate_no" form={wizardForm} onChange={setWizardForm} />
                  <WizardField label="اسم المخلص الجمركي" placeholder="اسم الوكيل الجمركي" fieldKey="clearing_agent" form={wizardForm} onChange={setWizardForm} />
                </Grid>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(140,109,31,0.05)', borderColor: 'rgba(140,109,31,0.3)' }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <InfoIcon fontSize="small" color="warning" />
                    <Typography variant="caption" color="text.secondary">
                      رقم البيان الجمركي يُدخل يدويًا حالياً — سيتم ربطه تلقائيًا مع customs API في الإصدار القادم.
                    </Typography>
                  </Stack>
                </Paper>
              </Stack>
            )}

            {step === 3 && (
              <Stack spacing={2}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'success.main' }}>بيانات المستورد / المصدر</Typography>
                <Grid container spacing={2}>
                  {wizardType === 'IMPORT' ? (
                    <>
                      <WizardField label="اسم المورد / الشركة الموردة" placeholder="ابحث في دليل المؤسسات أو اكتب الاسم مباشرة" required fieldKey="supplier_name" form={wizardForm} onChange={setWizardForm} errorText={wizardErrors.supplier_name} clearError={clearWizardError} />
                      <WizardField label="اسم المستورد (الشركة المستوردة)" placeholder="اسم الجهة المستوردة" required fieldKey="exporter_name" form={wizardForm} onChange={setWizardForm} errorText={wizardErrors.exporter_name} clearError={clearWizardError} />
                      <WizardField label="اسم المخلص الجمركي" placeholder="اسم الوكيل الجمركي" fieldKey="clearing_agent" form={wizardForm} onChange={setWizardForm} />
                    </>
                  ) : (
                    <>
                      <WizardField label="اسم المصدر / الشركة المصدرة" placeholder="ابحث في دليل المؤسسات" required fieldKey="supplier_name" form={wizardForm} onChange={setWizardForm} errorText={wizardErrors.supplier_name} clearError={clearWizardError} />
                      <WizardField label="اسم المستورد (الجهة المستوردة)" placeholder="المرسل إليه" required fieldKey="exporter_name" form={wizardForm} onChange={setWizardForm} errorText={wizardErrors.exporter_name} clearError={clearWizardError} />
                    </>
                  )}
                </Grid>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(12,127,106,0.05)', borderColor: 'rgba(12,127,106,0.3)' }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <InfoIcon fontSize="small" color="success" />
                    <Typography variant="caption" color="text.secondary">
                      يُنصح بإدخال الاسم التجاري + الرقم الضريبي للربط المستقبلي بمحرك المخاطر.
                    </Typography>
                  </Stack>
                </Paper>
              </Stack>
            )}

            {step === 4 && (
              <WizardItems items={wizardItems} setItems={setWizardItems} />
            )}

            {step === 5 && (
              <Stack spacing={1.25}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>المستندات المطلوبة</Typography>
                <Typography variant="body2" color="text.secondary">المستندات الإلزامية الناقصة تمنع الإرسال — يُمكنك رفع الملفات لاحقًا.</Typography>
                {[ // قيم docType مطابقة لـ ShipmentAttachment.DocType في الخلفية
                  { name: 'البيان الجمركي', docType: 'CUSTOMS', required: true },
                  { name: 'الشهادة الصحية', docType: 'HEALTH_CERT', required: true },
                  { name: 'شهادة المنشأ', docType: 'ORIGIN_CERT', required: true },
                  { name: 'الفاتورة التجارية', docType: 'INVOICE', required: true },
                  { name: 'Packing List', docType: 'PACKING_LIST', required: true },
                  { name: 'بوليصة الشحن (AWB/B/L)', docType: 'AWB_BL', required: true },
                  { name: 'شهادة التحليل المعملي', docType: 'ANALYSIS_CERT', required: false },
                  { name: 'مستند إضافي', docType: 'OTHER', required: false },
                ].map((d) => {
                  const isUploaded = uploadedDocs[d.docType];
                  const isUploading = uploadingDoc === d.docType;
                  return (
                  <Stack key={d.name} direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 1.25, borderRadius: 2, border: '1px solid rgba(16,40,34,0.07)' }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <AttachFileIcon fontSize="small" color={isUploaded ? 'success' : d.required ? 'warning' : 'disabled'} />
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{d.name}</Typography>
                      {d.required && !isUploaded && <Chip label="إلزامي" size="small" color="warning" variant="outlined" sx={{ ml: 0.5 }} />}
                    </Stack>
                    {isUploaded ? (
                      <Chip label="مرفوع" size="small" color="success" variant="outlined" />
                     ) : (
                      <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        startIcon={<AttachFileIcon />}
                        disabled={isUploading}
                        onClick={() => triggerDocFilePicker(d.docType)}
                      >
                        {isUploading ? 'جارٍ الرفع...' : 'رفع ملف'}
                      </Button>
                    )}
                  </Stack>
                );
                })}
                <input
                  ref={docFileRef}
                  type="file"
                  hidden
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                  onChange={handleDocFileChange}
                />
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(12,127,106,0.05)', borderColor: 'rgba(12,127,106,0.3)' }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <InfoIcon fontSize="small" color="info" />
                    <Typography variant="caption" color="text.secondary">
                      يُمكنك الإرسال بدون المستندات الاختيارية — سيتم طلبها من المفتش لاحقًا إذا لزم الأمر.
                    </Typography>
                  </Stack>
                </Paper>
              </Stack>
            )}

            {step === 6 && (
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'info.main' }}>الرسوم (حساب تلقائي — النظام)</Typography>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderStyle: 'dashed', borderColor: 'rgba(12,127,106,0.4)', bgcolor: 'rgba(12,127,106,0.04)' }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
                      <PaidIcon fontSize="small" color="info" />
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>تُحتسب تلقائيًا بعد الإرسال</Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      تُحسب الرسوم حسب نوع الشحنة والكميات عند استلام الطلب في قسم الحسابات — لا يمكن تعديلها يدويًا، وتظهر هنا وفي صفحة الطلب فور احتسابها.
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'warning.main' }}>سياسة العينات (حساب تلقائي — النظام)</Typography>
                  {wizardItems.length === 0 ? (
                    <Box sx={{ p: 1.5, borderRadius: 2, border: '1px dashed rgba(16,40,34,0.2)' }}>
                      <Typography variant="body2" color="text.secondary">لم تُضف أصناف بعد — تُحسب سياسة العينات تلقائيًا لكل صنف.</Typography>
                    </Box>
                  ) : (
                    <Stack spacing={1}>
                      {wizardItems.map((it, i) => {
                        const s = it.sampling;
                        return (
                          <Box key={i} sx={{ p: 1.5, borderRadius: 2, border: '1px solid rgba(16,40,34,0.07)', bgcolor: 'rgba(255,255,255,0.6)' }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>{i + 1}. {it.name}</Typography>
                              {s && <Chip size="small" color={riskGroupMeta(s.risk_group).color} label={`${s.sampling_rate} — ${riskGroupMeta(s.risk_group).label}`} sx={{ bgcolor: 'transparent', fontWeight: 700 }} />}
                            </Stack>
                            {s ? (
                              <>
                                <Typography variant="body2">عدد العينات: <b>{s.quantity}</b></Typography>
                                {s.package_size && <Typography variant="body2">حجم العبوة المعتمدة: {s.package_size}</Typography>}
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>{s.sampling_conditions}</Typography>
                              </>
                            ) : (
                              <Typography variant="body2" color="text.secondary">لا تتطلب عينة — فحص ظاهري فقط</Typography>
                            )}
                          </Box>
                        );
                      })}
                    </Stack>
                  )}
                </Grid>
              </Grid>
            )}

            {step === 7 && (
              <Stack spacing={1}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>مراجعة الطلب والإرسال</Typography>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 1, bgcolor: 'rgba(12,127,106,0.04)' }}>
                  <Stack spacing={0.75}>
                    {['بيانات الشحنة والنقل', 'البيانات الحكومية', 'المستورد / المصدر', 'الأصناف والمنتجات', 'المستندات المرفوعة', 'الرسوم المستحقة', 'سياسة العينات'].map((item) => (
                      <Stack key={item} direction="row" alignItems="center" spacing={1}>
                        <CheckCircleIcon fontSize="small" color="success" />
                        <Typography variant="body2">{item}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Paper>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ p: 1.5, borderRadius: 2, bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                  <WarningAmberIcon fontSize="small" />
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>بعض المستندات الإلزامية غير مرفوعة — سيتم طلبها من المفتش بعد الإرسال.</Typography>
                </Stack>
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>السابق</Button>
            <Box sx={{ flexGrow: 1 }} />
            {step < WIZARD_STEPS.length - 1 && (
              <Button variant="contained" onClick={handleWizardNext}>التالي</Button>
            )}
            {step === WIZARD_STEPS.length - 1 && (
              <Button variant="contained" color="success" startIcon={<SendIcon />} onClick={handleWizardNext}>
                إرسال للمراجعة
              </Button>
            )}
          </DialogActions>
        </Dialog>
    </>
  );
};