
---

### 📄 8. Reports_API.md (واجهات التقارير)

```markdown
# واجهات نظام التقارير (Reports API)

## 1. نظرة عامة
تُستخدم هذه الواجهات من قبل **بوابة الإدارة الاتحادية (8)** و **وزارة الصحة** للحصول على البيانات المجمعة ولوحات المعلومات.

## 2. المسارات (Endpoints)

### 2.1. مؤشرات الأداء الرئيسية (Get KPIs)
- **المسار**: `GET /api/v1/reports/kpis`
- **الوصف**: الحصول على ملخص المؤشرات الرئيسية للمنصة.
- **الصلاحيات**: محمي (ADMIN, FEDERAL_ADMIN).
- **معاملات التصفية**: `?port_id=uuid` (لتصفية منفذ معين).
- **الاستجابة (200)**:
```json
{
  "status": "success",
  "data": {
    "total_screenings_today": 1540,
    "positive_cases_today": 12,
    "occupancy_rate": 68.5,
    "avg_processing_time": 4.2,
    "pending_lab_results": 45,
    "active_followups": 320
  }
}
2.2. إحصائيات الترصد الوبائي (Surveillance Stats)

    المسار: GET /api/v1/reports/surveillance

    الوصف: إحصائيات تفصيلية عن الحالات حسب المرض والمنفذ والفترة الزمنية.

    معاملات التصفية: ?from=2024-07-01&to=2024-07-23&disease_id=uuid.

    الاستجابة (200): بيانات مجمعة للخرائط الحرارية والرسوم البيانية.

2.3. تصدير تقرير (Export Report)

    المسار: GET /api/v1/reports/export

    الوصف: تصدير تقرير بصيغة (PDF أو Excel).

    معاملات التصفية: ?type=PDF|EXCEL&report_id=uuid.

    الاستجابة: ملف يتم تنزيله (Binary File).

2.4. تقرير IHR (للتبليغ الدولي)

    المسار: GET /api/v1/reports/ihr

    الوصف: توليد تقرير بتنسيق متوافق مع متطلبات منظمة الصحة العالمية (JSON/XML).

    الصلاحيات: محمي (IHR_FOCAL_POINT).