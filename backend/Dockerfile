FROM python:3.13-slim

# تثبيت الاعتماديات الأساسية (GDAL لدعم PostGIS)
RUN apt-get update && apt-get install -y \
    gdal-bin \
    libgdal-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# تثبيت حزم Python
COPY requirements/ ./requirements/
RUN pip install --no-cache-dir -r requirements/base.txt

# نسخ الكود المصدري
COPY . .

# مفتاح مؤقت لمرحلة البناء فقط (يُستبدل في Kubernetes عبر Secret)
ENV SECRET_KEY=build-time-key-not-for-production
ENV DJANGO_ENV=production

# تجميع الملفات الثابتة (Static Files) لتتمكن Nginx من خدمتها
RUN python manage.py collectstatic --noinput

# تشغيل Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "nqp_backend.wsgi:application"]