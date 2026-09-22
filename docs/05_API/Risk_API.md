# Risk Engine API

## نظرة عامة

محرك تقييم المخاطر يُقيّم مستوى خطر المسافر بناءً على نتائج الفحص الصحي عند نقطة الدخول.

## Endpoints

### تقييمات المخاطر

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/risk/assessments/` | قائمة تقييمات المخاطر (with pagination) |
| `GET` | `/api/v1/risk/assessments/{id}/` | تفاصيل تقييم مخاطر محدد |

### إعدادات المحرك

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/risk/settings/` | عرض إعدادات المحرك الحالية |
| `PUT` | `/api/v1/risk/settings/` | تحديث الإعدادات (ADMIN only) |

## نموذج البيانات

### RiskAssessment

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | معرف التقييم |
| `screening` | UUID | معرف الفحص المرتبط |
| `passport_number` | string | رقم جواز السفر (read-only) |
| `traveler_name` | string | اسم المسافر (read-only) |
| `port_name` | string | اسم نقطة الدخول (read-only) |
| `risk_level` | enum | `GREEN` / `YELLOW` / `RED` |
| `risk_score` | float | درجة الخطر الرقمية |
| `decision_factors` | object | عوامل القرار (JSON) |
| `recommendation` | enum | `ADMIT` / `QUARANTINE` / `REFER` |
| `assessed_at` | datetime | وقت التقييم (auto) |

### RiskSettings

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `temp_weight` | float | 1.0 | وزن درجة الحرارة |
| `spo2_weight` | float | 1.0 | وزن الأكسجين |
| `symptom_weight` | float | 5.0 | وزن الأعراض |
| `origin_weight` | float | 1.0 | وزن المنشأ |
| `vaccine_weight` | float | 1.0 | وزن التطعيم |
| `yellow_threshold` | float | 15.0 | حد التحويل للأصفر |
| `red_threshold` | float | 30.0 | حد التحويل للأحمر |
| `red_temp_threshold` | float | 39.0 | حد الحرارة الأحمر |
| `red_spo2_threshold` | float | 93.0 | حد الأكسجين الأحمر |

## خوارزمية التقييم

```
risk_score = (temp_weight * temp_score)
           + (spo2_weight * spo2_score)
           + (symptom_weight * symptom_score)
           + (origin_weight * origin_score)
           + (vaccine_weight * vaccine_score)
```

- إذا `risk_score >= red_threshold` → `RED` → `REFER`
- إذا `risk_score >= yellow_threshold` → `YELLOW` → `QUARANTINE`
- وإلا → `GREEN` → `ADMIT`

## الصلاحيات

| Endpoint | الصلاحية المطلوبة |
|----------|-------------------|
| `GET /risk/assessments/` | `risk:view` |
| `GET /risk/settings/` | `risk:view` |
| `PUT /risk/settings/` | `risk:edit` (ADMIN only) |

## عوامل التقييم

- **درجة الحرارة:** أعلى من 39°C = خطر أعلى
- **نسبة الأكسجين:** أقل من 93% = خطر أعلى
- **الأعراض:** عدد الأعراض المبلغ عنها
- **المنشأ:** حالة الوباء في بلد المنشأ
- **التطعيم:** حالة التطعيم ضد الأمراض المستهدفة

## ملاحظات تقنية

- القراءة فقط (ReadOnly) ViewSet لتقييمات المخاطر
- التقييم يتم عبر المكونات الأمامية أو عبر `screening` workflow
- `RiskSettings` قابل للتعديل من قبل المشرفين
