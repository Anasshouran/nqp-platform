// Shipment row actions: open, submit, delete, attachment upload, and logout.
// Extracted from ClerkDashboardPage without behavioural change.
import { useRef, useState, type ChangeEvent } from 'react';
import { deleteShipment, submitShipment, updateShipment, uploadAttachment }  from '../../../api/endpoints/food';
import type { FoodShipment } from '../../../types/food';
import { notifySuccess, notifyError } from '../../../utils/toast';
import { logout as logoutApi } from '../../../api/endpoints/auth';
import { logout } from '../../../store/slices/authSlice';
import { getErrMessage } from '../constants';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch } from '../../../store/store';

export const useClerkActions = ({ loadData, table, setUserMenuAnchor }: {
  loadData: () => Promise<void>;
  table: { refresh: () => void };
  setUserMenuAnchor: (v: null | HTMLElement) => void;
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<FoodShipment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [detailView, setDetailView] = useState<FoodShipment | null>(null);
  const [editTarget, setEditTarget] = useState<FoodShipment | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, boolean>>({});
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  const submitAction = async (r: FoodShipment) => {
    try {
      await submitShipment(r.id);
      notifySuccess(`تم إرسال الطلب ${r.manifest_number} لتحصيل الرسوم`);
      setDetailView(null);
      loadData();
      table.refresh();
    } catch (e) {
      notifyError(getErrMessage(e, 'تعذر إرسال الطلب'));
    }
  };

  const openRow = (r: FoodShipment) => {
    setDetailView(r);
  };

  const saveDraft = async (id: string, payload: Record<string, unknown>) => {
    setSavingDraft(true);
    try {
      await updateShipment(id, payload);
      notifySuccess('تم حفظ تعديلات المسودة');
      setEditTarget(null);
      setDetailView(null);
      loadData();
      table.refresh();
    } catch (e) {
      notifyError(getErrMessage(e, 'تعذر حفظ تعديلات المسودة'));
    } finally {
      setSavingDraft(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteShipment(deleteTarget.id);
      notifySuccess('تم حذف المسودة');
      setDeleteTarget(null);
      loadData();
      table.refresh();
    } catch (e) {
      notifyError(getErrMessage(e, 'يمكن حذف المسودات فقط'));
    } finally {
      setDeleting(false);
    }
  };

  const handleDocUpload = async (docType: string, file: File, shipmentId?: string) => {
    if (!shipmentId) {
      // إذا لم يكن هناك shipment بعد، نسجل فقط محلياً
      setUploadedDocs((prev) => ({ ...prev, [docType]: true }));
      notifySuccess(`تم تسجيل ${docType} — سيتم رفع الملف بعد إنشاء الطلب`);
      return;
    }
    setUploadingDoc(docType);
    try {
      await uploadAttachment(shipmentId, file, docType);
      setUploadedDocs((prev) => ({ ...prev, [docType]: true }));
      notifySuccess(`تم رفع ${docType} بنجاح`);
    } catch (e) {
      notifyError(getErrMessage(e, `تعذر رفع ${docType}`));
    } finally {
      setUploadingDoc(null);
    }
  };

  const docFileRef = useRef<HTMLInputElement | null>(null);
  const [pendingDocType, setPendingDocType] = useState<string | null>(null);

  const triggerDocFilePicker = (docType: string) => {
    if (uploadingDoc) return;
    setPendingDocType(docType);
    docFileRef.current?.click();
  };

  const handleDocFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const docType = pendingDocType;
    e.target.value = '';
    setPendingDocType(null);
    if (file && docType) {
      void handleDocUpload(docType, file);
    }
  };

  const handleLogout = async () => {
    setUserMenuAnchor(null);
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        await logoutApi(refreshToken);
      } catch {
        // ignore logout API errors
      }
    }
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  return { deleteTarget, deleting, detailView, docFileRef, editTarget, handleDelete, handleDocFileChange, handleLogout, openRow, saveDraft, savingDraft, setDeleteTarget, setDetailView, setEditTarget, submitAction, triggerDocFilePicker, uploadedDocs, uploadingDoc };
};
