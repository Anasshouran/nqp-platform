# 02_Database_Schema - مخطط قاعدة بيانات صحة المعابر البرية

## الجداول الأساسية

### `border_checkpoints`
| العمود | النوع | الوصف |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY |
| `port_id` | UUID | FOREIGN KEY (ports) |
| `checkpoint_code` | VARCHAR(20) | رمز المعبر |
| `name_ar` | VARCHAR(100) | الاسم (عربي) |
| `name_en` | VARCHAR(100) | الاسم (إنجليزي) |
| `location_geo` | JSONB | الإحداثيات |
| `is_active` | BOOLEAN | حالة المعبر |

### `border_screenings`
| العمود | النوع | الوصف |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY |
| `traveler_id` | UUID | FOREIGN KEY (travelers) |
| `checkpoint_id` | UUID | FOREIGN KEY (border_checkpoints) |
| `body_temperature` | FLOAT | درجة الحرارة |
| `symptoms` | JSONB | الأعراض |
| `risk_level` | VARCHAR(10) | (GREEN, YELLOW, RED) |
| `status` | VARCHAR(20) | (PENDING, CLEARED, QUARANTINED) |

### `border_shipments`
| العمود | النوع | الوصف |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY |
| `checkpoint_id` | UUID | FOREIGN KEY (border_checkpoints) |
| `manifest_number` | VARCHAR(50) | رقم البيان |
| `supplier_name` | VARCHAR(255) | اسم المورد |
| `product_list` | JSONB | قائمة المنتجات |
| `arrival_date` | DATE | تاريخ الوصول |
| `status` | VARCHAR(20) | (RECEIVED, INSPECTING, RELEASED) |

## ⚙️ حالة التنفيذ مقابل الكود

| الجدول/المجموعة | الحالة | ملاحظة |
| :--- | :--- | :--- |
| جداول فحص الشحنات البرية | ✅ مطابقة | هي جداول `food_quarantine` نفسها (FoodShipment) بعد تصفية LAND_PORT |
| جداول فحص المسافرين | ✅ مطابقة | `screening.HealthScreening` (الأعراض JSONB + المخاطر + الحالة) |
