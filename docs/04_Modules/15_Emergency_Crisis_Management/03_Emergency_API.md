
---

### 📄 3. `03_Emergency_API.md` (واجهات برمجة نظام الطوارئ)

```markdown
# 03_Emergency_API - واجهات نظام إدارة الطوارئ والأزمات

## 1. نظرة عامة (Base URL)
`/api/v1/emergency/`

## 2. نقاط النهاية (Endpoints)

### 2.1. الإبلاغ عن حدث جديد (Report Event)
- **المسار**: `POST /events/`
- **الصلاحيات**: محمي (PORT_OFFICER, DOCTOR, ADMIN, EOC_OPERATOR).
- **الطلب (Body)**:
```json
{
  "event_type_id": "uuid",
  "title": "اشتباه بفيروس نزفي في مطار الخرطوم",
  "description": "تم اكتشاف حالة لمسافر قادم من دولة موبوءة يعاني من حمى ونزيف.",
  "source_type": "SCREENING",
  "source_id": "uuid",
  "location_port_id": "uuid",
  "severity": "HIGH",
  "affected_travelers": ["uuid1", "uuid2"]
}