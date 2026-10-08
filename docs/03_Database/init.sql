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
-- 12. جداول نظام صحة المعابر البرية (Land Border Health System)
-- التطبيق: apps.borders_health — 21 جدولاً ببادئة borders_health_
-- الترحيلات المطبَّقة: borders_health.0001 .. borders_health.0007
--
-- ملاحظات تختلف عن بقية أقسام هذا الملف:
--
-- (أ) المفاتيح الأساسية: كل جدول يرث core.models.BaseModel، أي
--     id UUID PRIMARY KEY + created_at/updated_at. لكن Django يولّد
--     قيمة id في بايثون (uuid.uuid4) لا في قاعدة البيانات، لذلك لا
--     يوجد DEFAULT gen_random_uuid() على هذا العمود.
--
-- (ب) سياسات الحذف: Django لا يُصدر بنود ON DELETE إطلاقاً. كل قيد
--     مفتاح أجنبي يُنشأ على النحو:
--     FOREIGN KEY (...) REFERENCES t(id) DEFERRABLE INITIALLY DEFERRED
--     أي أن سلوك قاعدة البيانات الفعلي هو NO ACTION. أما CASCADE و
--     SET NULL و PROTECT فهي نيّة التطبيق المعرَّفة في on_delete=
--     داخل النماذج، وينفّذها ORM وليس Postgres (Constraints.md قسم 5).
--
-- (ج) على خلاف بقية الأقسام، فهارس هذا التطبيق مُعلَنة في Meta.indexes
--     ومُصدَرة صراحةً هنا: 28 فهرساً bh_* أضافها الترحيل
--     borders_health.0007 (راجع Indexes.md قسم 6).
-- ============================================================

-- ------------------------------------------------------------
-- 12.1 إدارة المعابر
-- ------------------------------------------------------------

-- ملف المعبر البري التشغيلي: امتداد OneToOne لـ masterdata_entrypoint
-- (منفذ بري واحد ⇐ ملف BorderCrossing واحد على الأكثر).
CREATE TABLE borders_health_bordercrossing (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    entry_point_id UUID NOT NULL UNIQUE REFERENCES masterdata_entrypoint(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=CASCADE
    border_type VARCHAR(10) NOT NULL DEFAULT 'ROAD',     -- ROAD | RAIL | RIVER
    neighbor_country VARCHAR(100) NOT NULL DEFAULT '',
    operating_status VARCHAR(20) NOT NULL DEFAULT 'OPEN', -- OPEN | RESTRICTED | LIMITED | CLOSED | EMERGENCY
    operating_hours VARCHAR(200) NOT NULL DEFAULT '',
    daily_capacity INTEGER CHECK (daily_capacity >= 0),
    working_agencies TEXT NOT NULL DEFAULT '',
    has_health_facility BOOLEAN NOT NULL DEFAULT FALSE,
    has_laboratory BOOLEAN NOT NULL DEFAULT FALSE,
    has_quarantine_facility BOOLEAN NOT NULL DEFAULT FALSE,
    has_isolation_facility BOOLEAN NOT NULL DEFAULT FALSE,
    quarantine_capacity INTEGER CHECK (quarantine_capacity >= 0),
    closure_reason TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT ''
);

CREATE INDEX bh_o_xc ON borders_health_bordercrossing (operating_status);
CREATE INDEX bh_n_xc ON borders_health_bordercrossing (neighbor_country);

-- مرفق داخل المعبر (مرفق صحي، مختبر، حجر، عزل، مخزن، مياه وصرف، نفايات، مكافحة نواقل)
CREATE TABLE borders_health_borderfacility (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    crossing_id UUID NOT NULL REFERENCES borders_health_bordercrossing(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=CASCADE
    kind VARCHAR(20) NOT NULL,  -- HEALTH | LABORATORY | QUARANTINE | ISOLATION | STORAGE | WATER_SANITATION | WASTE | VECTOR_CONTROL
    name_ar VARCHAR(150) NOT NULL,
    name_en VARCHAR(150) NOT NULL DEFAULT '',
    capacity INTEGER CHECK (capacity >= 0),
    staff_count INTEGER CHECK (staff_count >= 0),
    is_operational BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT NOT NULL DEFAULT ''
);

CREATE INDEX bh_ck_fac ON borders_health_borderfacility (crossing_id, kind);

-- وردية العمل — أساس احتساب القوة البشرية وإحصاءات الحركة
CREATE TABLE borders_health_bordershift (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    crossing_id UUID NOT NULL REFERENCES borders_health_bordercrossing(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=CASCADE
    shift_date DATE NOT NULL,
    shift_type VARCHAR(20) NOT NULL DEFAULT 'MORNING',  -- MORNING | AFTERNOON | NIGHT | ROTATING
    started_at TIME,
    ended_at TIME,
    supervisor_id UUID REFERENCES accounts_user(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=PROTECT
    is_staffed BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT NOT NULL DEFAULT ''
);

CREATE INDEX bh_cs_shf ON borders_health_bordershift (crossing_id, shift_date);

-- إسناد كادر صحي للمعبر
CREATE TABLE borders_health_borderstaff (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    crossing_id UUID NOT NULL REFERENCES borders_health_bordercrossing(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=CASCADE
    user_id UUID NOT NULL REFERENCES accounts_user(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=PROTECT
    role VARCHAR(30) NOT NULL,  -- MANAGER | DOCTOR | INSPECTOR | FOOD_INSPECTOR | ENVIRONMENTAL_INSPECTOR | REGISTRATION_OFFICER | LAB_TECHNICIAN | EPIDEMIOLOGY_OFFICER | EMERGENCY_OFFICER
    assignment_type VARCHAR(15) NOT NULL DEFAULT 'FULL_TIME',  -- FULL_TIME | PART_TIME | SECONDMENT
    starts_on DATE,
    ends_on DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT NOT NULL DEFAULT '',
    CONSTRAINT unique_border_staff_assignment UNIQUE (crossing_id, user_id, role)
);

CREATE INDEX bh_ci_stf ON borders_health_borderstaff (crossing_id, is_active);

-- ------------------------------------------------------------
-- 12.2 فحص المسافرين والإقرار الصحي
-- ------------------------------------------------------------

-- السجل الصحي للمسافر عند معبر بري — يرث هوية المسافر من travelers_traveler
CREATE TABLE borders_health_travelerhealthrecord (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    crossing_id UUID NOT NULL REFERENCES borders_health_bordercrossing(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=CASCADE
    traveler_id UUID NOT NULL REFERENCES travelers_traveler(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=PROTECT
    direction VARCHAR(10) NOT NULL DEFAULT 'INBOUND',  -- INBOUND | OUTBOUND
    entry_at TIMESTAMP WITH TIME ZONE NOT NULL,        -- تملؤه timezone.now في النموذج
    departure_country VARCHAR(100) NOT NULL DEFAULT '',
    visited_countries JSONB NOT NULL DEFAULT '[]'::jsonb,
    transport_mode VARCHAR(50) NOT NULL DEFAULT '',
    vehicle_id UUID REFERENCES borders_health_vehicle(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=SET_NULL
    health_status VARCHAR(20) NOT NULL DEFAULT 'FIT',  -- FIT | UNFIT | UNDER_OBSERVATION
    risk_level VARCHAR(10) NOT NULL DEFAULT 'GREEN',   -- GREEN | YELLOW | RED
    decision VARCHAR(20) NOT NULL DEFAULT 'CLEARED',  -- CLEARED | HOLD | REFERRED | QUARANTINED | REFUSED_ENTRY
    assessed_by_id UUID REFERENCES accounts_user(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=PROTECT
    notes TEXT NOT NULL DEFAULT ''
);

CREATE INDEX bh_ce_thr ON borders_health_travelerhealthrecord (crossing_id, entry_at);
CREATE INDEX bh_tc_thr ON borders_health_travelerhealthrecord (traveler_id, crossing_id);
CREATE INDEX bh_cr_thr ON borders_health_travelerhealthrecord (crossing_id, risk_level);

-- إقرار صحي للمسافر — نموذج مصنَّف بالمعبر، منفصل عن سجل الفحص
CREATE TABLE borders_health_healthdeclaration (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    crossing_id UUID NOT NULL REFERENCES borders_health_bordercrossing(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=CASCADE
    traveler_id UUID NOT NULL REFERENCES travelers_traveler(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=PROTECT
    departure_country VARCHAR(100) NOT NULL DEFAULT '',
    departure_date DATE,
    visited_countries JSONB NOT NULL DEFAULT '[]'::jsonb,
    health_conditions TEXT NOT NULL DEFAULT '',
    current_symptoms TEXT NOT NULL DEFAULT '',
    contact_name VARCHAR(150) NOT NULL DEFAULT '',
    contact_phone VARCHAR(30) NOT NULL DEFAULT '',
    declared_at TIMESTAMP WITH TIME ZONE NOT NULL,  -- auto_now_add
    status VARCHAR(15) NOT NULL DEFAULT 'RECEIVED',  -- RECEIVED | REVIEWED | APPROVED | REJECTED
    reviewed_by_id UUID REFERENCES accounts_user(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=PROTECT
    notes TEXT NOT NULL DEFAULT ''
);

CREATE INDEX bh_cd_dcl ON borders_health_healthdeclaration (crossing_id, declared_at);
CREATE INDEX bh_tc_dcl ON borders_health_healthdeclaration (traveler_id, crossing_id);

-- فحص صحي للمسافر — يُربط بالفحص المشترك عند وجوده
CREATE TABLE borders_health_borderscreening (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    crossing_id UUID NOT NULL REFERENCES borders_health_bordercrossing(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=CASCADE
    traveler_id UUID NOT NULL REFERENCES travelers_traveler(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=PROTECT
    shared_screening_id UUID REFERENCES screening_healthscreening(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=SET_NULL
    body_temperature DOUBLE PRECISION,
    oxygen_saturation DOUBLE PRECISION,
    observed_symptoms JSONB NOT NULL DEFAULT '[]'::jsonb,
    risk_level VARCHAR(10) NOT NULL DEFAULT '',  -- حقل حر بلا choices في النموذج
    document_verified BOOLEAN NOT NULL DEFAULT FALSE,
    vaccination_verified BOOLEAN NOT NULL DEFAULT FALSE,
    screening_certificate_id UUID REFERENCES vaccination_vaccinationcertificate(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=SET_NULL
    decision VARCHAR(20) NOT NULL DEFAULT 'CLEARED',  -- CLEARED | HOLD | REFERRED | QUARANTINED
    screened_by_id UUID REFERENCES accounts_user(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=PROTECT
    screened_at TIMESTAMP WITH TIME ZONE NOT NULL,  -- auto_now_add
    notes TEXT NOT NULL DEFAULT ''
);

CREATE INDEX bh_cs_scr ON borders_health_borderscreening (crossing_id, screened_at);
CREATE INDEX bh_tc_scr ON borders_health_borderscreening (traveler_id, crossing_id);
CREATE INDEX bh_cd_scr ON borders_health_borderscreening (crossing_id, decision);

-- ------------------------------------------------------------
-- 12.3 المركبات وتفتيشها
-- ------------------------------------------------------------

-- مركبة عابرة للمعبر — سجل رئيسي غير موجود على المنصة.
-- plate_number فريد عالمياً وليس لكل معبر.
CREATE TABLE borders_health_vehicle (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    crossing_id UUID NOT NULL REFERENCES borders_health_bordercrossing(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=CASCADE
    plate_number VARCHAR(30) NOT NULL UNIQUE,
    chassis_number VARCHAR(50) NOT NULL DEFAULT '',
    vehicle_type VARCHAR(25) NOT NULL DEFAULT 'TRUCK',  -- BUS | TRUCK | PRIVATE_CAR | AMBULANCE | LIVESTOCK_TRANSPORT | REFRIGERATED_TRUCK | TANKER | OTHER
    make_model VARCHAR(100) NOT NULL DEFAULT '',
    year_of_manufacture SMALLINT CHECK (year_of_manufacture >= 0),
    capacity INTEGER CHECK (capacity >= 0),
    owner_name VARCHAR(200) NOT NULL DEFAULT '',
    driver_name VARCHAR(150) NOT NULL DEFAULT '',
    driver_phone VARCHAR(30) NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE | UNDER_QUARANTINE | CONDEMNED
    notes TEXT NOT NULL DEFAULT ''
);

CREATE INDEX bh_cs_veh ON borders_health_vehicle (crossing_id, status);

-- تفتيش صحي للمركبة (نظافة، مكافحة حشرات، نفايات، تبريد).
-- لا يوجد crossing_id: النطاق يُحل عبر vehicle__crossing__entry_point.
CREATE TABLE borders_health_vehicleinspection (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    vehicle_id UUID NOT NULL REFERENCES borders_health_vehicle(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=CASCADE
    inspection_type VARCHAR(20) NOT NULL DEFAULT 'EXTERIOR',  -- EXTERIOR | CARGO_HOLD | TEMPERATURE | DISINFECTION | PEST_CONTROL | WASTE | CABIN
    inspection_date TIMESTAMP WITH TIME ZONE NOT NULL,  -- auto_now_add
    inspector_id UUID REFERENCES accounts_user(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=PROTECT
    cleanliness_status VARCHAR(20) NOT NULL DEFAULT 'COMPLIANT',   -- COMPLIANT | NON_COMPLIANT | NOT_APPLICABLE
    pest_control_status VARCHAR(20) NOT NULL DEFAULT 'COMPLIANT',  -- COMPLIANT | NON_COMPLIANT | NOT_APPLICABLE
    waste_status VARCHAR(20) NOT NULL DEFAULT 'COMPLIANT',  -- COMPLIANT | NON_COMPLIANT | NOT_APPLICABLE
    cooling_status VARCHAR(20) NOT NULL DEFAULT 'NOT_APPLICABLE',  -- COMPLIANT | NON_COMPLIANT | NOT_APPLICABLE
    findings TEXT NOT NULL DEFAULT '',
    overall_status VARCHAR(15) NOT NULL DEFAULT 'PASSED',  -- PASSED | CONDITIONAL | FAILED
    reinspection_required BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX bh_vi_vin ON borders_health_vehicleinspection (vehicle_id, inspection_date);

-- ------------------------------------------------------------
-- 12.4 الشحنات وتفتيش البضائع والأغذية
-- ------------------------------------------------------------

-- تفتيش شحنة برية أو مخزن المعبر أو مرافق المياه/الصرف (scope يغطّي الأربعة)
CREATE TABLE borders_health_cargoinspection (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    crossing_id UUID NOT NULL REFERENCES borders_health_bordercrossing(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=CASCADE
    scope VARCHAR(20) NOT NULL DEFAULT 'CARGO',  -- CARGO | FOOD | WAREHOUSE | WATER_SANITATION
    food_shipment_id UUID REFERENCES food_quarantine_foodshipment(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=SET_NULL
    facility_id UUID REFERENCES borders_health_borderfacility(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=SET_NULL
    declaration_number VARCHAR(50) NOT NULL DEFAULT '',
    product_type VARCHAR(150) NOT NULL DEFAULT '',
    country_of_origin VARCHAR(100) NOT NULL DEFAULT '',
    vehicle_id UUID REFERENCES borders_health_vehicle(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=SET_NULL
    samples_collected INTEGER NOT NULL DEFAULT 0 CHECK (samples_collected >= 0),
    laboratory_result TEXT NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING | INSPECTING | SAMPLES_SENT | AWAITING_DECISION | RELEASED | REJECTED | HOLD
    decision VARCHAR(15) NOT NULL DEFAULT '',  -- CLEARED | CONDITIONAL | REJECTED | HOLD
    decided_by_id UUID REFERENCES accounts_user(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=PROTECT
    decided_at TIMESTAMP WITH TIME ZONE,
    notes TEXT NOT NULL DEFAULT ''
);

CREATE INDEX bh_css_crg ON borders_health_cargoinspection (crossing_id, scope, status);

-- عيّنة مسحوبة من مركبة أو شحنة بإجراء معبر
CREATE TABLE borders_health_bordersample (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    crossing_id UUID NOT NULL REFERENCES borders_health_bordercrossing(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=CASCADE
    lab_sample_id UUID REFERENCES laboratory_labsample(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=SET_NULL
    cargo_inspection_id UUID REFERENCES borders_health_cargoinspection(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=CASCADE
    vehicle_id UUID REFERENCES borders_health_vehicle(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=SET_NULL
    sample_code VARCHAR(40) NOT NULL DEFAULT '',
    sample_type VARCHAR(100) NOT NULL DEFAULT '',
    collected_by_id UUID REFERENCES accounts_user(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=PROTECT
    collected_at TIMESTAMP WITH TIME ZONE NOT NULL,  -- auto_now_add
    status VARCHAR(20) NOT NULL DEFAULT 'COLLECTED',  -- COLLECTED | SENT | UNDER_TEST | RESULT_RECEIVED | REJECTED
    result TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT ''
);

CREATE INDEX bh_cc_smp ON borders_health_bordersample (crossing_id, collected_at);
CREATE INDEX bh_cs_smp ON borders_health_bordersample (cargo_inspection_id, status);

-- ------------------------------------------------------------
-- 12.5 العزل والحجر
-- ------------------------------------------------------------

-- حالة حجر صحي — كيان مستقل يربط العزل والعيادة والمرصد.
-- case_number فريد و NULLABLE عمداً: NULL يتكرر في Postgres بلا تعارض،
-- و save() يولّد Q-YYMMDD-XXXXXXXX قبل أول INSERT. الترحيل 0006 غيّر
-- القيد من (unique + default='') إلى (unique + null=True) — راجع
-- Constraints.md قسم 3.
CREATE TABLE borders_health_quarantinecase (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    case_number VARCHAR(30) UNIQUE,
    crossing_id UUID NOT NULL REFERENCES borders_health_bordercrossing(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=CASCADE
    traveler_id UUID REFERENCES travelers_traveler(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=PROTECT
    person_name VARCHAR(200) NOT NULL DEFAULT '',
    health_case_id UUID REFERENCES emergency_eoc_healthcase(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=SET_NULL
    disease_id UUID REFERENCES laboratory_disease(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=SET_NULL
    clinic_id UUID REFERENCES clinic_clinic(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=SET_NULL
    facility_id UUID REFERENCES borders_health_borderfacility(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=SET_NULL
    entry_at TIMESTAMP WITH TIME ZONE NOT NULL,  -- auto_now_add
    required_days SMALLINT NOT NULL DEFAULT 14 CHECK (required_days >= 0),
    expected_end_date DATE,
    actual_end_date DATE,
    phase VARCHAR(20) NOT NULL DEFAULT 'SCREENED',  -- SCREENED | ASSESSED | QUARANTINED | UNDER_TREATMENT | RECOVERED | RELEASED | REFERRED_OUT
    status VARCHAR(20) NOT NULL DEFAULT 'ADMITTED',  -- ADMITTED | UNDER_QUARANTINE | REFERRED | RELEASED | ESCALATED
    follow_up_notes TEXT NOT NULL DEFAULT ''
);

CREATE INDEX bh_cs_qua ON borders_health_quarantinecase (crossing_id, status);
CREATE INDEX bh_ce_qua ON borders_health_quarantinecase (crossing_id, entry_at);

-- حالة عزل — مرتبطة بالحجر أو الإحالة من العيادة
CREATE TABLE borders_health_isolationcase (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    crossing_id UUID NOT NULL REFERENCES borders_health_bordercrossing(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=CASCADE
    quarantine_case_id UUID REFERENCES borders_health_quarantinecase(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=CASCADE
    clinic_isolation_id UUID REFERENCES clinic_isolationrecord(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=SET_NULL
    facility_id UUID REFERENCES borders_health_borderfacility(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=SET_NULL
    start_date DATE NOT NULL,
    expected_end_date DATE,
    end_date DATE,
    status VARCHAR(10) NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE | RELEASED | REMOVED
    started_by_id UUID REFERENCES accounts_user(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=PROTECT
    closed_by_id UUID REFERENCES accounts_user(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=PROTECT
    notes TEXT NOT NULL DEFAULT ''
);

CREATE INDEX bh_cs_iso ON borders_health_isolationcase (crossing_id, status);

-- ------------------------------------------------------------
-- 12.6 تتبع المخالطين
-- ------------------------------------------------------------

-- حالة تتبع مخالطين مرتبطة بحالة حجر أو سراية.
-- ملاحظة: العمود case_id يشير إلى borders_health_quarantinecase (الحالة المفهرسة).
CREATE TABLE borders_health_contacttracingcase (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    case_id UUID REFERENCES borders_health_quarantinecase(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=CASCADE
    crossing_id UUID NOT NULL REFERENCES borders_health_bordercrossing(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=CASCADE
    index_case_name VARCHAR(200) NOT NULL DEFAULT '',
    transport_mode VARCHAR(50) NOT NULL DEFAULT '',
    vehicle_id UUID REFERENCES borders_health_vehicle(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=SET_NULL
    shared_contact_trace_id UUID REFERENCES emergency_eoc_contacttrace(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=SET_NULL
    follow_up_days SMALLINT NOT NULL DEFAULT 14 CHECK (follow_up_days >= 0),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,  -- auto_now_add
    status VARCHAR(15) NOT NULL DEFAULT 'OPEN',  -- OPEN | MONITORING | COMPLETED | ESCALATED
    notes TEXT NOT NULL DEFAULT ''
);

CREATE INDEX bh_cs_ctc ON borders_health_contacttracingcase (crossing_id, status);

-- مخالط مُعرَّف (راكب/مرافق) تحت متابعة
CREATE TABLE borders_health_contact (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    tracing_case_id UUID NOT NULL REFERENCES borders_health_contacttracingcase(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=CASCADE
    full_name VARCHAR(200) NOT NULL,
    passport_number VARCHAR(40) NOT NULL DEFAULT '',
    phone VARCHAR(30) NOT NULL DEFAULT '',
    seat_or_relation VARCHAR(60) NOT NULL DEFAULT '',
    status VARCHAR(15) NOT NULL DEFAULT 'IDENTIFIED',  -- IDENTIFIED | CONTACTED | QUARANTINED | MONITORING | CLEARED | LOST
    follow_up_day SMALLINT NOT NULL DEFAULT 0 CHECK (follow_up_day >= 0),
    notes TEXT NOT NULL DEFAULT ''
);

CREATE INDEX bh_ts_con ON borders_health_contact (tracing_case_id, status);

-- ------------------------------------------------------------
-- 12.7 الطوارئ والحوادث
-- ------------------------------------------------------------

-- حادثة صحية على مستوى المعبر
CREATE TABLE borders_health_borderhealthincident (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    crossing_id UUID NOT NULL REFERENCES borders_health_bordercrossing(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=CASCADE
    quarantine_case_id UUID REFERENCES borders_health_quarantinecase(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=SET_NULL
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    severity VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',  -- LOW | MEDIUM | HIGH | CRITICAL
    status VARCHAR(15) NOT NULL DEFAULT 'OPEN',  -- OPEN | INVESTIGATING | CONTROLLED | CLOSED
    reported_at TIMESTAMP WITH TIME ZONE NOT NULL,  -- auto_now_add
    closed_at TIMESTAMP WITH TIME ZONE,
    reported_by_id UUID REFERENCES accounts_user(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=PROTECT
    notes TEXT NOT NULL DEFAULT ''
);

CREATE INDEX bh_cs_inc ON borders_health_borderhealthincident (crossing_id, status);

-- طوارئ صحية تُقيّد حركة المعبر عند الضرورة (بند IHR)
CREATE TABLE borders_health_borderemergency (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    crossing_id UUID NOT NULL REFERENCES borders_health_bordercrossing(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=CASCADE
    shared_event_id UUID REFERENCES emergency_eoc_emergencyevent(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=SET_NULL
    disease_id UUID REFERENCES laboratory_disease(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=SET_NULL
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    restriction_level VARCHAR(25) NOT NULL DEFAULT 'ADVISORY',  -- ADVISORY | INCREASED_SURVEILLANCE | MOVEMENT_REDUCED | MOVEMENT_SUSPENDED | CLOSED
    status VARCHAR(15) NOT NULL DEFAULT 'OPEN',  -- OPEN | ACTIVE | CONTROLLED | CLOSED
    reported_at TIMESTAMP WITH TIME ZONE NOT NULL,  -- auto_now_add
    resolved_at TIMESTAMP WITH TIME ZONE,
    reported_by_id UUID REFERENCES accounts_user(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=PROTECT
    notes TEXT NOT NULL DEFAULT ''
);

CREATE INDEX bh_cs_emg ON borders_health_borderemergency (crossing_id, status);

-- ------------------------------------------------------------
-- 12.8 الشهادات والقرارات والإشعارات والإحصاءات
-- ------------------------------------------------------------

-- شهادة معبرية (إفراج صحي، فحص، تصريح عبور، خروج من الحجر، رفض)
CREATE TABLE borders_health_bordercertificate (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    certificate_number VARCHAR(50) NOT NULL UNIQUE,
    certificate_type VARCHAR(25) NOT NULL,  -- HEALTH_CLEARANCE | INSPECTION | PASSAGE_PERMIT | QUARANTINE_RELEASE | REJECTION
    crossing_id UUID NOT NULL REFERENCES borders_health_bordercrossing(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=CASCADE
    traveler_id UUID REFERENCES travelers_traveler(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=PROTECT
    vehicle_id UUID REFERENCES borders_health_vehicle(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=SET_NULL
    vehicle_inspection_id UUID REFERENCES borders_health_vehicleinspection(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=SET_NULL
    issue_date DATE NOT NULL,
    expiry_date DATE,
    status VARCHAR(15) NOT NULL DEFAULT 'DRAFT',  -- DRAFT | ISSUED | EXPIRED | REVOKED | CANCELLED
    qr_payload VARCHAR(500) NOT NULL DEFAULT '',
    issued_by_id UUID REFERENCES accounts_user(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=PROTECT
    notes TEXT NOT NULL DEFAULT ''
);

CREATE INDEX bh_ci_crt ON borders_health_bordercertificate (crossing_id, issue_date);

-- سجل قرارات الإفراج/الإحالة/الإنفاذ — قابل للتدقيق
CREATE TABLE borders_health_borderdecision (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    crossing_id UUID NOT NULL REFERENCES borders_health_bordercrossing(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=CASCADE
    subject_type VARCHAR(30) NOT NULL DEFAULT '',
    traveler_id UUID REFERENCES travelers_traveler(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=PROTECT
    vehicle_id UUID REFERENCES borders_health_vehicle(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=SET_NULL
    cargo_inspection_id UUID REFERENCES borders_health_cargoinspection(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=SET_NULL
    quarantine_case_id UUID REFERENCES borders_health_quarantinecase(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=SET_NULL
    outcome VARCHAR(20) NOT NULL,  -- CLEARED | CONDITIONAL | HOLD | REFERRED | REJECTED | ENFORCEMENT
    reason TEXT NOT NULL DEFAULT '',
    decided_by_id UUID REFERENCES accounts_user(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=PROTECT
    decided_at TIMESTAMP WITH TIME ZONE NOT NULL  -- auto_now_add
);

CREATE INDEX bh_cd_dec ON borders_health_borderdecision (crossing_id, decided_at);

-- إشعار صادر من المعبر (رفع إخطار، إحالة، تنبيه)
CREATE TABLE borders_health_bordernotification (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    crossing_id UUID NOT NULL REFERENCES borders_health_bordercrossing(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=CASCADE
    recipient_role VARCHAR(40) NOT NULL DEFAULT '',
    recipient_contact VARCHAR(120) NOT NULL DEFAULT '',
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    channel VARCHAR(15) NOT NULL DEFAULT 'INTERNAL',  -- INTERNAL | EMAIL | SMS | PUSH
    status VARCHAR(10) NOT NULL DEFAULT 'PENDING',  -- PENDING | SENT | FAILED
    sent_at TIMESTAMP WITH TIME ZONE,
    sent_by_id UUID REFERENCES accounts_user(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=PROTECT
    notes TEXT NOT NULL DEFAULT ''
);

CREATE INDEX bh_cs_ntf ON borders_health_bordernotification (crossing_id, sent_at);

-- إحصاءات حركة يومية مجمَّعة لكل معبر — تغذّي لوحة القيادة القومية.
-- بلا فهرس bh_*: الاستعلامات تعتمد على فهرس القيد الفريد
-- unique_border_daily_statistic (crossing_id, stat_date).
CREATE TABLE borders_health_borderdailystatistics (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    crossing_id UUID NOT NULL REFERENCES borders_health_bordercrossing(id) DEFERRABLE INITIALLY DEFERRED, -- on_delete=CASCADE
    stat_date DATE NOT NULL,
    travelers_inbound INTEGER NOT NULL DEFAULT 0 CHECK (travelers_inbound >= 0),
    travelers_outbound INTEGER NOT NULL DEFAULT 0 CHECK (travelers_outbound >= 0),
    vehicles_inspected INTEGER NOT NULL DEFAULT 0 CHECK (vehicles_inspected >= 0),
    cargo_inspections INTEGER NOT NULL DEFAULT 0 CHECK (cargo_inspections >= 0),
    quarantine_cases INTEGER NOT NULL DEFAULT 0 CHECK (quarantine_cases >= 0),
    isolation_cases INTEGER NOT NULL DEFAULT 0 CHECK (isolation_cases >= 0),
    suspected_cases INTEGER NOT NULL DEFAULT 0 CHECK (suspected_cases >= 0),
    certificates_issued INTEGER NOT NULL DEFAULT 0 CHECK (certificates_issued >= 0),
    samples_collected INTEGER NOT NULL DEFAULT 0 CHECK (samples_collected >= 0),
    average_processing_minutes INTEGER CHECK (average_processing_minutes >= 0),
    CONSTRAINT unique_border_daily_statistic UNIQUE (crossing_id, stat_date)
);

-- ============================================================
-- 13. الدوال المساعدة (Functions) - تحديث updated_at
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
-- 14. المستخدمون الأوليون (Seeding)
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