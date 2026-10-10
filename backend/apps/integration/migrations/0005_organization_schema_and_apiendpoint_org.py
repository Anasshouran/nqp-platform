"""مزامنة مخطط Organization + ربط ApiEndpoint بالمنظمة.

يُصلح هذا الترحيل drift نتج عن `0004`:

1. `0004` أنشأ `Organization` بحالة Django فقط دون أي DDL، فأبقى
   جدول `integration_externalentity` بمخطط `ExternalEntity` القديم.
2. `Integration.ApiEndpoint` في النموذج يحمل `organization` لكن
   `0004` لم يُضِفه إطلاقاً.

ملاحظتان أمنيتان:
- حذف `ExternalEntity` من حالة Django فقط (`SeparateDatabaseAndState`)
  لأن الجدول نفسه أعيد استخدامه كـ`Organization`; تنفيذ `DeleteModel`
  مباشرةً كان سيسقط الجدول.
- `api_key` القديم يُشفّر عبر Fernet (نفس مشتق `SECRET_KEY`) قبل إسقاط
  العمود، ولا يبقى plaintext في قاعدة البيانات.
"""

import base64
import hashlib
import re
import unicodedata

from cryptography.fernet import Fernet
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def _fernet():
    digest = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def _slug(value):
    text = unicodedata.normalize('NFKD', value or '')
    text = ''.join(ch for ch in text if not unicodedata.combining(ch))
    text = text.encode('ascii', 'ignore').decode().upper()
    text = re.sub(r'[^A-Z0-9]+', '_', text).strip('_')
    text = re.sub(r'_+', '_', text)
    return (text or 'ORG')[:40]


def backfill(apps, schema_editor):
    cursor = schema_editor.connection.cursor()

    cursor.execute(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name = 'integration_externalentity' AND column_name = 'name'"
    )
    has_legacy = bool(cursor.fetchall())

    rows = []
    if has_legacy:
        cursor.execute(
            'SELECT id, name, api_key FROM integration_externalentity'
        )
        rows = cursor.fetchall()

    used = set()
    cursor.execute('SELECT code FROM integration_externalentity WHERE code IS NOT NULL')
    used.update(r[0] for r in cursor.fetchall())

    for org_id, name, api_key in rows:
        code = _slug(name)
        if not code or code in used:
            code = f'{code}_{str(org_id)[:8]}'
        used.add(code)

        encrypted = ''
        if api_key:
            encrypted = _fernet().encrypt(api_key.encode()).decode()

        cursor.execute(
            'UPDATE integration_externalentity SET code = %s, name_en = %s, '
            'name_ar = %s, api_key_encrypted = %s, org_type = %s, status = %s '
            'WHERE id = %s',
            [code, name or code, name or code, encrypted, 'PARTNER', 'PENDING', org_id],
        )

    # احتياط: أي صف بلا قيم (نشأ بعد 0004) أو صف لم يُلتقط أعلاه.
    cursor.execute(
        "UPDATE integration_externalentity SET code = 'ORG_' || "
        "SUBSTRING(REPLACE(id::text, '-', '') FROM 1 FOR 12) "
        "WHERE code IS NULL"
    )
    cursor.execute(
        "UPDATE integration_externalentity SET name_en = code WHERE name_en IS NULL"
    )
    cursor.execute(
        "UPDATE integration_externalentity SET name_ar = name_en WHERE name_ar IS NULL"
    )
    cursor.execute(
        "UPDATE integration_externalentity SET org_type = 'PARTNER' WHERE org_type IS NULL"
    )
    cursor.execute(
        "UPDATE integration_externalentity SET status = 'PENDING' WHERE status IS NULL"
    )


class Migration(migrations.Migration):

    dependencies = [
        ('integration', '0004_organization_portal_models'),
    ]

    operations = [
        # 1) إزالة ExternalEntity من الحالة فقط — الجدول يخص Organization الآن.
        migrations.SeparateDatabaseAndState(
            state_operations=[migrations.DeleteModel(name='ExternalEntity')],
            database_operations=[],
        ),

        # 2) إضافة أعمدة Organization الفعلية إلى الجدول المشترك.
        migrations.RunSQL(
            sql=(
                "ALTER TABLE integration_externalentity "
                "ADD COLUMN IF NOT EXISTS code VARCHAR(50);"
                "ALTER TABLE integration_externalentity "
                "ADD COLUMN IF NOT EXISTS name_en VARCHAR(120);"
                "ALTER TABLE integration_externalentity "
                "ADD COLUMN IF NOT EXISTS name_ar VARCHAR(120);"
                "ALTER TABLE integration_externalentity "
                "ADD COLUMN IF NOT EXISTS org_type VARCHAR(20);"
                "ALTER TABLE integration_externalentity "
                "ADD COLUMN IF NOT EXISTS country VARCHAR(2);"
                "ALTER TABLE integration_externalentity "
                "ADD COLUMN IF NOT EXISTS status VARCHAR(20);"
                "ALTER TABLE integration_externalentity "
                "ADD COLUMN IF NOT EXISTS technical_contact_name VARCHAR(100);"
                "ALTER TABLE integration_externalentity "
                "ADD COLUMN IF NOT EXISTS technical_contact_email VARCHAR(254);"
                "ALTER TABLE integration_externalentity "
                "ADD COLUMN IF NOT EXISTS technical_contact_phone VARCHAR(30);"
                "ALTER TABLE integration_externalentity "
                "ADD COLUMN IF NOT EXISTS api_key_encrypted TEXT;"
                "ALTER TABLE integration_externalentity "
                "ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;"
            ),
            reverse_sql=migrations.RunSQL.noop,
        ),

        # 3) نقل البيانات القديمة + تشفير api_key.
        migrations.RunPython(backfill, migrations.RunPython.noop),

        # 4) فرض القيود النهائية وإسقاط الأعمدة القديمة.
        migrations.RunSQL(
            sql=(
                "UPDATE integration_externalentity SET country = '' WHERE country IS NULL;"
                "UPDATE integration_externalentity SET api_key_encrypted = '' WHERE api_key_encrypted IS NULL;"
                "UPDATE integration_externalentity SET technical_contact_name = '' WHERE technical_contact_name IS NULL;"
                "UPDATE integration_externalentity SET technical_contact_email = '' WHERE technical_contact_email IS NULL;"
                "UPDATE integration_externalentity SET technical_contact_phone = '' WHERE technical_contact_phone IS NULL;"
                "ALTER TABLE integration_externalentity ALTER COLUMN code SET NOT NULL;"
                "ALTER TABLE integration_externalentity ALTER COLUMN name_en SET NOT NULL;"
                "ALTER TABLE integration_externalentity ALTER COLUMN name_ar SET NOT NULL;"
                "ALTER TABLE integration_externalentity ALTER COLUMN org_type SET NOT NULL;"
                "ALTER TABLE integration_externalentity ALTER COLUMN status SET NOT NULL;"
                "ALTER TABLE integration_externalentity ALTER COLUMN country SET NOT NULL;"
                "ALTER TABLE integration_externalentity ALTER COLUMN api_key_encrypted SET NOT NULL;"
                "ALTER TABLE integration_externalentity ALTER COLUMN technical_contact_name SET NOT NULL;"
                "ALTER TABLE integration_externalentity ALTER COLUMN technical_contact_email SET NOT NULL;"
                "ALTER TABLE integration_externalentity ALTER COLUMN technical_contact_phone SET NOT NULL;"
                "ALTER TABLE integration_externalentity ALTER COLUMN status SET DEFAULT 'PENDING';"
                "ALTER TABLE integration_externalentity ALTER COLUMN org_type SET DEFAULT 'PARTNER';"
                "ALTER TABLE integration_externalentity ALTER COLUMN country SET DEFAULT '';"
                "ALTER TABLE integration_externalentity ALTER COLUMN api_key_encrypted SET DEFAULT '';"
                "ALTER TABLE integration_externalentity ALTER COLUMN technical_contact_name SET DEFAULT '';"
                "ALTER TABLE integration_externalentity ALTER COLUMN technical_contact_email SET DEFAULT '';"
                "ALTER TABLE integration_externalentity ALTER COLUMN technical_contact_phone SET DEFAULT '';"
                "DO $$ BEGIN "
                "  ALTER TABLE integration_externalentity ADD CONSTRAINT integration_externalentity_code_key UNIQUE (code); "
                "EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;"
                "ALTER TABLE integration_externalentity DROP COLUMN IF EXISTS name;"
                "ALTER TABLE integration_externalentity DROP COLUMN IF EXISTS api_key;"
            ),
            reverse_sql=migrations.RunSQL.noop,
        ),

        # 5) ربط ApiEndpoint بالمنظمة (الجدول فارغ، لذا NOT NULL آمن).
        migrations.RunSQL(
            sql=(
                "ALTER TABLE integration_apiendpoint "
                "ADD COLUMN IF NOT EXISTS organization_id uuid NOT NULL "
                "REFERENCES integration_externalentity(id) ON DELETE CASCADE;"
                "CREATE INDEX IF NOT EXISTS integration_apiendpoint_organization_id_idx "
                "ON integration_apiendpoint(organization_id);"
            ),
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name='apiendpoint',
                    name='organization',
                    field=models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='endpoints',
                        to='integration.organization',
                        verbose_name='المنظمة',
                    ),
                ),
            ],
            database_operations=[],
        ),
    ]