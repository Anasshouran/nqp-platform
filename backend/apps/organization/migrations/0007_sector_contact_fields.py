# Generated manually — إضافة حقول الاتصال والموقع للقطاع

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('organization', '0006_locality'),
    ]

    operations = [
        migrations.AddField(
            model_name='sector',
            name='phone',
            field=models.CharField(blank=True, max_length=50, verbose_name='الهاتف'),
        ),
        migrations.AddField(
            model_name='sector',
            name='email',
            field=models.EmailField(blank=True, verbose_name='البريد الإلكتروني'),
        ),
        migrations.AddField(
            model_name='sector',
            name='address',
            field=models.TextField(blank=True, verbose_name='العنوان'),
        ),
        migrations.AddField(
            model_name='sector',
            name='latitude',
            field=models.DecimalField(blank=True, decimal_places=7, max_digits=10, null=True, verbose_name='خط العرض'),
        ),
        migrations.AddField(
            model_name='sector',
            name='longitude',
            field=models.DecimalField(blank=True, decimal_places=7, max_digits=10, null=True, verbose_name='خط الطول'),
        ),
        migrations.AddField(
            model_name='sector',
            name='logo',
            field=models.ImageField(blank=True, null=True, upload_to='sectors/', verbose_name='الشعار'),
        ),
        migrations.AddField(
            model_name='sector',
            name='website',
            field=models.URLField(blank=True, verbose_name='الموقع الإلكتروني'),
        ),
        migrations.AddField(
            model_name='sector',
            name='working_hours',
            field=models.CharField(blank=True, max_length=200, verbose_name='ساعات العمل'),
        ),
    ]
