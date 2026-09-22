# 04_Architecture - العمارة التقنية للتطبيق الجوال

## 1. التقنية المختارة (Technology Stack)
| المكون | التقنية | السبب |
| :--- | :--- | :--- |
| **الإطار (Framework)** | **Flutter** (Cross-Platform) | كود واحد يعمل على iOS و Android، أداء ممتاز، مجتمع ضخم. |
| **لغة البرمجة** | Dart | لغة حديثة وسهلة التعلم، متوافقة مع Flutter. |
| **إدارة الحالة (State)** | Provider + Riverpod | إدارة حالة بسيطة وموثوقة. |
| **جلب البيانات (HTTP)** | Dio (مع Interceptors) | إدارة الطلبات، إعادة المحاولة، التعامل مع الـ JWT. |
| **التخزين المحلي (Local DB)** | SQLite (sqflite) + Hive | تخزين البيانات مؤقتاً للوضع دون اتصال. |
| **الإشعارات (Push)** | Firebase Cloud Messaging (FCM) | إرسال الإشعارات لنظامي iOS و Android. |
| **التحليلات (Analytics)** | Firebase Analytics | تتبع سلوك المستخدمين (اختياري). |
| **التوزيع (Distribution)** | App Store + Google Play Store | النشر الرسمي. |

## 2. طبقات التطبيق (Layers)

### 2.1. طبقة العرض (Presentation Layer)
- **الشاشات (Screens)**: كل شاشة هي (Widget) رئيسي.
- **المكونات (Widgets)**: مكونات قابلة لإعادة الاستخدام (أزرار، حقول إدخال، بطاقات).
- **المسارات (Navigation)**: استخدام `go_router` لإدارة التنقل بين الشاشات.

### 2.2. طبقة منطق الأعمال (Business Logic Layer)
- **مقدمات البيانات (Providers)**: إدارة الحالة باستخدام `Riverpod`.
- **الخدمات (Services)**: دوال تستدعي الـ API (مثل: `AuthService`, `HealthService`).
- **النماذج (Models)**: تعريفات JSON (مثل: `UserModel`, `DailyLogModel`).

### 2.3. طبقة البيانات (Data Layer)
- **مستودع البيانات (Repository)**: يدير مصدر البيانات (API أو Local DB).
- **التخزين المحلي (Local Storage)**: تخزين البيانات مؤقتاً (الإبلاغات غير المرسلة).
- **التخزين الآمن (Secure Storage)**: تخزين (Token, User ID) باستخدام `flutter_secure_storage`.

## 3. مخطط العمارة (Architecture Diagram)
```mermaid
flowchart TD
    subgraph Presentation["📱 طبقة العرض (UI)"]
        Screens[الشاشات]
        Widgets[المكونات]
        Navigation[التنقل]
    end

    subgraph Logic["🧠 طبقة المنطق (Business Logic)"]
        Providers[Providers (Riverpod)]
        Services[الخدمات (API Calls)]
        Models[النماذج (Data Models)]
    end

    subgraph Data["💾 طبقة البيانات (Data)"]
        API[API Gateway<br/>(Backend)]
        LocalDB[(SQLite<br/>Local DB)]
        SecureStore[Secure Storage<br/>(Token)]
    end

    subgraph Notifications["🔔 الإشعارات"]
        FCM[Firebase Cloud Messaging]
    end

    Presentation --> Logic
    Logic --> Data
    Data --> API
    Data --> LocalDB
    Data --> SecureStore
    Notifications --> Presentation
    API --> Backend[NQP Backend]

4. إدارة المصادقة (Authentication Flow)
    sequenceDiagram
    participant App as التطبيق
    participant Secure as Secure Storage
    participant API as Backend API

    App->>API: 1. تسجيل الدخول (email + password)
    API-->>App: 2. إرجاع Access Token + Refresh Token
    App->>Secure: 3. تخزين الـ Tokens
    App->>API: 4. طلب محمي (مع Bearer Token)
    API-->>App: 5. إذا انتهى الـ Token (401)
    App->>API: 6. طلب Refresh Token
    API-->>App: 7. إرجاع Access Token جديد
    App->>Secure: 8. تحديث الـ Token

5. وضع عدم الاتصال (Offline Mode)

    يتم تخزين البيانات (الإبلاغات اليومية) محلياً في SQLite.

    عند عودة الاتصال، يتم رفع البيانات تلقائياً (Queue).

    يتم عرض حالة الاتصال في الشريط العلوي (🟢 متصل / 🔴 غير متصل).