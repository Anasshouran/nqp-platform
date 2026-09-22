
---

### 📄 8. `Backup.md` (النسخ الاحتياطي)

```markdown
# النسخ الاحتياطي (Backup) - NQP

## 1. الهدف
ضمان استمرارية الأعمال (Business Continuity) وحماية البيانات من الفقدان بسبب الأعطال الفنية أو الكوارث الطبيعية أو الهجمات السيبرانية، من خلال تنفيذ استراتيجية نسخ احتياطي شاملة.

## 2. أنواع النسخ الاحتياطي

| النوع | التوقيت | الوصف | طريقة التخزين |
| :--- | :--- | :--- | :--- |
| **النسخ الكامل (Full Backup)** | أسبوعياً (كل يوم أحد) | نسخة كاملة من قاعدة البيانات والملفات. | تخزين خارجي (S3/MinIO) مشفر. |
| **النسخ التفاضلي (Differential)** | يومياً | التغييرات التي حدثت منذ آخر نسخ كامل. | تخزين خارجي. |
| **النسخ المتزايد (Incremental - WAL)** | كل 15 دقيقة | سجلات المعاملات (WAL) لاستعادة النقطة الزمنية. | تخزين خارجي + احتفاظ محلي لمدة 7 أيام. |
| **لقطات قاعدة البيانات (Snapshots)** | يومياً | لقطات سريعة لقاعدة البيانات. | تخزين خارجي. |

## 3. سياسة الاحتفاظ (Retention Policy)

| نوع النسخة | مدة الاحتفاظ |
| :--- | :--- |
| النسخ الكامل الأسبوعي | 12 شهراً (للرجوع للبيانات التاريخية). |
| النسخ التفاضلي اليومي | 30 يوماً. |
| سجلات WAL (المتزايدة) | 7 أيام (للاستعادة لأي نقطة زمنية خلال الأسبوع). |
| لقطات قاعدة البيانات (Snapshots) | 6 أشهر. |

## 4. إجراءات النسخ الاحتياطي

### 4.1. نسخ احتياطي لقاعدة البيانات (PostgreSQL)
```bash
#!/bin/bash
# backup_postgres.sh

BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="$BACKUP_DIR/nqp_db_$DATE.sql"

# النسخ الاحتياطي
pg_dump -U postgres -h localhost -d nqp_db > $BACKUP_FILE

# ضغط الملف
gzip $BACKUP_FILE

# تشفير الملف (AES-256)
openssl enc -aes-256-cbc -salt -in $BACKUP_FILE.gz -out $BACKUP_FILE.gz.enc -pass file:/etc/backup_key

# رفع إلى التخزين الخارجي (S3)
aws s3 cp $BACKUP_FILE.gz.enc s3://nqp-backups/postgres/

# حذف الملفات المحلية القديمة (أكثر من 7 أيام)
find $BACKUP_DIR -name "*.enc" -mtime +7 -delete


4.2. نسخ احتياطي للملفات (MinIO/S3)
bash

#!/bin/bash
# backup_files.sh

BACKUP_DIR="/backups/files"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="$BACKUP_DIR/nqp_files_$DATE.tar.gz"

# أرشفة الملفات
tar -czf $BACKUP_FILE /var/lib/minio/data/

# تشفير الملف
openssl enc -aes-256-cbc -salt -in $BACKUP_FILE -out $BACKUP_FILE.enc -pass file:/etc/backup_key

# رفع إلى التخزين الخارجي
aws s3 cp $BACKUP_FILE.enc s3://nqp-backups/files/

# حذف الملفات المحلية القديمة
find $BACKUP_DIR -name "*.enc" -mtime +7 -delete

5. جدولة النسخ الاحتياطي (Cron Jobs)
cron

# النسخ الاحتياطي اليومي لقاعدة البيانات (الساعة 2 صباحاً)
0 2 * * * /usr/local/bin/backup_postgres.sh

# النسخ الاحتياطي اليومي للملفات (الساعة 3 صباحاً)
0 3 * * * /usr/local/bin/backup_files.sh

# النسخ الاحتياطي الكامل الأسبوعي (الأحد الساعة 1 صباحاً)
0 1 * * 0 /usr/local/bin/full_backup.sh

6. مراجع

    PostgreSQL Backup: https://www.postgresql.org/docs/current/backup.html

    AWS Backup: https://aws.amazon.com/backup/

    MinIO Backup: https://min.io/docs/minio/linux/administration/backup.html