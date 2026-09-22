# ShipmentManagement — إدارة الشحنات وأدوار سلسلة رقابة الأغذية

> **الإصدار:** v2 — موثّق مطابقًا للتنفيذ الفعلي (يشمل دور رئيس القسم)
> **آخر تحديث:** 2026-08-23

---

## 1. نظرة عامة — السلسلة الكاملة

```
الكاتب          المحاسب         رئيس القسم        المفتش            المختبر        رئيس القسم
تسجيل المعاملة → تحصيل الرسوم →  تعيين المفتش  →  تفتيش + عينة  →   تحليل      →  مراجعة + القرار النهائي
   (CLERK)       (ACCOUNTANT)    (STATION_HEAD)   (FOOD_INSPECTOR)                (STATION_HEAD)
```

| الدور | المسار | التخطيط | اللون |
|---|---|---|---|
| كاتب رقابة الأغذية `CLERK` | `/app/clerk-dashboard` | `GenericRoleLayout` | أزرق `#1d6fd1` |
| محاسب رقابة الأغذية `ACCOUNTANT` | `/app/accountant-dashboard` | `GenericRoleLayout` | أخضر `#0e7a4d` |
| **رئيس القسم** `STATION_HEAD` | `/app/station-dashboard` | `GenericRoleLayout` | عنبري `#b45309` |
| مفتش الأغذية `FOOD_INSPECTOR` | `/app/inspector-dashboard` | `GenericRoleLayout` | برتقالي `#fd7e14` |

> صفحة رئيس القسم: `frontend/src/pages/sectionhead/SectionHeadDashboardPage.tsx`

---

## 2. خريطة حالات المعاملة (الفعلية)

| الحالة | الوصف | الانتقال إليها |
|---|---|---|
| `DRAFT` / `RECEIVED` | مسودة/مستلمة | submit من الكاتب |
| `FEES_DUE` | مستحقة الرسوم | بعد الإرسال |
| `AWAITING_INSPECTION` | بانتظار التفتيش | بعد الدفع أو إرجاع المراجعة |
| `AWAITING_LAB_RESULTS` | بانتظار نتائج المختبر | تفتيش NEEDS_ANALYSIS + عينة |
| `AWAITING_DECISION` | بانتظار القرار | تفتيش NON_COMPLIANT أو اكتمال الفحوصات (`to-decision`) |
| `RELEASED` / `CONDITIONAL_RELEASE` | إفراج | قرار نهائي أو تفتيش COMPLIANT |
| `HOLD` | محجوزة | قرار HOLD/TEMPORARY_RELEASE/TRANSFER |
| `REJECTED` / `DESTROYED` / `RE_EXPORT` | رفض/إتلاف/إعادة تصدير | قرار نهائي |

---

## 3. لوحة رئيس القسم التشغيلية

صفحة واحدة قابلة للتمرير (بدون تبويبات) على `/app/station-dashboard` — نقطة نهاية موحدة:

```
GET /food/shipments/department-head-dashboard/?period=DAY|WEEK|MONTH|QUARTER|YEAR
```

تُحدَّث تلقائيًا كل **60 ثانية** مع طابع «آخر تحديث». أقسام الصفحة بالترتيب:

| # | القسم | المصدر في الاستجابة |
|---|---|---|
| 0 | فلتر الفترة (يوم/أسبوع/شهر/ربع/سنة) + مؤشر التحديث | `period` |
| 1 | 8 بطاقات KPI (شحنات، تفتيشات، عينات مختبر، قيد القرار، مفرج عنها، مرفوضة، محتجزة، مخالفات) | `kpis` + `status_cards` |
| 2 | شريط تنبيهات مشتقة (تقارير معلقة >3، عينات متأخرة SLA، قرارات متراكمة) 🔴/⚠️ | `alerts` |
| 3 | مؤشرات تفصيلية (نسبة الإفراج/الرفض، متوسط زمن الإفراج، نتائج غير مطابقة…) | `details` |
| 4 | جدول متابعة الشحنات (آخر 10) بألوان الحالة | `recent_shipments` |
| 5 | لوحة التفتيش: مهام الفترة/مكتملة/متأخرة + عبء كل مفتش + زر «توزيع المهام» | `inspection_board` |
| 6 | العينات والمختبر + تنبيه تجاوز SLA (48 ساعة) | `samples_board` |
| 7 | القرارات التي تحتاج مراجعة + زر «اتخاذ قرار» لكل صف | `pending_decisions` |
| 8 | رسم بياني (recharts) للشحنات حسب الحالة | `analytics_by_status` |
| 9 | الرسوم والإيرادات SDG (تفتيش/مختبر/شهادات — فواتير محصّلة) | `finance` |
| 10 | شهادات القرار (اليوم / الفترة) | `certificates` |
| 11 | حالة فريق القسم (مفتشون/مشغولون/متاحون) | `staff` |

**النوافذ الحوارية الثلاث:** توزيع المهام، مراجعة تقرير التفتيش، اتخاذ القرار الفني (انظر الأقسام 4–6).

---

## 4. توزيع المهام

- **قائمة المفتشين:** `GET /food/shipments/inspectors/` — لكل مفتش: الاسم، المهام المفتوحة، تفتيشات اليوم، إجمالي التفتيشات، الحالة (متاح/مشغول ≥3 مهام).
- **الإسناد:** `POST /food/shipments/{id}/assign-inspector/` `{assigned_inspector}` — القائمة المنسدلة مرتبة تصاعديًا بعبء العمل، ويصل المفتش إشعارًا فوريًا، وتُسجَّل العملية في `AuditLog` (`assign_inspector`).

---

## 5. مراجعة تقارير التفتيش

**الحقول الجديدة على `FoodInspection`:** `supervisor_status` (PENDING/APPROVED/RETURNED)، `supervisor_notes`، `reviewed_by`، `reviewed_at`.

**الإجراء:** `POST /food/inspections/{id}/review/`

| الإجراء | الشرط | الأثر |
|---|---|---|
| `APPROVE` اعتماد | — | `supervisor_status=APPROVED` + تدقيق `approve_inspection` + إشعار للمفتش |
| `RETURN` إرجاع | **الملاحظات إلزامية** | `supervisor_status=RETURNED` + عودة الشحنة إلى `AWAITING_INSPECTION` + إشعار للمفتش بالسبب |

**قواعد الحوكمة:**
- لا يمكن مراجعة التقرير مرتين (400 عند التكرار).
- الإجراء محصور بدور `STATION_HEAD` (أو superuser) — 403 لغيره.
- كل عملية تُسجَّل في `AuditLog`.

---

## 6. القرار الفني النهائي

**الإجراء:** `POST /food/shipments/{id}/decide/` `{decision, reason}`

| القرار | الحالة الناتجة |
|---|---|
| `COMPLIANT` إفراج نهائي | `RELEASED` |
| `CONDITIONAL_RELEASE` إفراج مشروط | `CONDITIONAL_RELEASE` |
| `HOLD` حجز مؤقت | `HOLD` |
| `RE_EXPORT` إعادة تصدير | `RE_EXPORT` |
| `REJECTED` رفض | `REJECTED` |
| `DESTROY` رفض وإتلاف | `DESTROYED` |

**قواعد:**
- **تبرير القرار إلزامي** (400 بدون سبب).
- يتطلب `fees_paid=true`.
- يصدر تلقائيًا **شهادة قرار** `FCER-XXXXXXXX` (`FoodDecisionCertificate`) يعرض رقمها في toast.
- تدقيق `final_decision` + إخطار الكاتب (`_notify_role CLERK`) والمفتش المُسند.
- لا قرارات بعد إنهاء الشحنة (RELEASED/REJECTED).

---

## 7. مراجع الـ API

| Endpoint | Method | الاستخدام |
|---|---|---|
| `/food/shipments/department-head-dashboard/` | GET | لوحة رئيس القسم الموحدة (`period`) |
| `/food/shipments/supervisor-stats/` | GET | عدادات إضافية |
| `/food/shipments/inspectors/` | GET | المفتشون وعبء العمل |
| `/food/shipments/{id}/assign-inspector/` | POST | إسناد مهمة |
| `/food/inspections/?supervisor_status=PENDING` | GET | طابور المراجعة |
| `/food/inspections/{id}/review/` | POST | اعتماد/إرجاع |
| `/food/shipments/{id}/decide/` | POST | القرار النهائي + شهادة FCER |

فلاتر أُضيفت: `supervisor_status` (التفتيش)، `assigned_inspector` (الشحنات)، `inspector`، `received_by`.

---

## 8. حدود صلاحيات رئيس القسم

| العملية | مسموح؟ |
|---|---|
| عرض معاملات المنفذ والإحصاءات | ✅ |
| إسناد مفتش / متابعة عبء العمل | ✅ |
| اعتماد تقرير تفتيش / طلب إعادة تفتيش | ✅ (حصري لدوره) |
| قرار فني نهائي بتبرير | ✅ |
| إنشاء معاملة / تحصيل رسوم | ❌ (كاتب/محاسب) |
| إدخال نتائج مختبر / اعتمادها مخبريًا | ❌ |

---

## 9. الاختبارات والتحقق

- **Backend:** `test_station_head_flow.py` — 9 اختبارات (اعتماد، إرجاع بملاحظات، منع تكرار، حماية الدور 403، عبء العمل، الإحصاءات، التبرير الإلزامي + الشهادة والتدقيق، لوحة `department-head-dashboard`). المجموعة الكاملة: **50 اختبارًا ✓**
- **Frontend:** `tsc -b && vite build` ✓
- **E2E حي:** مسودة → دفع → إسناد من سامي → تفتيش غير مطابق → اعتماد → قرار REJECTED بشهادة `FCER-…` ✓
