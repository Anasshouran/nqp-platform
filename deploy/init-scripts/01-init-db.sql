-- ============================================================
-- init-scripts/01-init-db.sql - تهيئة قاعدة البيانات
-- يُنفَّذ تلقائياً عند أول تشغيل لحاوية PostgreSQL بواسطة psql
-- (بالمستخدم والمخزِّن المحدَّدَين في docker-compose)
-- ============================================================

-- ===== 1. تمكين الامتدادات المطلوبة =====
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ===== 2. إعدادات الأداء =====
ALTER SYSTEM SET shared_buffers = '512MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET work_mem = '16MB';
ALTER SYSTEM SET maintenance_work_mem = '128MB';
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;
SELECT pg_reload_conf();

-- ===== 3. إنشاء الجداول =====
-- تُنشأ الجداول تلقائياً عبر Django Migrations عند الإقلاع الأوّل للـ backend.