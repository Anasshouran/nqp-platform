# إدارة السجلات (Logging - ELK Stack) - NQP

## 1. نظرة عامة
يتم استخدام **ELK Stack** (Elasticsearch, Logstash, Kibana) لتجميع وتحليل وعرض سجلات (Logs) جميع مكونات المنصة (Django، React، Nginx، PostgreSQL، Redis، Celery، Kubernetes). يوفر ELK Stack رؤية مركزية لجميع السجلات، مما يسهل التصحيح (Debugging) والتحليل الأمني والمراقبة.

## 2. مكونات ELK Stack

| المكون | الوصف | الدور في NQP |
| :--- | :--- | :--- |
| **Elasticsearch** | قاعدة بيانات (NoSQL) لتخزين السجلات وفهرستها. | تخزين جميع السجلات (Logs). |
| **Logstash** | معالج السجلات (Logs Processor) | جمع السجلات من مصادر متعددة، معالجتها، وإرسالها إلى Elasticsearch. |
| **Kibana** | واجهة عرض السجلات (Dashboard). | عرض السجلات، البحث، التحليل، وإنشاء لوحات معلومات. |

## 3. تدفق السجلات (Log Flow)

```mermaid
flowchart LR
    A[تطبيقات NQP] --> B[Logstash]
    C[Nginx] --> B
    D[PostgreSQL] --> B
    E[Redis] --> B
    F[Celery] --> B
    G[Kubernetes Pods] --> B
    B --> H[Elasticsearch]
    H --> I[Kibana]

4. تكوين Logstash (logstash.conf)
yaml

input {
  beats {
    port => 5044
  }
  tcp {
    port => 5000
    codec => json
  }
}

filter {
  # تحليل سجلات Django
  if [type] == "django" {
    grok {
      match => {
        "message" => "%{TIMESTAMP_ISO8601:timestamp} %{LOGLEVEL:level} %{DATA:module} %{GREEDYDATA:message}"
      }
    }
    date {
      match => [ "timestamp", "ISO8601" ]
    }
  }

  # تحليل سجلات Nginx
  if [type] == "nginx" {
    grok {
      match => {
        "message" => '%{IPORHOST:clientip} - %{DATA:username} \[%{HTTPDATE:timestamp}\] "%{WORD:verb} %{URIPATHPARAM:request} HTTP/%{NUMBER:httpversion}" %{NUMBER:response} %{NUMBER:bytes} "%{DATA:referrer}" "%{DATA:agent}"'
      }
    }
  }

  # إزالة الحقول غير المرغوب فيها
  mutate {
    remove_field => ["@version", "host"]
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "nqp-logs-%{+YYYY.MM.dd}"
  }
}

5. تكوين Django Logging (settings.py)
python

# nqp_backend/settings.py
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{asctime} {levelname} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'logstash': {
            'level': 'INFO',
            'class': 'logstash_async.handler.AsynchronousLogstashHandler',
            'host': 'logstash',
            'port': 5000,
            'database_path': 'logstash.db',
        },
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['logstash', 'console'],
            'level': 'INFO',
            'propagate': True,
        },
        'django.request': {
            'handlers': ['logstash'],
            'level': 'WARNING',
            'propagate': False,
        },
        'celery': {
            'handlers': ['logstash'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

6. لوحات Kibana (Dashboards)

    Dashboard 1: Error Analysis: تحليل الأخطاء (نوع الخطأ، المصدر، التكرار، المستخدمين المتأثرين).

    Dashboard 2: Request Analysis: تحليل الطلبات (المسارات الأكثر طلباً، زمن الاستجابة، الأخطاء).

    Dashboard 3: Security Analysis: تحليل الأحداث الأمنية (محاولات الدخول الفاشلة، الوصول غير المصرح به).

7. مراجع

    ELK Stack Documentation: https://www.elastic.co/what-is/elk-stack

    Django Logging: https://docs.djangoproject.com/en/stable/topics/logging/

    logstash-async: https://github.com/marktheunissen/django-logstash-async