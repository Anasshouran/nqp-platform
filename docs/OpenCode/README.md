# المساعد الذكي (OpenCode) - NQP

## 1. الهدف
يوفر هذا المجلد جميع الأوامر والتعليمات (Prompts) المستخدمة لتوجيه المساعد الذكي (AI) أثناء عملية تطوير منصة NQP.

## 2. التقنيات الحالية (Current Stack)
| الطبقة | التقنية | الإصدار |
| :--- | :--- | :--- |
| **Backend** | Python, Django, DRF | 3.13+, 4.2+, 3.15+ |
| **Frontend** | React, TypeScript, Vite | 19, 5.5+, 5.4+ |
| **Database** | PostgreSQL | 16+ |
| **Cache & Broker** | Redis | 7+ |
| **Async Tasks** | Celery, Celery Beat | 5.4+ |
| **ASGI/WSGI** | Gunicorn | 22+ |
| **Web Server** | Nginx | 1.24+ |
| **Container** | Docker, Kubernetes | 27+, 1.30+ |
| **CI/CD** | GitHub Actions | - |
| **Monitoring** | Prometheus, Grafana | - |

## 3. هيكل المجلدات
- `system_prompt.md` - التعليمات العامة للنظام
- `backend_prompt.md` - أوامر توليد كود Backend
- `frontend_prompt.md` - أوامر توليد كود Frontend
- `api_prompt.md` - أوامر توليد واجهات API
- `database_prompt.md` - أوامر توليد نماذج قاعدة البيانات
- `testing_prompt.md` - أوامر توليد اختبارات
- `deployment_prompt.md` - أوامر توليد ملفات النشر
- `ui_prompt.md` - أوامر توليد واجهات المستخدم
- `airport_prompt.md` - أوامر نظام صحة المطارات
- `opencode_commands.md` - قائمة الأوامر السريعة
- `mcp_system_prompt.md` - أوامر MCP لـ Cursor

## 4. كيفية استخدام هذه الأوامر
- في بيئة التطوير: اكتب الأمر المناسب في ملف الكود.
- في GitHub Copilot / Cursor: استخدم الأوامر المحددة في `opencode_commands.md`.
- في ChatGPT / Claude: انسخ محتوى الأمر المناسب وأرفق السياق المطلوب.
