
---

### 📄 5. `Prometheus.md` (جمع المقاييس)

```markdown
# جمع المقاييس (Prometheus) - NQP

## 1. نظرة عامة
يتم استخدام **Prometheus** لجمع المقاييس (Metrics) من جميع مكونات المنصة (Backend، Frontend، قاعدة البيانات، Redis، Nginx، Kubernetes). يتم تخزين هذه المقاييس في قاعدة بيانات (Time-series) وعرضها عبر Grafana.

## 2. تكامل Prometheus مع Django
```python
# nqp_backend/settings.py
INSTALLED_APPS = [
    ...
    'django_prometheus',
    ...
]

MIDDLEWARE = [
    'django_prometheus.middleware.PrometheusBeforeMiddleware',
    ...
    'django_prometheus.middleware.PrometheusAfterMiddleware',
]

# nqp_backend/urls.py
urlpatterns = [
    path('', include('django_prometheus.urls')),  # /metrics endpoint
]

3. ملف تكوين Prometheus (prometheus.yml)
yaml

global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx-exporter:9113']

4. المقاييس الرئيسية
المقياس	الوصف	المصدر
http_requests_total	عدد طلبات HTTP.	Django (django_prometheus)
http_request_duration_seconds	زمن استجابة الطلبات.	Django
python_gc_objects_collected_total	جمع القمامة في Python.	Django
postgresql_connections	عدد الاتصالات بقاعدة البيانات.	PostgreSQL Exporter
redis_connected_clients	عدد عملاء Redis.	Redis Exporter
nginx_http_requests_total	عدد طلبات Nginx.	Nginx Exporter
container_cpu_usage_seconds_total	استخدام CPU للحاويات.	Kubernetes (cAdvisor)
container_memory_working_set_bytes	استخدام الذاكرة للحاويات.	Kubernetes (cAdvisor)
5. مراجع

    Prometheus Documentation: https://prometheus.io/docs/

    django-prometheus: https://github.com/korfuri/django-prometheus

    PostgreSQL Exporter: https://github.com/prometheus-community/postgres_exporter

    Redis Exporter: https://github.com/oliver006/redis_exporter

    Nginx Exporter: https://github.com/nginxinc/nginx-prometheus-exporter