# قائمة الأوامر السريعة (Quick Commands) - NQP

## 1. الأوامر العامة
| الأمر | الوصف |
| :--- | :--- |
| `/help` | عرض قائمة الأوامر المتاحة |
| `/version` | عرض إصدار المشروع |
| `/status` | عرض حالة المشروع |

## 2. أوامر Backend
| الأمر | الوصف |
| :--- | :--- |
| `/backend create app <name>` | إنشاء تطبيق Django جديد |
| `/backend create model <name> fields:<f1:t1>` | إنشاء نموذج Django جديد |
| `/backend create serializer <name>` | إنشاء Serializer لـ DRF |
| `/backend create viewset <name>` | إنشاء ViewSet لـ DRF |
| `/backend create service <name>` | إنشاء خدمة جديدة |
| `/backend create task <name>` | إنشاء مهمة Celery جديدة |
| `/backend create admin <name>` | إنشاء تسجيل Admin |
| `/backend create url <app> <path>` | إضافة مسار جديد |
| `/backend create permission <name> resource:<r> action:<a>` | إنشاء صلاحية جديدة |

## 3. أوامر Frontend
| الأمر | الوصف |
| :--- | :--- |
| `/frontend create component <name>` | إنشاء مكون React جديد |
| `/frontend create page <name>` | إنشاء صفحة جديدة |
| `/frontend create form <name>` | إنشاء نموذج (React Hook Form) |
| `/frontend create table <name>` | إنشاء جدول (AG Grid) |
| `/frontend create chart <name>` | إنشاء رسم بياني (Recharts) |
| `/frontend create hook <name>` | إنشاء Custom Hook |
| `/frontend create service <name>` | إنشاء خدمة (API Client) |
| `/frontend create slice <name>` | إنشاء Slice (Redux Toolkit) |
| `/frontend create route <path> <component>` | إضافة مسار (React Router) |

## 4. أوامر API
| الأمر | الوصف |
| :--- | :--- |
| `/api create endpoint <path> method:<m>` | إنشاء نقطة نهاية API جديدة |
| `/api create serializer <name>` | إنشاء Serializer لـ DRF |
| `/api create filter <name>` | إنشاء FilterSet |
| `/api create permission <name>` | إنشاء Permission Class |
| `/api create docs <app>` | إنشاء توثيق OpenAPI |
| `/api create test <endpoint>` | إنشاء اختبار API |
| `/api create throttle <name>` | إنشاء (Rate Limiting) |

## 5. أوامر قاعدة البيانات
| الأمر | الوصف |
| :--- | :--- |
| `/database create model <name> fields:<f1:t1>` | إنشاء نموذج Django جديد |
| `/database create migration <app> <desc>` | إنشاء هجرة (Migration) |
| `/database create index <model> <field>` | إنشاء فهرس (Index) |
| `/database create relationship <m1> <m2> type:<t>` | إنشاء علاقة بين نموذجين |
| `/database create jsonfield <model> <field>` | إضافة حقل JSONB |
| `/database create constraint <model> <type>` | إنشاء قيد (Constraint) |
| `/database create query <model> <method>` | إنشاء استعلام محسّن |

## 6. أوامر الاختبار
| الأمر | الوصف |
| :--- | :--- |
| `/testing create unit <app> <target>` | إنشاء اختبار وحدة (Backend) |
| `/testing create unit <component>` | إنشاء اختبار وحدة (Frontend) |
| `/testing create integration <app> <feature>` | إنشاء اختبار تكامل |
| `/testing create performance <endpoint>` | إنشاء اختبار أداء |
| `/testing create security <endpoint>` | إنشاء اختبار أمان |
| `/testing create uat <scenario>` | إنشاء اختبار UAT |
| `/testing create fixture <model>` | إنشاء بيانات اختبار (Fixtures) |

## 7. أوامر النشر
| الأمر | الوصف |
| :--- | :--- |
| `/deployment create dockerfile <service>` | إنشاء Dockerfile |
| `/deployment create compose <services>` | إنشاء docker-compose.yml |
| `/deployment create k8s <service>` | إنشاء ملفات Kubernetes |
| `/deployment create workflow <name>` | إنشاء GitHub Actions Workflow |
| `/deployment create nginx <domain>` | إنشاء ملف تكوين Nginx |
| `/deployment create ssl <domain>` | إنشاء شهادة SSL |
| `/deployment create backup <service>` | إنشاء سكربت نسخ احتياطي |

## 8. أوامر واجهات المستخدم
| الأمر | الوصف |
| :--- | :--- |
| `/ui create login` | إنشاء صفحة تسجيل الدخول |
| `/ui create dashboard <type>` | إنشاء لوحة تحكم |
| `/ui create form <name>` | إنشاء نموذج |
| `/ui create table <name>` | إنشاء جدول |
| `/ui create chart <name>` | إنشاء رسم بياني |
| `/ui create navigation <type>` | إنشاء شريط تنقل |
| `/ui create modal <name>` | إنشاء نافذة منبثقة |
| `/ui create toast` | إعداد الإشعارات |

## 9. أوامر نظام صحة المطارات (🆕)
| الأمر | الوصف |
| :--- | :--- |
| `/airport create system` | إنشاء هيكل نظام صحة المطارات بالكامل |
| `/airport create terminal <code>` | إنشاء صالة مطار جديدة |
| `/airport create screening-point <code> type:<t>` | إنشاء نقطة فحص جديدة |
| `/airport create screening <traveler> <flight>` | تسجيل فحص مسافر |
| `/airport create transit <traveler> <arrival> <departure>` | تسجيل مسافر عابر |
| `/airport create emergency <terminal> type:<t>` | تفعيل طوارئ في المطار |
| `/airport create tracing <case_id>` | تتبع مخالطين |
| `/airport create report <period>` | إنشاء تقرير مطار |
