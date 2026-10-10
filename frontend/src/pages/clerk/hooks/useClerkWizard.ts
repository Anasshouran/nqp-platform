// The multi-step request wizard: form state, per-step validation, item list and submission.
// Extracted from ClerkDashboardPage without behavioural change.
import { useRef, useState, useEffect } from 'react';
import { createShipment } from '../../../api/endpoints/food';
import { notifySuccess, notifyError } from '../../../utils/toast';
import { resolveSamplingPolicy } from '../samplingPolicy';
import { parseWeightToKg } from '../../../utils/weight';
import { RequestType, WIZARD_STEPS, WizardStep, getErrMessage } from '../constants';
import type { WizardItem } from '../constants';

export const useClerkWizard = ({ loadData, table }: { loadData: () => Promise<void>; table: { refresh: () => void } }) => {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardType, setWizardType] = useState<RequestType>('IMPORT');
  const [wizardErrors, setWizardErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState<WizardStep>(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const wizardContentRef = useRef<HTMLDivElement>(null);
  const [wizardItems, setWizardItems] = useState<WizardItem[]>([
    { name: 'أرز', brand: '—', origin: 'الهند', weight: '25 طن', quantity: '1,000', packageType: 'جوال', sampling: resolveSamplingPolicy('أرز', 'جوال') },
  ]);
  const [wizardForm, setWizardForm] = useState<Record<string, string>>({});
  useEffect(() => {
    wizardContentRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' });
  }, [step]);

  const openWizard = (type: RequestType) => {
    setWizardType(type);
    setStep(0);
    setWizardErrors({});
    setWizardOpen(true);
  };

  const requiredFieldsForStep = (s: number): Array<{ key: string; label: string }> => {
    if (s === 1) {
      const list: Array<{ key: string; label: string }> = [
        { key: 'port', label: 'ميناء الدخول/التخليص' },
        { key: 'origin_country', label: 'بلد المنشأ/الوجهة' },
        { key: 'arrival_date', label: wizardType === 'IMPORT' ? 'تاريخ الوصول' : 'تاريخ الشحن' },
      ];
      if (wizardType === 'IMPORT') {
        list.push({ key: 'vessel_name', label: 'اسم الباخرة/وسيلة النقل' });
        list.push({ key: 'bill_of_lading', label: 'رقم البوليصة' });
      }
      return list;
    }
    if (s === 3) {
      return [
        { key: 'supplier_name', label: 'اسم المورد/المصدر' },
        { key: 'exporter_name', label: 'اسم المستورد/الجهة المستوردة' },
      ];
    }
    return [];
  };

  const validateWizardStep = (s: number): boolean => {
    const errors: Record<string, string> = {};
    requiredFieldsForStep(s).forEach((f) => {
      if (!wizardForm[f.key]?.trim()) errors[f.key] = 'حقل إلزامي';
    });
    setWizardErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const clearWizardError = (key: string) => {
    setWizardErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleWizardNext = () => {
    if (step === WIZARD_STEPS.length - 1) {
      setConfirmOpen(true);
      return;
    }
    if (!validateWizardStep(step)) return;
    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    setRequesting(true);
    try {
      const payload: Record<string, unknown> = {
        shipment_type: wizardType,
        manifest_number: wizardForm.manifest_number?.trim() || '',
        port: wizardForm.port || undefined,
        supplier_name: wizardForm.supplier_name?.trim(),
        origin_country: wizardForm.origin_country?.trim(),
        arrival_date: wizardForm.arrival_date || undefined,
        customs_number: wizardForm.customs_number?.trim() || '',
        certificate_no: wizardForm.certificate_no?.trim() || '',
        vessel_name: wizardForm.vessel_name?.trim() || '',
        clearing_agent: wizardForm.clearing_agent?.trim() || '',
        bill_of_lading: wizardForm.bill_of_lading?.trim() || '',
        exporter_name: wizardForm.exporter_name?.trim() || '',
        transport_data: {},
        items: wizardItems
          .filter((it) => it.name && it.name !== '—')
          .map((it) => ({
            product_name: it.name,
            brand: it.brand === '—' ? '' : it.brand,
            origin: it.origin === '—' ? '' : it.origin,
            weight_kg: parseWeightToKg(it.weight) ?? 0,
            package_count: parseInt(it.quantity.replace(/[^\d]/g, ''), 10) || 0,
            package_type: it.packageType,
          })),
      };
      // إنشاء + إرسال في نداء واحد ذرّي: النداء القديم (create ثم submit)
      // كان يترك مسودة يتيمة إذا فشل الإرسال بعد نجاح الإنشاء.
      await createShipment({ ...payload, submit: true });
      notifySuccess(`تم إرسال طلب ${wizardType === 'IMPORT' ? 'الوارد' : 'الصادر'} — سيتم إشعار قسم الحسابات`);
      setConfirmOpen(false);
      setWizardOpen(false);
      setWizardForm({});
      setWizardErrors({});
      loadData();
      table.refresh();
    } catch (e) {
      notifyError(getErrMessage(e, 'تعذر إنشاء الطلب — تحقق من الحقول الإلزامية'));
    } finally {
      setRequesting(false);
    }
  };

  return { clearWizardError, confirmOpen, handleSubmit, handleWizardNext, openWizard, requesting, setConfirmOpen, setStep, setWizardForm, setWizardItems, setWizardOpen, setWizardType, step, wizardContentRef, wizardErrors, wizardForm, wizardItems, wizardOpen, wizardType };
};
