"""تخزين مفاتيح API كبصمة SHA-256 بدلاً من النص الصريح.

هجرة بيانات: تحوّل أي مفتاح مخزّن كنص إلى بصمة + معاينة مقنّعة، مع حذف
النص الصريح من قاعدة البيانات (لا يُخزَّن سر المفتاح أبداً بعد الآن).
"""

import hashlib

from django.db import migrations, models


def _hash_key(key):
    return hashlib.sha256(key.encode('utf-8')).hexdigest()


def _preview_key(key):
    if not key or len(key) < 8:
        return ''
    return f'{key[:7]}••••{key[-4:]}'


def _looks_like_hash(value):
    return bool(value) and len(value) == 64 and all(c in '0123456789abcdef' for c in value.lower())


def hash_existing_plaintext_keys(apps, schema_editor):
    Carrier = apps.get_model('carriers', 'Carrier')
    for carrier in Carrier.objects.filter(api_key__isnull=False).exclude(api_key=''):
        old = carrier.api_key
        if _looks_like_hash(old):
            # بصمة سابقة (كسر إعادة تشغيل الهجرة) — نكتفي بالمعاينة إن غابت
            if not carrier.api_key_display:
                carrier.api_key_display = _preview_key(old)
                carrier.save(update_fields=['api_key_display'])
            continue
        carrier.api_key = _hash_key(old)
        carrier.api_key_display = _preview_key(old)
        carrier.save(update_fields=['api_key', 'api_key_display'])


class Migration(migrations.Migration):

    dependencies = [
        ('carriers', '0010_carrier_company_type_carrier_country_carrier_name_en_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='carrier',
            name='api_key_display',
            field=models.CharField(blank=True, default='', max_length=40, verbose_name='معاينة المفتاح (معرّف للعرض فقط)'),
        ),
        migrations.RunPython(hash_existing_plaintext_keys, migrations.RunPython.noop),
    ]