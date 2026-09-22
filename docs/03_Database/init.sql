-- ============================================================
-- NQP - National Quarantine Platform
-- سكربت إنشاء قاعدة البيانات (PostgreSQL 16+)
-- تاريخ الإنشاء: 2024-07-26
-- ============================================================

-- 1. تفعيل الامتدادات المطلوبة
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- لتوليد UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- للتشفير

-- ============================================================
-- 2. جداول البيانات المرجعية (Master Data)
-- ============================================================

-- جدول الدول
CREATE TABLE countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code_alpha_2 VARCHAR(2) UNIQUE NOT NULL,
    code_alpha_3 VARCHAR(3) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    risk_level VARCHAR(10) DEFAULT 'GREEN' CHECK (risk_level IN ('GREEN', 'YELLOW', 'RED')),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول المنافذ
CREATE TABLE ports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('AIRPORT', 'SEAPORT', 'LAND_PORT')),
    country_id UUID NOT NULL REFERENCES countries(id) ON DELETE RESTRICT,
    location_geo JSONB, -- {lat, lng}
    is_active BOOLEAN DEFAULT TRUE
);

-- جدول الأمراض (ICD-11)
CREATE TABLE diseases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    icd_11_code VARCHAR(20) UNIQUE NOT NULL,
    name_ar VARCHAR(200) NOT NULL,
    name_en VARCHAR(200) NOT NULL,
    symptoms JSONB, -- ["fever", "cough"]
    incubation_period_min INT,
    incubation_period_max INT,
    treatment_protocol JSONB,
    is_public_health_emergency BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول الأدوية
CREATE TABLE medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    generic_name VARCHAR(200) NOT NULL,
    interactions JSONB, -- قائمة الأدوية المتعارضة
    unit VARCHAR(20) NOT NULL -- mg, ml, etc.
);

-- جدول شركات النقل
CREATE TABLE carriers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    iata_code VARCHAR(3) UNIQUE,
    contact_info JSONB -- {phone, email, address}
);

-- ============================================================
-- 3. جدول المستخدمين والصلاحيات (الحوكمة)
-- ============================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    national_id VARCHAR(20),
    port_id UUID REFERENCES ports(id) ON DELETE SET NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN (
        'SUPER_ADMIN', 'FEDERAL_ADMIN', 'SECTOR_MANAGER', 
        'PORT_OFFICER', 'DOCTOR', 'LAB_TECH', 'LAB_SUPERVISOR',
        'FOOD_INSPECTOR', 'EOC_OPERATOR', 'CARRIER_REP', 'TRAVELER'
    )),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL
);

CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- ============================================================
-- 4. جدول سجل التدقيق (Audit Log)
-- ============================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(50),
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 5. جداول المسافرين والرحلات
-- ============================================================

CREATE TABLE travelers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    passport_number VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    nationality_id UUID NOT NULL REFERENCES countries(id),
    phone VARCHAR(20),
    email VARCHAR(255),
    medical_history JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE flights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flight_number VARCHAR(20) NOT NULL,
    carrier_id UUID NOT NULL REFERENCES carriers(id),
    origin_code VARCHAR(10) NOT NULL,
    origin_country_id UUID NOT NULL REFERENCES countries(id),
    destination_port_id UUID NOT NULL REFERENCES ports(id),
    scheduled_arrival TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'ARRIVED', 'DEPARTED'))
);

CREATE TABLE passenger_manifests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flight_id UUID NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
    traveler_id UUID NOT NULL REFERENCES travelers(id) ON DELETE CASCADE,
    seat_number VARCHAR(10),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(flight_id, traveler_id)
);

-- ============================================================
-- 6. جداول الفحص والتقييم
-- ============================================================

CREATE TABLE health_screenings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    traveler_id UUID NOT NULL REFERENCES travelers(id) ON DELETE RESTRICT,
    port_id UUID NOT NULL REFERENCES ports(id),
    officer_id UUID NOT NULL REFERENCES users(id),
    body_temperature FLOAT CHECK (body_temperature BETWEEN 30 AND 45),
    oxygen_saturation INT CHECK (oxygen_saturation BETWEEN 50 AND 100),
    systolic_bp INT,
    diastolic_bp INT,
    observed_symptoms JSONB,
    screened_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE risk_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    screening_id UUID NOT NULL UNIQUE REFERENCES health_screenings(id) ON DELETE CASCADE,
    risk_level VARCHAR(10) NOT NULL CHECK (risk_level IN ('GREEN', 'YELLOW', 'RED')),
    risk_score FLOAT CHECK (risk_score BETWEEN 0 AND 100),
    decision_factors JSONB,
    recommendation VARCHAR(20) NOT NULL CHECK (recommendation IN ('ADMIT', 'QUARANTINE', 'REFER')),
    assessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 7. جداول العيادات والمختبرات
-- ============================================================

CREATE TABLE clinic_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    traveler_id UUID NOT NULL REFERENCES travelers(id) ON DELETE RESTRICT,
    referral_id UUID UNIQUE REFERENCES health_screenings(id) ON DELETE SET NULL,
    doctor_id UUID NOT NULL REFERENCES users(id),
    diagnosis TEXT,
    visit_status VARCHAR(20) DEFAULT 'OPEN' CHECK (visit_status IN ('OPEN', 'CLOSED')),
    visited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE emr_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID NOT NULL UNIQUE REFERENCES clinic_visits(id) ON DELETE CASCADE,
    clinical_notes JSONB,
    vital_signs JSONB,
    physical_exam JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID NOT NULL REFERENCES clinic_visits(id) ON DELETE CASCADE,
    medication_id UUID NOT NULL REFERENCES medications(id),
    dosage VARCHAR(50) NOT NULL,
    frequency VARCHAR(50) NOT NULL,
    duration_days INT NOT NULL,
    instructions TEXT,
    prescribed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lab_samples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID NOT NULL REFERENCES clinic_visits(id) ON DELETE CASCADE,
    sample_barcode VARCHAR(50) UNIQUE NOT NULL,
    sample_type VARCHAR(30) NOT NULL,
    collector_id UUID NOT NULL REFERENCES users(id),
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'REGISTERED' CHECK (status IN ('REGISTERED', 'PROCESSING', 'COMPLETED'))
);

CREATE TABLE lab_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sample_id UUID NOT NULL UNIQUE REFERENCES lab_samples(id) ON DELETE CASCADE,
    disease_id UUID NOT NULL REFERENCES diseases(id),
    result VARCHAR(20) NOT NULL CHECK (result IN ('POSITIVE', 'NEGATIVE', 'INCONCLUSIVE')),
    value FLOAT,
    entered_by_id UUID NOT NULL REFERENCES users(id),
    approved_by_id UUID REFERENCES users(id),
    approval_status VARCHAR(20) DEFAULT 'PENDING' CHECK (approval_status IN ('PENDING', 'APPROVED')),
    result_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 8. جداول المتابعة المنزلية
-- ============================================================

CREATE TABLE follow_up_patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    traveler_id UUID NOT NULL REFERENCES travelers(id) ON DELETE RESTRICT,
    clinic_visit_id UUID NOT NULL REFERENCES clinic_visits(id) ON DELETE RESTRICT,
    enrollment_date DATE DEFAULT CURRENT_DATE,
    expected_end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED'))
);

CREATE TABLE daily_health_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follow_up_id UUID NOT NULL REFERENCES follow_up_patients(id) ON DELETE CASCADE,
    temperature FLOAT CHECK (temperature BETWEEN 30 AND 45),
    oxygen_saturation INT CHECK (oxygen_saturation BETWEEN 50 AND 100),
    symptoms JSONB,
    mood_score INT CHECK (mood_score BETWEEN 1 AND 10),
    logged_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE medication_adherence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    is_taken BOOLEAN DEFAULT FALSE,
    verification_url TEXT,
    taken_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE recovery_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follow_up_id UUID NOT NULL UNIQUE REFERENCES follow_up_patients(id) ON DELETE CASCADE,
    approved_by_id UUID NOT NULL REFERENCES users(id),
    certificate_hash VARCHAR(255) UNIQUE NOT NULL,
    qr_data JSONB,
    issue_date DATE DEFAULT CURRENT_DATE,
    expiry_date DATE,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED'))
);

-- ============================================================
-- 9. جداول الطوارئ والترصد
-- ============================================================

CREATE TABLE emergency_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    traveler_id UUID REFERENCES travelers(id) ON DELETE SET NULL,
    port_id UUID NOT NULL REFERENCES ports(id),
    alert_type VARCHAR(30) NOT NULL CHECK (alert_type IN ('RED_ALERT', 'OUTBREAK')),
    description TEXT,
    location_geo JSONB,
    status VARCHAR(20) DEFAULT 'NEW' CHECK (status IN ('NEW', 'PROCESSING', 'RESOLVED')),
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE kill_switches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    port_id UUID NOT NULL REFERENCES ports(id) ON DELETE CASCADE,
    activated_by_id UUID NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL,
    activated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deactivated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE surveillance_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_date DATE UNIQUE NOT NULL,
    aggregated_data JSONB NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 10. جداول الحجر الغذائي
-- ============================================================

CREATE TABLE food_shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manifest_number VARCHAR(50) UNIQUE NOT NULL,
    port_id UUID NOT NULL REFERENCES ports(id),
    supplier_name VARCHAR(255) NOT NULL,
    origin_country VARCHAR(100) NOT NULL,
    product_list JSONB,
    arrival_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'RECEIVED' CHECK (status IN ('RECEIVED', 'INSPECTING', 'RELEASED', 'REJECTED'))
);

CREATE TABLE food_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID NOT NULL UNIQUE REFERENCES food_shipments(id) ON DELETE CASCADE,
    inspector_id UUID NOT NULL REFERENCES users(id),
    inspection_notes JSONB,
    decision VARCHAR(20) CHECK (decision IN ('COMPLIANT', 'NON_COMPLIANT')),
    inspected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE food_samples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id UUID NOT NULL REFERENCES food_inspections(id) ON DELETE CASCADE,
    sample_barcode VARCHAR(50) UNIQUE NOT NULL,
    sample_type VARCHAR(50) NOT NULL,
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED'))
);

CREATE TABLE food_release_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID NOT NULL UNIQUE REFERENCES food_shipments(id) ON DELETE CASCADE,
    certificate_number VARCHAR(50) UNIQUE NOT NULL,
    issued_by_id UUID NOT NULL REFERENCES users(id),
    issue_date DATE DEFAULT CURRENT_DATE,
    certificate_data JSONB
);

-- ============================================================
-- 11. جدول التكامل الخارجي
-- ============================================================

CREATE TABLE external_integration_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_name VARCHAR(50) NOT NULL,
    request_type VARCHAR(50) NOT NULL,
    request_payload JSONB,
    response_payload JSONB,
    status_code INT,
    request_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 12. الدوال المساعدة (Functions) - تحديث updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- تطبيق التحديث التلقائي على الجداول التي تحتوي على updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_countries_updated_at BEFORE UPDATE ON countries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_diseases_updated_at BEFORE UPDATE ON diseases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_travelers_updated_at BEFORE UPDATE ON travelers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 13. المستخدمون الأوليون (Seeding)
-- ============================================================

-- إدراج بعض الأدوار الأساسية
INSERT INTO roles (id, name, description) VALUES
(gen_random_uuid(), 'SUPER_ADMIN', 'التحكم الكامل بالنظام'),
(gen_random_uuid(), 'FEDERAL_ADMIN', 'إدارة المنافذ والمستخدمين والتقارير'),
(gen_random_uuid(), 'SECTOR_MANAGER', 'إدارة قطاع معين'),
(gen_random_uuid(), 'PORT_OFFICER', 'موظف الفحص في المنفذ'),
(gen_random_uuid(), 'DOCTOR', 'طبيب العيادات'),
(gen_random_uuid(), 'LAB_TECH', 'فني المختبر'),
(gen_random_uuid(), 'LAB_SUPERVISOR', 'مشرف المختبر'),
(gen_random_uuid(), 'FOOD_INSPECTOR', 'مفتش الحجر الغذائي'),
(gen_random_uuid(), 'EOC_OPERATOR', 'مسؤول غرفة الطوارئ'),
(gen_random_uuid(), 'CARRIER_REP', 'ممثل شركة طيران'),
(gen_random_uuid(), 'TRAVELER', 'مسافر');

-- إدراج صلاحيات أساسية
INSERT INTO permissions (id, name, resource, action) VALUES
(gen_random_uuid(), 'READ_TRAVELER', 'TRAVELER', 'READ'),
(gen_random_uuid(), 'WRITE_TRAVELER', 'TRAVELER', 'WRITE'),
(gen_random_uuid(), 'READ_EMR', 'EMR', 'READ'),
(gen_random_uuid(), 'WRITE_EMR', 'EMR', 'WRITE'),
(gen_random_uuid(), 'READ_LAB', 'LAB', 'READ'),
(gen_random_uuid(), 'WRITE_LAB', 'LAB', 'WRITE'),
(gen_random_uuid(), 'APPROVE_LAB', 'LAB', 'APPROVE'),
(gen_random_uuid(), 'ACTIVATE_KILL_SWITCH', 'EOC', 'ACTIVATE'),
(gen_random_uuid(), 'GENERATE_REPORT', 'REPORT', 'GENERATE');

-- ============================================================
-- ملاحظة: سيتم إضافة الفهارس (Indexes) في ملف منفصل
-- ============================================================