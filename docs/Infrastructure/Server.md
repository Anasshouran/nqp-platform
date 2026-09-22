
---

### 📄 7. `Server.md` (مواصفات الخوادم)

```markdown
# مواصفات الخوادم (Server Specifications) - NQP

## 1. نظرة عامة
يوفر هذا المستند المواصفات التقنية للخوادم المستخدمة في بيئات NQP المختلفة (التطوير، الاختبار، الإنتاج). تم اختيار المواصفات لضمان **الأداء العالي، التوفر، وقابلية التوسع**.

## 2. بيئة الإنتاج (Production)

| المكون | عدد النسخ | CPU | RAM | التخزين | نظام التشغيل | الغرض |
| :---     | :--- | :--- | :--- | :--- | :--- | :--- |
| **Frontend (React + Nginx)** | 3 | 4 vCPU | 8 GB | 100 GB SSD | Ubuntu 22.04 | تقديم ملفات الواجهة الأمامية. |
| **Backend (Django + Gunicorn)** | 3 | 8 vCPU | 16 GB | 200 GB SSD | Ubuntu 22.04 | تنفيذ منطق الأعمال وواجهات API. |
| **Celery Workers** | 2 | 4 vCPU | 8 GB | 100 GB SSD | Ubuntu 22.04 | تنفيذ المهام الخلفية. |
| **PostgreSQL (Master)** | 1 | 16 vCPU | 32 GB | 500 GB SSD | Ubuntu 22.04 | قاعدة البيانات الرئيسية. |
| **PostgreSQL (Replica)** | 1 | 8 vCPU | 16 GB | 500 GB SSD | Ubuntu 22.04 | قاعدة البيانات الاحتياطية (للقراءة). |
| **Redis Cluster** | 3 | 4 vCPU | 8 GB | 50 GB SSD | Ubuntu 22.04 | التخزين المؤقت وطابور الرسائل. |
| **MinIO (S3)** | 2 | 4 vCPU | 8 GB | 1 TB SSD | Ubuntu 22.04 | تخزين الملفات. |
| **Nginx (Load Balancer)** | 2 | 2 vCPU | 4 GB | 50 GB SSD | Ubuntu 22.04 | موازن التحميل و Reverse Proxy. |

## 3. بيئة الاختبار (Staging)

| المكون | عدد النسخ | CPU | RAM | التخزين | الغرض |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Frontend** | 1 | 2 vCPU | 4 GB | 50 GB SSD | اختبار واجهات المستخدم. |
| **Backend** | 1 | 4 vCPU | 8 GB | 100 GB SSD | اختبار منطق الأعمال. |
| **Celery** | 1 | 2 vCPU | 4 GB | 50 GB SSD | اختبار المهام الخلفية. |
| **PostgreSQL** | 1 | 4 vCPU | 8 GB | 100 GB SSD | اختبار قاعدة البيانات. |
| **Redis** | 1 | 2 vCPU | 4 GB | 50 GB SSD | اختبار التخزين المؤقت. |
| **MinIO** | 1 | 2 vCPU | 4 GB | 100 GB SSD | اختبار تخزين الملفات. |

## 4. بيئة التطوير (Development) - محلية

| المكون | CPU | RAM | التخزين | الغرض |
| :--- | :--- | :--- | :--- | :--- |
| **Docker Compose (جميع الخدمات)** | 4 vCPU | 8 GB | 50 GB | تطوير واختبار محلي. |

## 5. متطلبات التشغيل الإضافية

| المتطلب | الوصف |
| :--- | :--- |
| **نظام التشغيل** | Ubuntu 22.04 LTS (أو أحدث). |
| **المستخدم** | مستخدم غير جذري (Non-root) للتشغيل. |
| **النسخ الاحتياطي** | نسخ احتياطية يومية لقاعدة البيانات والملفات. |
| **المراقبة** | (Prometheus + Grafana) لمراقبة الموارد. |
| **التسجيل** | (ELK Stack) لتجميع السجلات. |

## 6. مراجع
- **Ubuntu Server**: [https://ubuntu.com/server](https://ubuntu.com/server)
- **AWS EC2 Instance Types**: [https://aws.amazon.com/ec2/instance-types/](https://aws.amazon.com/ec2/instance-types/)
- **Azure VM Sizes**: [https://azure.microsoft.com/en-us/pricing/details/virtual-machines/](https://azure.microsoft.com/en-us/pricing/details/virtual-machines/)

📄 8. VM.md (إدارة الأجهزة الافتراضية)
# إدارة الأجهزة الافتراضية (Virtual Machine Management) - NQP

## 1. نظرة عامة
يتم إدارة الأجهزة الافتراضية (Virtual Machines) المستخدمة في منصة NQP عبر (Hypervisor) مثل (VMware, KVM, أو Hyper-V) أو عبر (Cloud Providers) مثل (AWS, Azure, GCP). تهدف هذه الوثيقة إلى توحيد إجراءات إدارة الأجهزة الافتراضية.

## 2. أنواع الأجهزة الافتراضية

| النوع | البيئة | المزود |
| :--- | :--- | :--- |
| **خوادم فعلية (Bare Metal)** | الإنتاج | مركز البيانات (On-Premise). |
| **الأجهزة الافتراضية (VMs)** | الإنتاج، الاختبار | (VMware, KVM). |
| **الحاويات (Containers)** | جميع البيئات | (Docker, Kubernetes). |
| **السحابة (Cloud)** | (اختياري) | (AWS, Azure, GCP). |

## 3. إجراءات إنشاء VM (VM Provisioning)

| الخطوة | الوصف | الأداة |
| :--- | :--- | :--- |
| **1. طلب VM** | تقديم طلب للحصول على VM جديد. | (ServiceNow, Jira). |
| **2. تخصيص الموارد** | تحديد (CPU, RAM, التخزين). | (VMware vCenter, AWS Console). |
| **3. تثبيت نظام التشغيل** | تثبيت Ubuntu 22.04 LTS. | (PXE, ISO). |
| **4. التحديثات الأساسية** | تثبيت التحديثات الأمنية. | (apt update, apt upgrade). |
| **5. تثبيت Docker** | تثبيت Docker و Kubernetes. | (Docker, kubeadm). |
| **6. تكوين الشبكة** | تعيين IP و DNS. | (netplan, /etc/hosts). |
| **7. تكوين SSH** | إضافة المفاتيح العامة للمسؤولين. | (ssh-copy-id). |
| **8. تثبيت أدوات المراقبة** | تثبيت (Prometheus Node Exporter). | (prometheus-node-exporter). |
| **9. تسليم VM** | إعلام فريق التطوير بجاهزية VM. | (Email, Slack). |

## 4. إدارة دورة حياة VM (Lifecycle Management)

| المرحلة | الإجراء | التكرار |
| :--- | :--- | :--- |
| **الإنشاء (Provisioning)** | إنشاء VM جديد. | عند الحاجة. |
| **التشغيل (Running)** | تشغيل التطبيقات. | مستمر. |
| **الصيانة (Maintenance)** | تحديثات الأمان، ترقيات النظام. | شهري. |
| **النسخ الاحتياطي (Backup)** | عمل نسخ احتياطية للـ VM. | يومي. |
| **الإيقاف (Shutdown)** | إيقاف VM مؤقتاً. | عند الصيانة. |
| **الحذف (Decommission)** | حذف VM بعد انتهاء الحاجة. | عند الحاجة. |

## 5. النسخ الاحتياطي واستعادة (Backup & Restore)

| النوع | التكرار | التخزين | الاستعادة |
| :--- | :--- | :--- | :--- |
| **نسخ احتياطي كامل (Full Backup)** | أسبوعياً | (S3, NFS) | استعادة VM كاملة. |
| **نسخ احتياطي تزايدي (Incremental)** | يومياً | (S3, NFS) | استعادة التغييرات فقط. |
| **لقطات (Snapshots)** | قبل التغييرات الكبيرة | (VMware, KVM) | الرجوع إلى حالة سابقة. |

## 6. مراجع
- **VMware vSphere**: [https://www.vmware.com/products/vsphere.html](https://www.vmware.com/products/vsphere.html)
- **KVM**: [https://www.linux-kvm.org/](https://www.linux-kvm.org/)
- **AWS EC2**: [https://aws.amazon.com/ec2/](https://aws.amazon.com/ec2/)
- **Azure Virtual Machines**: [https://azure.microsoft.com/en-us/services/virtual-machines/](https://azure.microsoft.com/en-us/services/virtual-machines/)