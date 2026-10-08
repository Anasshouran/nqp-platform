import { describe, expect, it } from 'vitest';
import {
  EMPLOYMENT_STATUS_LABELS,
  EMPLOYMENT_STATUS_TONES,
  EMPLOYMENT_TYPE_LABELS,
  TIMELINE_EVENT_LABELS,
  TIMELINE_EVENT_TONES,
  employmentStatusLabel,
  employmentStatusTone,
  employmentTypeLabel,
  timelineEventLabel,
} from './hrLabels';
import type { EmploymentStatus, EmploymentType, TimelineEventType } from '../types/hr';

describe('hrLabels', () => {
  it('يترجم حالات التوظيف إلى العربية', () => {
    expect(EMPLOYMENT_STATUS_LABELS.ACTIVE).toBe('على رأس العمل');
    expect(EMPLOYMENT_STATUS_LABELS.TERMINATED).toBe('منتهي الخدمة');
  });

  it('يربط كل حالة بلون غير محايد للحالات النشطة', () => {
    expect(EMPLOYMENT_STATUS_TONES.ACTIVE).toBe('success');
    expect(EMPLOYMENT_STATUS_TONES.SUSPENDED).toBe('error');
    expect(EMPLOYMENT_STATUS_TONES.TERMINATED).toBe('neutral');
  });

  it('يترجم أنواع التعيين إلى العربية', () => {
    expect(EMPLOYMENT_TYPE_LABELS.PERMANENT).toBe('دائم');
    expect(EMPLOYMENT_TYPE_LABELS.INTERN).toBe('تدريب');
  });

  it('يترجم أحداث المسار الوظيفي إلى العربية', () => {
    expect(TIMELINE_EVENT_LABELS.PROMOTION).toBe('ترقية');
    expect(TIMELINE_EVENT_LABELS.TRANSFER).toBe('نقل');
    expect(TIMELINE_EVENT_LABELS.TERMINATION).toBe('إنهاء خدمة');
  });

  it('يغطي كل قيم التعداد بلا فجوات', () => {
    const statuses: EmploymentStatus[] = ['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED'];
    const types: EmploymentType[] = ['PERMANENT', 'CONTRACT', 'TEMPORARY', 'CONSULTANT', 'INTERN'];
    const events: TimelineEventType[] = [
      'HIRE', 'PROMOTION', 'TRANSFER', 'DEMOTION', 'LEAVE_START', 'LEAVE_END',
      'SUSPENSION', 'TERMINATION', 'REINSTATE', 'PROBATION_END', 'CONTRACT_RENEWAL',
    ];

    for (const s of statuses) {
      expect(EMPLOYMENT_STATUS_LABELS[s]).toBeTruthy();
      expect(EMPLOYMENT_STATUS_TONES[s]).toBeTruthy();
    }
    for (const t of types) {
      expect(EMPLOYMENT_TYPE_LABELS[t]).toBeTruthy();
    }
    for (const e of events) {
      expect(TIMELINE_EVENT_LABELS[e]).toBeTruthy();
      expect(TIMELINE_EVENT_TONES[e]).toBeTruthy();
    }
  });

  it('يعيد قيمة احتياطية آمنة للقيم غير المعروفة', () => {
    expect(timelineEventLabel('SOMETHING_NEW')).toBe('SOMETHING_NEW');
    expect(timelineEventLabel('SOMETHING_NEW', 'حدث')).toBe('حدث');
    expect(employmentStatusLabel('WHATEVER')).toBe('WHATEVER');
    expect(employmentStatusTone('WHATEVER')).toBe('neutral');
    expect(employmentTypeLabel('WHATEVER')).toBe('WHATEVER');
  });
});
