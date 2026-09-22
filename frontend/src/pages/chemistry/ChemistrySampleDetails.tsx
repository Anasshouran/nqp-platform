import { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AppButton,
  FormTextField,
  PageHeader,
  StatusChip,
} from '../../components/uikit';
import {
  getLabSample,
  getLabSampleTests,
  markSampleTestQC,
  startSampleTest,
  submitForApproval,
} from '../../api/endpoints/foodlab';
import type { FoodSample, SampleTest } from '../../types/food';
import { labPriority, labSampleStatus, labTestStatus } from '../../utils/status';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { notifyError, notifySuccess } from '../../utils/toast';

const ChemistrySampleDetails = () => {
  const navigate = useNavigate();
  const { sampleId = '' } = useParams<{ sampleId: string }>();
  const [sample, setSample] = useState<FoodSample | null>(null);
  const [tests, setTests] = useState<SampleTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [qcValue, setQcValue] = useState('');

  const load = useCallback(() => {
    setIsLoading(true);
    getLabSample(sampleId)
      .then((r) => setSample(r.data.data))
      .catch(() => undefined)
      .finally(() => setIsLoading(false));
    getLabSampleTests({ sample: sampleId, page_size: 100 })
      .then((r) => setTests(r.data.data.results))
      .catch(() => undefined);
  }, [sampleId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStart = async (t: SampleTest) => {
    try {
      await startSampleTest(t.id);
      notifySuccess('تم بدء التحليل');
      load();
    } catch {
      notifyError('فشل في بدء التحليل');
    }
  };

  const handleMarkQC = async (t: SampleTest, passed: boolean) => {
    try {
      await markSampleTestQC(t.id, { qc_status: passed ? 'PASSED' : 'FAILED', qc_notes: qcValue });
      notifySuccess(passed ? 'تم اعتماد QC' : 'سُجِّلت مخالفة QC');
      setQcValue('');
      load();
    } catch {
      notifyError('تعذر تسجيل مراجعة الجودة');
    }
  };

  const handleSubmit = async (t: SampleTest) => {
    try {
      await submitForApproval(t.sample);
      notifySuccess('تم إرسال النتيجة للمراجعة');
      load();
    } catch {
      notifyError('فشل في الإرسال');
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">جاري التحميل...</Typography>
      </Box>
    );
  }

  if (!sample) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="error">لم يتم العثور على العينة</Alert>
        <AppButton sx={{ mt: 2 }} onClick={() => navigate('/app/chemistry-analyst')}>عودة للوحة</AppButton>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title={`تفاصيل العينة ${sample.sample_number}`}
        subtitle={sample.sample_type}
        action={
          <AppButton variant="secondary" onClick={() => navigate('/app/chemistry-analyst')}>
            عودة للوحة
          </AppButton>
        }
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary">الباركود</Typography>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>{sample.sample_barcode}</Typography>
          </Box>
        </Grid>
        <Grid item xs={12} md={4}>
          <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary">الأولوية</Typography>
            <StatusChip label={labPriority[sample.priority]?.label ?? sample.priority} tone={labPriority[sample.priority]?.tone} />
          </Box>
        </Grid>
        <Grid item xs={12} md={4}>
          <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary">الحالة</Typography>
            <StatusChip label={labSampleStatus[sample.status]?.label ?? sample.status} tone={labSampleStatus[sample.status]?.tone} />
          </Box>
        </Grid>
        <Grid item xs={12} md={4}>
          <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary">المحلل</Typography>
            <Typography variant="body1">{sample.analyst_name ?? '—'}</Typography>
          </Box>
        </Grid>
        <Grid item xs={12} md={4}>
          <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary">تاريخ الاستلام</Typography>
            <Typography variant="body1">{sample.received_at ? formatDateTime(new Date(sample.received_at)) : '—'}</Typography>
          </Box>
        </Grid>
        <Grid item xs={12} md={4}>
          <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary">قرار الاستلام</Typography>
            <Typography variant="body1">{sample.reception_status ?? '—'}</Typography>
          </Box>
        </Grid>
      </Grid>

      <PageHeader title="التحاليل المكلفة" subtitle="إدارة التحاليل المرتبطة بهذه العينة" />

      {tests.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
          <Typography variant="body1" color="text.secondary">لا توجد تحاليل مسجلة لهذه العينة</Typography>
        </Box>
      ) : (
        tests.map((t) => (
          <Box key={t.id} sx={{ p: 2, mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <Typography variant="body1" sx={{ fontWeight: 700 }}>{t.parameter?.name_ar ?? '—'}</Typography>
                <Typography variant="caption" color="text.secondary">{t.parameter?.name_en ?? ''}</Typography>
              </Grid>
              <Grid item xs={6} md={2}>
                <StatusChip label={labTestStatus[t.status]?.label ?? t.status} tone={labTestStatus[t.status]?.tone} />
              </Grid>
              <Grid item xs={6} md={2}>
                <Typography variant="body2">
                  النتيجة: {t.result_value != null ? `${t.result_value} ${t.unit}` : '—'}
                </Typography>
              </Grid>
              <Grid item xs={6} md={2}>
                <Typography variant="body2">
                  QC: <StatusChip label={t.qc_status_label ?? t.qc_status} tone={t.qc_status === 'PASSED' ? 'success' : t.qc_status === 'FAILED' ? 'error' : 'warning'} />
                </Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {t.status === 'DRAFT' && (
                    <AppButton size="small" onClick={() => handleStart(t)}>▶️ بدء</AppButton>
                  )}
                  {t.status === 'IN_PROGRESS' && (
                    <AppButton size="small" onClick={() => navigate(`/app/chemistry-analyst/${sampleId}/execute/${t.id}`)}>
                      🧪 تنفيذ
                    </AppButton>
                  )}
                  {t.qc_status === 'PENDING' && (
                    <>
                      <AppButton size="small" variant="secondary" onClick={() => handleMarkQC(t, true)}>✓ QC</AppButton>
                      <AppButton size="small" variant="danger" onClick={() => handleMarkQC(t, false)}>✗ QC</AppButton>
                    </>
                  )}
                  {t.status === 'COMPLETED' && (
                    <AppButton size="small" variant="secondary" onClick={() => handleSubmit(t)}>📤 إرسال للمراجعة</AppButton>
                  )}
                </Box>
              </Grid>
            </Grid>
          </Box>
        ))
      )}

      <Box sx={{ mt: 2 }}>
        <FormTextField label="ملاحظات QC (اختياري)" value={qcValue} onChange={(e) => setQcValue(e.target.value)} />
      </Box>
    </Box>
  );
};

export default ChemistrySampleDetails;
