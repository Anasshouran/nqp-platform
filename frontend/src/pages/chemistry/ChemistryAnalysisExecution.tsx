import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import {
  AppButton,
  FormSelect,
  FormTextField,
  PageHeader,
  StatusChip,
} from '../../components/uikit';
import {
  enterSampleTestResult,
  getApplicableLimits,
  getLabSample,
  getLabSampleTests,
  markSampleTestQC,
  startSampleTest,
  submitForApproval,
} from '../../api/endpoints/foodlab';
import type { ApplicableLimits, FoodSample, SampleTest } from '../../types/food';
import { labTestStatus } from '../../utils/status';
import { formatDateTime } from '../../utils/formatters';
import { notifyError, notifySuccess } from '../../utils/toast';

const ChemistryAnalysisExecution = () => {
  const navigate = useNavigate();
  const { sampleId = '', testId = '' } = useParams<{ sampleId: string; testId: string }>();
  const [sample, setSample] = useState<FoodSample | null>(null);
  const [test, setTest] = useState<SampleTest | null>(null);
  const [limits, setLimits] = useState<ApplicableLimits | null>(null);
  const [resultValue, setResultValue] = useState('');
  const [unit, setUnit] = useState('mg/kg');
  const [compliance, setCompliance] = useState<'COMPLIANT' | 'NON_COMPLIANT' | null>(null);
  const [qcValue, setQcValue] = useState('');
  const [qcPassed, setQcPassed] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getLabSample(sampleId)
      .then((r) => setSample(r.data.data))
      .catch(() => undefined);
    getLabSampleTests({ page_size: 100 })
      .then((r) => {
        const found = r.data.data.results.find((t) => t.id === testId);
        setTest(found ?? null);
        if (found) {
          if (found.unit) setUnit(found.unit);
          if (found.result_value != null) setResultValue(String(found.result_value));
        }
      })
      .catch(() => undefined);
    getApplicableLimits(testId)
      .then((r) => setLimits(r.data.data))
      .catch(() => setLimits(null));
  }, [sampleId, testId]);

  const handleStart = async () => {
    try {
      await startSampleTest(testId);
      notifySuccess('تم بدء التحليل');
    } catch {
      notifyError('فشل في بدء التحليل');
    }
  };

  const evaluate = useCallback(() => {
    const maxLimit = limits?.limits?.[0]?.M ?? limits?.limits?.[0]?.m;
    if (maxLimit == null || resultValue === '') return;
    const value = parseFloat(resultValue);
    if (Number.isNaN(value)) return;
    setCompliance(value <= Number(maxLimit) ? 'COMPLIANT' : 'NON_COMPLIANT');
  }, [limits, resultValue]);

  const handleSaveResult = async () => {
    if (!test) return;
    if (resultValue === '') {
      notifyError('يجب إدخال قيمة النتيجة');
      return;
    }
    setSaving(true);
    try {
      await enterSampleTestResult(testId, {
        result_value: parseFloat(resultValue),
        unit,
        result_text: '',
      });
      notifySuccess('تم حفظ النتيجة');
      evaluate();
    } catch {
      notifyError('فشل في حفظ النتيجة');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkQC = async (passed: boolean) => {
    try {
      await markSampleTestQC(testId, { qc_status: passed ? 'PASSED' : 'FAILED', qc_notes: qcValue });
      setQcPassed(passed);
      notifySuccess(passed ? 'تم اعتماد QC' : 'سُجِّلت مخالفة QC');
    } catch {
      notifyError('تعذر تسجيل مراجعة الجودة');
    }
  };

  const handleSubmit = async () => {
    try {
      await submitForApproval(sampleId);
      notifySuccess('تم إرسال النتيجة للمراجعة');
      navigate(`/app/chemistry-analyst/${sampleId}`);
    } catch {
      notifyError('فشل في الإرسال');
    }
  };

  const maxLimit = limits?.limits?.[0]?.M ?? limits?.limits?.[0]?.m ?? null;

  return (
    <Box>
      <PageHeader
        title={`تنفيذ التحليل — ${test?.parameter?.name_ar ?? '—'}`}
        subtitle={sample ? `${sample.sample_number} • ${sample.sample_type}` : 'جاري تحميل العينة...'}
        action={
          <AppButton variant="secondary" onClick={() => navigate(`/app/chemistry-analyst/${sampleId}`)}>
            عودة للتفاصيل
          </AppButton>
        }
      />

      {test && (
        <Box sx={{ mb: 3 }}>
          <StatusChip label={labTestStatus[test.status]?.label ?? test.status} tone={labTestStatus[test.status]?.tone} />
        </Box>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Box sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>📝 إدخال النتيجة</Typography>
            <Box sx={{ display: 'grid', gap: 2 }}>
              <FormTextField
                label="قيمة النتيجة"
                type="number"
                value={resultValue}
                onChange={(e) => setResultValue(e.target.value)}
              />
              <FormSelect
                label="الوحدة"
                value={unit}
                onChange={setUnit}
                options={['mg/kg', 'µg/kg', '%'].map((v) => ({ value: v, label: v }))}
              />
              {maxLimit != null && (
                <Typography variant="body2" color="text.secondary">
                  الحد الأقصى للمواصفة: <b>{String(maxLimit)} {unit}</b>
                </Typography>
              )}
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <AppButton onClick={handleSaveResult} loading={saving}>💾 حفظ النتيجة</AppButton>
                <AppButton variant="secondary" onClick={evaluate}>🔍 تقييم تلقائي</AppButton>
              </Box>
            </Box>
          </Box>
        </Grid>

        <Grid item xs={12} md={6}>
          <Box sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>📊 المواصفة المعيارية</Typography>
            {limits ? (
              <Box sx={{ display: 'grid', gap: 1 }}>
                <Typography variant="body2">
                  المنتج: <b>{limits.product?.name_ar ?? '—'}</b>
                </Typography>
                <Typography variant="body2">
                  نسخة المواصفة: <b>{limits.spec_version?.label ?? '—'}</b>
                </Typography>
                {limits.limits?.map((l, i) => (
                  <Typography key={i} variant="body2">
                    {l.microorganism_name ?? 'معيار'}:
                    <b> {l.M ?? l.m ?? '—'} {l.unit}</b>
                  </Typography>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">لا توجد مواصفة معيارية مرتبطة.</Typography>
            )}
          </Box>
        </Grid>

        <Grid item xs={12} md={6}>
          <Box sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>✅ مراجعة QC</Typography>
            <Box sx={{ display: 'grid', gap: 2 }}>
              <FormTextField label="ملاحظات QC" value={qcValue} onChange={(e) => setQcValue(e.target.value)} />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <AppButton variant="secondary" onClick={() => handleMarkQC(true)}>✓ ممر</AppButton>
                <AppButton variant="danger" onClick={() => handleMarkQC(false)}>✗ فشل</AppButton>
              </Box>
            </Box>
          </Box>
        </Grid>

        <Grid item xs={12} md={6}>
          <Box sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>📤 الإرسال للمراجعة</Typography>
            <Box sx={{ display: 'grid', gap: 1.5 }}>
              {compliance && (
                <Alert severity={compliance === 'COMPLIANT' ? 'success' : 'error'}>
                  {compliance === 'COMPLIANT'
                    ? '✓ النتيجة مطابقة للمواصفة'
                    : '🔴 النتيجة غير مطابقة للحد الأقصى'}
                </Alert>
              )}
              {qcPassed === false && (
                <Alert severity="error">🔴 QC FAILED - لا يمكن إرسال النتيجة. تواصل مع رئيس القسم.</Alert>
              )}
              <AppButton onClick={handleSubmit} sx={{ mt: 1 }}>📤 إرسال للمراجعة</AppButton>
            </Box>
          </Box>
        </Grid>
      </Grid>

      {test?.started_at && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          بدأ التحليل: {formatDateTime(new Date(test.started_at))}
        </Typography>
      )}
    </Box>
  );
};

export default ChemistryAnalysisExecution;
