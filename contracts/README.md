# @afyatna/contracts

حزمة العقد المشتركة لـ **AFYATNA | عافيتنا** — مصدر واحد لأنواع و Zod schemas لمساحة `/api/v1/mobile/`، تستهلكها:

- `mobile/` (تطبيق React Native)
- `frontend/` (الويب — حيثما ينطبق)
- اختبارات العقد (TypeScript side)

المرجع الخادمي المعتمد للتطابق:

- OpenAPI snapshot: `backend/apps/mobile_api/tests/snapshots/mobile_v1.json`
- سجل التصنيف: `backend/apps/mobile_api/classification.py`
- اختبارات العقد: `backend/apps/mobile_api/tests/`

## الاستخدام

```ts
import {
  envelope,
  MobileTripListSchema,
  MOBILE_API_PATHS,
} from '@afyatna/contracts';
```

## الأوامر

```bash
npm install        # التبعيات (zod, typescript, vitest)
npm run typecheck  # tsc --noEmit
npm test           # vitest run
npm run openapi:export  # تصدير openapi.json من الباك اند (يتطلب Python + إعدادات)
```

## قواعد

1. أي تغيير كاسر في العقد يتطلب تحديث لقطة الخادم عبر
   `cd backend && python -m apps.mobile_api.tests.generate_snapshot`
   (لا يُقبل تحديث اللقطة دون قرار معتمد — انظر `test_contract_snapshot.py`).
2. لا تُضاف حقولاً إلى هذا الطرف قبل إضافتها وتصنيفها في الخادم
   (`MOBILE_RESPONSE_FIELDS`) — اختبار العقد الخادمي يفشل في هذه الحالة.
3. `INTERNAL` لا يظهر أبداً في أي مخطط هنا.
