
---

### 📄 4. `Branding/Typography.md` (الخطوط والأحجام)

```markdown
# الخطوط والأحجام (Typography) - NQP

## 1. الخطوط المستخدمة (Fonts)

### 1.1. الخط العربي
- **الخط**: **Tajawal** (من Google Fonts).
- **الوزن المدعوم**: 400 (Regular), 500 (Medium), 700 (Bold).
- **الاستخدام**: جميع النصوص العربية.
- **رابط الاستيراد**:
```css
@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap');

1.2. الخط الإنجليزي

    الخط: Inter (من Google Fonts).

    الوزن المدعوم: 400 (Regular), 500 (Medium), 600 (Semi-Bold), 700 (Bold).

    الاستخدام: جميع النصوص الإنجليزية.

    رابط الاستيراد:


2. أحجام الخطوط (Font Sizes)
المستوى	الحجم (px)	الحجم (rem)	الوزن	الاستخدام
H1	32px	2rem	700 (Bold)	العناوين الرئيسية (الصفحة الرئيسية).
H2	24px	1.5rem	600 (Semi-Bold)	عناوين الأقسام (الصفحات الداخلية).
H3	20px	1.25rem	600 (Semi-Bold)	عناوين البطاقات والأقسام الفرعية.
H4	18px	1.125rem	600 (Semi-Bold)	عناوين فرعية صغيرة.
Body Large	18px	1.125rem	400 (Regular)	نصوص الفقرات الطويلة.
Body	16px	1rem	400 (Regular)	النصوص العادية (افتراضي).
Body Small	14px	0.875rem	400 (Regular)	النصوص الثانوية، التواريخ.
Caption	12px	0.75rem	400 (Regular)	النصوص الصغيرة جداً (تذييل الصور، إخلاء المسؤولية).
Button	16px	1rem	500 (Medium)	النصوص على الأزرار.
Label	14px	0.875rem	500 (Medium)	تسميات الحقول (Labels).
3. تباعد الأسطر (Line Height)
النوع	تباعد الأسطر (Line Height)	الاستخدام
العناوين	1.2	العناوين (H1, H2, H3).
النصوص العادية	1.5	الفقرات والنصوص الطويلة.
النصوص الصغيرة	1.4	التواريخ، التذييل، النصوص الثانوية.
4. تطبيق الخطوط في المشروع
4.1. Tailwind CSS
javascript

// tailwind.config.js
module.exports = {
  theme: {
    fontFamily: {
      'arabic': ['Tajawal', 'sans-serif'],
      'english': ['Inter', 'sans-serif'],
    },
    fontSize: {
      'h1': '2rem',
      'h2': '1.5rem',
      'h3': '1.25rem',
      'body': '1rem',
      'small': '0.875rem',
      'caption': '0.75rem',
    },
  },
};

4.2. CSS Variables
css

:root {
  --font-arabic: 'Tajawal', sans-serif;
  --font-english: 'Inter', sans-serif;

  --font-size-h1: 2rem;
  --font-size-h2: 1.5rem;
  --font-size-h3: 1.25rem;
  --font-size-body: 1rem;
  --font-size-small: 0.875rem;
  --font-size-caption: 0.75rem;

  --line-height-title: 1.2;
  --line-height-body: 1.5;
}

5. مراجع

    Google Fonts: Tajawal, Inter.

    Material UI Typography: نظام مشابه للطباعة.