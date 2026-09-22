
---

### 📄 3. `Coding_Standards.md` (معايير الكتابة)

```markdown
# معايير كتابة الكود (Coding Standards)

## 1. Backend (Python + Django)

| العنصر | القاعدة | مثال |
| :--- | :--- | :--- |
| **المجلدات** | `snake_case` | `risk_engine/` |
| **الملفات** | `snake_case` | `traveler_serializers.py` |
| **الفئات** | `PascalCase` | `TravelerService` |
| **الدوال** | `snake_case` | `calculate_risk_score()` |
| **المتغيرات** | `snake_case` | `traveler_id` |
| **الثوابت** | `UPPER_SNAKE_CASE` | `MAX_RETRY_ATTEMPTS` |

### 1.1. مثال على Serializer
```python
class TravelerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Traveler
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')

2. Frontend (TypeScript + React)
العنصر	القاعدة	مثال
المجلدات	PascalCase	components/Button/
الملفات (.tsx)	PascalCase	Button.tsx
المكونات	PascalCase	function ScreeningForm()
الدوال	camelCase	handleSubmit()
المتغيرات	camelCase	travelerData
الواجهات	PascalCase	

2. Frontend (TypeScript + React)
العنصر	القاعدة	مثال
المجلدات	PascalCase	components/Button/
الملفات (.tsx)	PascalCase	Button.tsx
المكونات	PascalCase	function ScreeningForm()
الدوال	camelCase	handleSubmit()
المتغيرات	camelCase	travelerData
الواجهات	PascalCase	interface Traveler
2.1. مثال على مكون React مع TypeScript
tsx

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  travelerName: z.string().min(1),
});

type FormData = z.infer<typeof schema>;

export const ScreeningForm: React.FC = () => {
  const { register, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  return <form onSubmit={handleSubmit((data) => console.log(data))}>...</form>;
};

3. رسائل Commit (Conventional Commits)
النوع	الوصف	مثال
feat	ميزة جديدة	feat(traveler): add QR code generation
fix	إصلاح خطأ	fix(screening): correct temperature validation
docs	توثيق	docs: update API documentation
style	تنسيق	style(backend): format with black
refactor	إعادة هيكلة	refactor(clinic): extract EMR logic
test	اختبارات	test(risk): add unit tests
chore	تحديث أدوات	chore: update dependencies