# الموارد الرقمية لمنصة الحجر الصحي القومي (NQP Assets)

## 1. الهدف
يوفر هذا المجلد جميع الموارد الرقمية (الأصول) المستخدمة في منصة NQP، بما في ذلك (الشعارات، الأيقونات، الصور، لقطات الشاشة، والمواد التسويقية). تم تصميم هذه الموارد لضمان **الاتساق البصري** والهوية الموحدة للمنصة عبر جميع القنوات (الموقع الإلكتروني، تطبيق الجوال، المواد المطبوعة، والتقارير).

## 2. هيكل المجلدات

```text
Assets/
├── README.md                    # هذا الملف
├── Branding/                    # الهوية البصرية والعلامة التجارية
│   ├── Guidelines.md            # دليل استخدام العلامة التجارية
│   ├── Colors.md                # لوحة الألوان الأساسية
│   └── Typography.md            # الخطوط والأحجام المستخدمة
├── Logos/                       # شعارات المنصة
│   ├── NQP-Logo-Horizontal.png  # الشعار الأفقي (عربي)
│   ├── NQP-Logo-Horizontal-EN.png # الشعار الأفقي (إنجليزي)
│   ├── NQP-Logo-Square.png      # الشعار المربع (للأيقونات)
│   ├── NQP-Logo-White.png       # الشعار باللون الأبيض (للخلفيات الداكنة)
│   ├── NQP-Logo-Favicon.ico     # أيقونة المتصفح (Favicon)
│   └── NQP-Logo-SVG.svg         # الشعار بصيغة SVG (قابل للتكبير)
├── Icons/                       # الأيقونات المستخدمة في المنصة
│   ├── System/                  # أيقونات النظام (الموافقة، الرفض، التنبيه)
│   │   ├── success.svg
│   │   ├── error.svg
│   │   ├── warning.svg
│   │   └── info.svg
│   ├── Portals/                 # أيقونات البوابات
│   │   ├── traveler.svg
│   │   ├── port-health.svg
│   │   ├── clinic.svg
│   │   ├── laboratory.svg
│   │   ├── food-quarantine.svg
│   │   ├── federal-admin.svg
│   │   └── emergency.svg
│   ├── Actions/                 # أيقونات الإجراءات
│   │   ├── add.svg
│   │   ├── edit.svg
│   │   ├── delete.svg
│   │   ├── view.svg
│   │   ├── download.svg
│   │   ├── upload.svg
│   │   ├── print.svg
│   │   └── share.svg
│   └── Status/                  # أيقونات الحالات
│       ├── green.svg
│       ├── yellow.svg
│       └── red.svg
├── Images/                      # الصور العامة والخلفيات
│   ├── Backgrounds/             # صور الخلفيات
│   │   ├── hero-bg.jpg          # خلفية البانر الرئيسي
│   │   ├── airport-bg.jpg       # خلفية المطارات
│   │   ├── clinic-bg.jpg        # خلفية العيادات
│   │   └── food-bg.jpg          # خلفية الحجر الغذائي
│   ├── Placeholders/            # صور مؤقتة (للتطوير)
│   │   ├── user-avatar.png
│   │   ├── news-placeholder.jpg
│   │   └── document-placeholder.png
│   └── Illustrations/           # رسومات توضيحية
│       ├── onboarding-1.svg
│       ├── onboarding-2.svg
│       ├── onboarding-3.svg
│       ├── no-data.svg
│       ├── empty-state.svg
│       └── success-state.svg
└── Screenshots/                 # لقطات شاشة للمنصة (للوثائق)
    ├── Public-Website/          # لقطات الموقع العام
    ├── Traveler-Portal/         # لقطات بوابة المسافرين
    ├── Port-Health/             # لقطات بوابة موظفي الحجر
    ├── Clinic-Portal/           # لقطات بوابة العيادات
    ├── Laboratory-Portal/       # لقطات بوابة المختبرات
    ├── Food-Quarantine/         # لقطات بوابة الحجر الغذائي
    ├── Federal-Admin/           # لقطات بوابة الإدارة
    └── Emergency-EOC/           # لقطات بوابة الطوارئ

3. إرشادات الاستخدام

    الشعارات: استخدم الشعار الرسمي فقط. لا تقم بتعديل أو تشويه الشعار.

    الأيقونات: استخدم الأيقونات الموحدة (Material Symbols أو Lucide React) في الكود.

    الصور: استخدم صوراً عالية الجودة (مضغوطة) لتحسين سرعة التحميل.

    لقطات الشاشة: التقط لقطات شاشة نظيفة وخالية من البيانات الحساسة.

4. تنسيقات الملفات
النوع	التنسيق	الاستخدام
الشعارات	PNG, SVG	PNG للويب، SVG للطباعة والتكبير.
الأيقونات	SVG	مرونة في الحجم واللون.
الصور	JPG, PNG, WebP	JPG للخلفيات، PNG للصور الشفافة، WebP للويب.
لقطات الشاشة	PNG, JPG	PNG للجودة، JPG للحجم الصغير.