
---

### 📄 2. `Database_Design.md` (تصميم قاعدة البيانات - ERD)

```markdown
# تصميم قاعدة البيانات (Database Design) - مخطط ERD

## 1. مخطط العلاقات بين الكيانات (ERD) باستخدام Mermaid

```mermaid
erDiagram
    %% ==========================================
    %% 1. قسم الحوكمة والأمان (Governance)
    %% ==========================================
    users {
        uuid id PK
        string email UK
        string phone UK
        string full_name
        string hashed_password
        string national_id
        uuid port_id FK
        string role
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    roles {
        uuid id PK
        string name UK
        string description
    }

    permissions {
        uuid id PK
        string name UK
        string resource
        string action
    }

    user_roles {
        uuid user_id FK
        uuid role_id FK
    }

    role_permissions {
        uuid role_id FK
        uuid permission_id FK
    }

    audit_logs {
        uuid id PK
        uuid user_id FK
        string action_type
        string resource_type
        string resource_id
        jsonb old_value
        jsonb new_value
        string ip_address
        string user_agent
        timestamp created_at
    }

    %% ==========================================
    %% 2. البيانات الأساسية (Master Data)
    %% ==========================================
    countries {
        uuid id PK
        string code_alpha_2 UK
        string code_alpha_3
        string name_ar
        string name_en
        string risk_level
        timestamp updated_at
    }

    ports {
        uuid id PK
        string code UK
        string name_ar
        string name_en
        string type
        uuid country_id FK
        jsonb location_geo
        boolean is_active
    }

    diseases {
        uuid id PK
        string icd_11_code UK
        string name_ar
        string name_en
        jsonb symptoms
        int incubation_period_min
        int incubation_period_max
        jsonb treatment_protocol
        boolean is_public_health_emergency
        timestamp updated_at
    }

    medications {
        uuid id PK
        string name
        string generic_name
        jsonb interactions
        string unit
    }

    %% ==========================================
    %% 3. المسافرون والرحلات (Travelers & Flights)
    %% ==========================================
    travelers {
        uuid id PK
        string passport_number UK
        string first_name
        string last_name
        date date_of_birth
        uuid nationality_id FK
        string phone
        string email
        jsonb medical_history
        timestamp created_at
        timestamp updated_at
    }

    travel_documents {
        uuid id PK
        uuid traveler_id FK
        string document_type
        string document_number
        date issue_date
        date expiry_date
        string file_url
        timestamp uploaded_at
    }

    carriers {
        uuid id PK
        string name
        string iata_code UK
        jsonb contact_info
    }

    flights {
        uuid id PK
        string flight_number
        uuid carrier_id FK
        string origin_code
        uuid origin_country_id FK
        uuid destination_port_id FK
        timestamp scheduled_arrival
        string status
    }

    passenger_manifests {
        uuid id PK
        uuid flight_id FK
        uuid traveler_id FK
        string seat_number
        timestamp submitted_at
    }

    %% ==========================================
    %% 4. الفحص والتقييم (Screening & Risk)
    %% ==========================================
    health_screenings {
        uuid id PK
        uuid traveler_id FK
        uuid port_id FK
        uuid officer_id FK
        float body_temperature
        int oxygen_saturation
        int systolic_bp
        int diastolic_bp
        jsonb observed_symptoms
        timestamp screened_at
    }

    risk_assessments {
        uuid id PK
        uuid screening_id FK
        string risk_level
        float risk_score
        jsonb decision_factors
        string recommendation
        timestamp assessed_at
    }

    %% ==========================================
    %% 5. العيادات والمختبرات (Clinics & Labs)
    %% ==========================================
    clinic_visits {
        uuid id PK
        uuid traveler_id FK
        uuid referral_id FK
        uuid doctor_id FK
        text diagnosis
        string visit_status
        timestamp visited_at
    }

    emr_records {
        uuid id PK
        uuid visit_id FK
        jsonb clinical_notes
        jsonb vital_signs
        jsonb physical_exam
        timestamp created_at
    }

    prescriptions {
        uuid id PK
        uuid visit_id FK
        uuid medication_id FK
        string dosage
        string frequency
        int duration_days
        text instructions
        timestamp prescribed_at
    }

    lab_samples {
        uuid id PK
        uuid visit_id FK
        string sample_barcode UK
        string sample_type
        uuid collector_id FK
        timestamp collected_at
        string status
    }

    lab_results {
        uuid id PK
        uuid sample_id FK
        uuid disease_id FK
        string result
        float value
        uuid entered_by_id FK
        uuid approved_by_id FK
        string approval_status
        timestamp result_date
    }

    %% ==========================================
    %% 6. المتابعة المنزلية (Follow-up)
    %% ==========================================
    follow_up_patients {
        uuid id PK
        uuid traveler_id FK
        uuid clinic_visit_id FK
        date enrollment_date
        date expected_end_date
        string status
    }

    daily_health_logs {
        uuid id PK
        uuid follow_up_id FK
        float temperature
        int oxygen_saturation
        jsonb symptoms
        int mood_score
        timestamp logged_date
    }

    medication_adherence {
        uuid id PK
        uuid prescription_id FK
        date scheduled_date
        time scheduled_time
        boolean is_taken
        string verification_url
        timestamp taken_at
    }

    recovery_certificates {
        uuid id PK
        uuid follow_up_id FK
        uuid approved_by_id FK
        string certificate_hash UK
        jsonb qr_data
        date issue_date
        date expiry_date
        string status
    }

    %% ==========================================
    %% 7. الحجر الغذائي (Food Quarantine)
    %% ==========================================
    food_shipments {
        uuid id PK
        string manifest_number UK
        uuid port_id FK
        string supplier_name
        string origin_country
        jsonb product_list
        date arrival_date
        string shipment_type "IMPORT/EXPORT"
        string status "RECEIVED→FEES_DUE→AWAITING_INSPECTION→UNDER_INSPECTION→AWAITING_DECISION→final"
        string message_type "COMMERCIAL/RELIEF/EXEMPT"
        string customs_number
        string certificate_no
        string vessel_name
        string clearing_agent
        string exporter_name
        string loading_port
        string bill_of_lading
        decimal total_weight_kg "يُحسب من items"
        int samples_required "من سياسة العينات"
        boolean inspection_required
        string final_decision "COMPLIANT/PARTIAL/TEMPORARY/TRANSFER/DESTROY/…"
        string decision_reason
        timestamp submitted_at
        timestamp decided_at
    }

    food_order_items {
        uuid id PK
        uuid shipment_id FK
        string product_name
        string brand
        string origin
        decimal weight_kg
        int package_count
        string package_type
    }

    food_inspections {
        uuid id PK
        uuid shipment_id FK
        uuid inspector_id FK
        string decision "COMPLIANT/NEEDS_ANALYSIS/NON_COMPLIANT"
        decimal temperature
        date production_date
        date expiry_date
        string batch_number
        string container_condition
        string package_condition
        int damaged_count
        decimal damaged_weight
        int sound_count
        decimal sound_weight
        text notes
        timestamp inspected_at
    }

    food_samples {
        uuid id PK
        uuid inspection_id FK
        string sample_barcode UK
        string sample_type
        string sampling_reason "ROUTINE/SUSPECTED/FIRST_ENTRY"
        timestamp collected_at
        string status
    }

    food_release_certificates {
        uuid id PK
        uuid shipment_id FK
        string certificate_number UK
        uuid issued_by_id FK
        date issue_date
        jsonb certificate_data
    }

    food_decision_certificates {
        uuid id PK
        uuid shipment_id FK
        string certificate_number "FCER-…"
        string certificate_type "نوع القرار"
        uuid decision_id FK "users (مُصدر القرار)"
        string reason
        jsonb certificate_data
    }

    food_fees {
        uuid id PK
        string name_ar
        string fee_type "INSPECTION/SAMPLE/ANALYSIS/CERTIFICATE/ADMIN"
        decimal amount
        string unit
        boolean is_active
    }

    sampling_policies {
        uuid id PK
        string scope "IMPORT/EXPORT/BOTH"
        string benchmark "WEIGHT/PACKAGES"
        decimal threshold
        int samples_per_unit
        int max_samples
        string default_reason "ROUTINE/SUSPECTED/FIRST_ENTRY"
        boolean is_active
        string name_ar
        int order
    }

    %% ==========================================
    %% 8. الطوارئ والترصد (EOC & Surveillance)
    %% ==========================================
    emergency_alerts {
        uuid id PK
        uuid traveler_id FK
        uuid port_id FK
        string alert_type
        text description
        jsonb location_geo
        string status
        timestamp triggered_at
        timestamp resolved_at
    }

    eoc_actions {
        uuid id PK
        uuid alert_id FK
        uuid actor_id FK
        string action_type
        jsonb action_details
        timestamp action_taken_at
    }

    kill_switches {
        uuid id PK
        uuid port_id FK
        uuid activated_by_id FK
        text reason
        timestamp activated_at
        timestamp deactivated_at
    }

    surveillance_reports {
        uuid id PK
        date report_date
        jsonb aggregated_data
        timestamp generated_at
    }

    %% ==========================================
    %% 9. التكامل الخارجي (External Integration)
    %% ==========================================
    external_integration_logs {
        uuid id PK
        string integration_name
        string request_type
        jsonb request_payload
        jsonb response_payload
        int status_code
        timestamp request_timestamp
    }

    who_reports {
        uuid id PK
        uuid surveillance_report_id FK
        string report_format
        jsonb report_content
        string submission_status
        timestamp submitted_at
    }

    %% ==========================================
    %% 10. العلاقات (Relationships)
    %% ==========================================
    user_roles }o--|| users : "belongs to"
    user_roles }o--|| roles : "belongs to"
    role_permissions }o--|| roles : "belongs to"
    role_permissions }o--|| permissions : "belongs to"

    users }o--|| ports : "works at"
    travelers }o--|| countries : "nationality"
    flights }o--|| carriers : "operated by"
    flights }o--|| ports : "arrives at"
    passenger_manifests }o--|| flights : "listed on"
    passenger_manifests }o--|| travelers : "belongs to"

    health_screenings }o--|| travelers : "conducted on"
    health_screenings }o--|| ports : "conducted at"
    risk_assessments }o--|| health_screenings : "based on"
    clinic_visits }o--|| health_screenings : "referred from"

    lab_samples }o--|| clinic_visits : "requested by"
    lab_results }o--|| lab_samples : "analyzes"
    lab_results }o--|| diseases : "tests for"

    follow_up_patients }o--|| travelers : "assigned to"
    daily_health_logs }o--|| follow_up_patients : "logs of"
    medication_adherence }o--|| prescriptions : "tracks"

    emergency_alerts }o--|| ports : "originates from"
    kill_switches }o--|| ports : "applies to"

    2. شرح المخطط

    المفتاح الأساسي (PK): جميع الجداول تستخدم UUID كمفتاح أساسي.

    المفتاح الخارجي (FK): تمثل الأسهم العلاقات (One-to-Many) بين الجداول.

    JSONB: استُخدم لتخزين البيانات غير المنتظمة مثل (symptoms, clinical_notes, product_list) مما يعطي مرونة عالية مع الاحتفاظ بقابلية الاستعلام.