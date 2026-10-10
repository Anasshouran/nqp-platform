// The requests/import/export table: server-side filters, presets and the view-to-filter mapping.
// Extracted from ClerkDashboardPage without behavioural change.
import { useRef, useState, useEffect } from 'react';
import { getShipments }  from '../../../api/endpoints/food';
import type { FoodShipment } from '../../../types/food';
import { useServerTable, type DataTableFilterDef } from '../../../hooks/useServerTable';
import { LIST_VIEW_META, REQUESTS_PRESETS, STATUS_FILTER_OPTIONS } from '../constants';

export const useClerkRequests = ({ activeView, setActiveView }: { activeView: string; setActiveView: (v: string) => void }) => {
  const table = useServerTable<FoodShipment>({ fetchData: getShipments });

  const [reqType, setReqType] = useState('');
  const [reqStatus, setReqStatus] = useState('');
  const [reqFees, setReqFees] = useState('');
  const presetRef = useRef<string | null>(null);

  const changeReqType = (v: string) => { setReqType(v); table.setFilter('shipment_type', v); };
  const changeReqStatus = (v: string) => { setReqStatus(v); table.setFilter('status', v); };
  const changeReqFees = (v: string) => { setReqFees(v); table.setFilter('fees_paid', v); };

  const goToRequests = (preset?: string) => {
    presetRef.current = preset ?? null;
    setActiveView(preset && REQUESTS_PRESETS[preset] ? preset : 'requests');
  };

  const applyRequestsPreset = (key: string) => {
    const preset = REQUESTS_PRESETS[key];
    if (!preset) return;
    setReqStatus(preset.status);
    setReqFees(preset.fees_paid ?? '');
    setReqType('');
    table.setFilter('status', preset.status);
    if (preset.fees_paid) table.setFilter('fees_paid', preset.fees_paid);
  };

  const requestFilters: DataTableFilterDef[] =
    LIST_VIEW_META[activeView]
      ? [
          {
            key: 'shipment_type',
            label: 'النوع',
            value: reqType,
            onChange: changeReqType,
            options: [
              { value: '', label: 'النوع: الكل' },
              { value: 'IMPORT', label: 'وارد' },
              { value: 'EXPORT', label: 'صادر' },
            ],
          },
          {
            key: 'status',
            label: 'الحالة',
            value: reqStatus,
            onChange: changeReqStatus,
            options: STATUS_FILTER_OPTIONS,
          },
          {
            key: 'fees_paid',
            label: 'الرسوم',
            value: reqFees,
            onChange: changeReqFees,
            options: [
              { value: '', label: 'الرسوم: الكل' },
              { value: 'true', label: 'مسددة' },
              { value: 'false', label: 'غير مسددة' },
            ],
          },
        ]
      : [];

  const tabParams = (view: string): Record<string, string> => {
    switch (view) {
      case 'import':
        return { shipment_type: 'IMPORT' };
      case 'export':
        return { shipment_type: 'EXPORT' };
      default:
        return {};
    }
  };

  useEffect(() => {
    if (!LIST_VIEW_META[activeView]) return;
    table.resetFilters();
    setReqType('');
    setReqStatus('');
    setReqFees('');
    // `goToRequests` قد يبقى على نفس العرض (مثل الضغط على بطاقة "المسودات"
    // والتحويل على "كل الطلبات")، فـ`activeView` لا يتغير ولا يعمل useEffect.
    const sameView = activeView !== 'requests' ? activeView : null;
    const preset = presetRef.current ?? sameView;
    presetRef.current = null;
    if (preset && REQUESTS_PRESETS[preset]) {
      applyRequestsPreset(preset);
    } else {
      Object.entries(tabParams(activeView)).forEach(([key, value]) => table.setFilter(key, value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView]);

  return { goToRequests, requestFilters, table };
};
