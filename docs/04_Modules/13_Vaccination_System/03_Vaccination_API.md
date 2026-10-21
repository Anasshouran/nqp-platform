# 03_Vaccination_API — Actual Implemented Specification

> **Last synced with code:** `main @ 0d23c5f` (2026-10-20)
>
> This document describes the **implemented** API only. Endpoints that were
> previously documented but do not exist are listed under
> [Planned / Not Implemented](#planned--not-implemented).

## 1. Base URL

```
/api/v1/vaccination/
```

> Note: **singular** `vaccination`, not `vaccinations`. Mounted in
> `backend/nqp_backend/urls.py` → `apps.vaccination.urls`.

All successful responses are wrapped by `core.renderers.EnvelopeRenderer`:

```json
{ "status": "success", "data": { }, "message": "..." }
```

`message` appears only when a view sets it. Errors are returned as
`{ "status": "error", "message": "..." }` (sometimes with `data`).

List endpoints are paginated with `core.pagination.StandardPagination`:
`?page=` and `?page_size=` (default 10, max 500). Paginated payloads are
`{ "status": "success", "data": { "count": n, "next": url, "previous": url, "results": [...] } }`.

## 2. Authentication & Permissions

- **JWT required** (`rest_framework_simplejwt`) on every endpoint except
  `/public/*` (which set `authentication_classes = []` and
  `permission_classes = [AllowAny]`).
- Permission codes use the resource `vaccination`:
  `vaccination:view` · `vaccination:add` · `vaccination:edit` ·
  `vaccination:delete` · `vaccination:issue` · `vaccination:verify`.
- Enforced by `PermissionAction` via `ActionPermissionMixin`
  (`permission_resource = 'vaccination'`).
- **Port scoping** (`SectorScopedMixin`) applies to: sites, records,
  certificates, verifications, dashboard. Users restricted to a port only see
  and act on objects belonging to that port (`resolve_user_port_ids`). The
  certificate scope field is `record__site__entry_point`.

| ViewSet | `list`/`retrieve` | `create` | `update`/`partial_update` | `destroy` | Custom actions |
|---|---|---|---|---|---|
| vaccines | view | add | edit | delete | — |
| batches | view | add | edit | delete | `adjust` → edit |
| sites | view | add | edit | delete | — |
| records | view | add | edit | delete | `search-traveler`, `assess` → view |
| certificates | view | **issue** | *(none — 405)* | *(none — 405)* | `qr`, `revoke`, `replace`, `reissue` → **issue** |
| rules | view | add | edit | delete | — |
| inventory | view | — | — | — | — |
| verifications | **verify** | — | — | — | — |
| dashboard | view | — | — | — | — |

## 3. Endpoints

### 3.1 Vaccines (master data)

| Method | Path | Permission |
|---|---|---|
| GET | `/vaccines/` | vaccination:view |
| POST | `/vaccines/` | vaccination:add |
| GET | `/vaccines/{id}/` | vaccination:view |
| PUT | `/vaccines/{id}/` | vaccination:edit |
| PATCH | `/vaccines/{id}/` | vaccination:edit |
| DELETE | `/vaccines/{id}/` | vaccination:delete |

Filters: `is_active`, `required`, `route`; search: `code`, `name_ar`,
`name_en`, `who_code`; ordering: `order`, `name_ar`, `code`.

Fields: `id, code, who_code, name_ar, name_en, route, series,
booster_required, interval_days, validity_days, required, description, order,
is_active, created_at`.

### 3.2 Vaccine Batches (LOT)

| Method | Path | Permission |
|---|---|---|
| GET | `/batches/` | vaccination:view |
| POST | `/batches/` | vaccination:add |
| GET | `/batches/{id}/` | vaccination:view |
| PUT / PATCH | `/batches/{id}/` | vaccination:edit |
| DELETE | `/batches/{id}/` | vaccination:delete |
| POST | `/batches/{id}/adjust/` | vaccination:edit |

Filters: `vaccine`, `status`; search: `lot_number`, `manufacturer`,
`vaccine__name_ar`; ordering: `expiry_date`, `received_at`.

Creating a batch records an `IN` inventory transaction
(`received_quantity` → `available_quantity` when the latter is omitted).

`adjust` body:

```json
{ "delta": -2, "reason": "تسوية جرد" }
```

`delta` must be a non-zero integer → otherwise `400`
(`قيمة delta غير صحيحة` / `لا تغيير`). Success returns
`{ "available_quantity": n, "batch": { ... } }`.

### 3.3 Vaccination Sites (clinics / points)

| Method | Path | Permission |
|---|---|---|
| GET | `/sites/` | vaccination:view |
| POST | `/sites/` | vaccination:add |
| GET | `/sites/{id}/` | vaccination:view |
| PUT / PATCH | `/sites/{id}/` | vaccination:edit |
| DELETE | `/sites/{id}/` | vaccination:delete |

Filters: `kind`; search: `name_ar`, `name_en`, `location`.

On `list`, only `is_active=True` sites are returned unless
`?include_inactive=true`; a single site is always retrievable by id.

### 3.4 Vaccination Records (doses)

| Method | Path | Permission |
|---|---|---|
| GET | `/records/` | vaccination:view |
| POST | `/records/` | vaccination:add |
| GET | `/records/{id}/` | vaccination:view |
| PUT / PATCH | `/records/{id}/` | vaccination:edit |
| DELETE | `/records/{id}/` | vaccination:delete |
| GET | `/records/search-traveler/` | vaccination:view |
| POST | `/records/assess/` | vaccination:view |

Filters: `vaccine`, `dose_type`, `status`, `traveler`; search:
`traveler__passport_number`, `traveler__first_name`, `traveler__last_name`,
`vaccine__name_ar`; ordering: `administered_at`, `created_at`.

**Create** — body accepts either `passport_number`/`passport` **or**
`traveler_id`, plus:

```json
{
  "vaccine": "uuid",
  "batch": "uuid (optional)",
  "dose_type": "FIRST | SECOND | THIRD | BOOSTER",
  "dose_number": 1,
  "administered_at": "2024-07-01",
  "site": "uuid (optional)",
  "vaccinator_id": "uuid (optional)",
  "notes": ""
}
```

- `404` — `المسافر غير موجود — تأكد من رقم الجواز`
- `400` — `اللقاح غير صالح`, `العيادة خارج نطاق منفذك`, or a service-level
  rejection (e.g. batch has insufficient stock).
- `201` — created record (serializer output).

Recording a dose decrements the batch's `available_quantity` and writes an
`OUT` inventory transaction (when a batch is given).

**search-traveler** — query params `passport` or `q` (name/passport), plus
optional `destination`. Returns:

```json
{ "traveler": { ... }, "summary": { ... }, "assessment": [ ... ] }
```

No match → `{ "traveler": null }` (200).

**assess** — body `{ "passport_number" | "traveler_id", "destination": "..." }`.
Returns `{ "assessment": [...], "records": [...], "certificates": [...] }`;
`404` if the traveler does not exist.

### 3.5 Certificates (immutable legal document)

| Method | Path | Permission |
|---|---|---|
| GET | `/certificates/` | vaccination:view |
| POST | `/certificates/` | vaccination:issue |
| GET | `/certificates/{id}/` | vaccination:view |
| GET | `/certificates/{id}/qr/` | vaccination:issue |
| POST | `/certificates/{id}/revoke/` | vaccination:issue |
| POST | `/certificates/{id}/replace/` | vaccination:issue |
| POST | `/certificates/{id}/reissue/` | vaccination:issue |
| PUT / PATCH / DELETE | `/certificates/{id}/` | **405 Method Not Allowed** |

Filters: `status`, `vaccine`; search: `certificate_number`,
`traveler__passport_number`, `traveler__first_name`, `traveler__last_name`;
ordering: `issued_at`, `valid_until`.

Certificates are **created from a vaccination record — there is no file
upload**. `PUT`, `PATCH` and `DELETE` are not routed at all (the viewset
provides only `CreateModelMixin`, `ListModelMixin`, `RetrieveModelMixin`).

**Create** — body:

```json
{ "record": "uuid", "validity_days": 3650 }
```

`validity_days` is optional. Resolution order: request → `vaccine.validity_days`
→ required rule's `validity_days` → `3650`.

- Repeat issue for the same traveler + vaccine + record returns the existing
  **active** certificate (idempotent) instead of creating a duplicate.
- `404` — `سجل الجرعة غير موجود` (also when the record is outside the
  caller's port scope).
- `400` — `لا يمكن إصدار شهادة لجرعة ملغاة`, or number exhaustion.
- `201` — created certificate.

Serialized certificate fields: `id, traveler{...}, record, vaccine,
vaccine_name_ar, vaccine_code, certificate_number, status, status_label,
issued_by, issued_by_name, issued_at, valid_until, validity_days, qr_token,
verification_path`.

**qr** (`GET /certificates/{id}/qr/`) returns:

```json
{
  "qr_png": "base64-encoded PNG",
  "verification_url": "https://<host>/verify/vaccination/AFY-VAC-000123?sig=<hmac>",
  "signature": "<hmac>"
}
```

The QR encodes the signed public verification URL (HMAC-SHA256 over
`certificate_number` + `qr_token`; the signature is derived, never stored).

**revoke** — no body. Sets `status=REVOKED` and writes a lifecycle audit row
in the same transaction. `400` with `الشهادة ملغاة بالفعل` when already
revoked (idempotent; no second audit row). Success returns the certificate.

**replace** — body `{ "replacement_reason": "..." }` (optional). The original
must be **effective ACTIVE**; it is marked `REVOKED` with `replaced_at`, and a
new certificate is created carrying `replaces=<original>` and the same
`record`/`valid_until`. `400` — `لا يمكن استبدال شهادة ليست فعالة ACTIVE`.

**reissue** — no body. Allowed only when `effective_status != ACTIVE`
(i.e. `REVOKED`, or `ACTIVE` past `valid_until` ⇒ effective `EXPIRED`). At most
**one direct child** per source: an existing child is returned as-is
(idempotent, no new audit). The new certificate is created `ACTIVE` with
`valid_until = today + 3650 days`. `400` — `لا يمكن إعادة إصدار شهادة ACTIVE`.

### 3.6 Vaccination Rules

| Method | Path | Permission |
|---|---|---|
| GET | `/rules/` | vaccination:view |
| POST | `/rules/` | vaccination:add |
| GET | `/rules/{id}/` | vaccination:view |
| PUT / PATCH | `/rules/{id}/` | vaccination:edit |
| DELETE | `/rules/{id}/` | vaccination:delete |

Filters: `vaccine`, `required`; search: `title_ar`, `vaccine__name_ar`.

Fields: `id, vaccine, vaccine_name_ar, title_ar, destination_region,
min_age_days, max_age_days, required, doses_required, validity_days, note`.

### 3.7 Inventory Transactions (read-only)

| Method | Path | Permission |
|---|---|---|
| GET | `/inventory/` | vaccination:view |
| GET | `/inventory/{id}/` | vaccination:view |

Filters: `type`, `batch`; search: `batch__lot_number`,
`batch__vaccine__name_ar`, `note`.

Fields: `id, batch, batch_number, vaccine_name_ar, type (IN|OUT|ADJUST|EXPIRED),
type_label, quantity, reference_record, created_by, created_by_name, note,
created_at`.

### 3.8 Verification Log (read-only)

| Method | Path | Permission |
|---|---|---|
| GET | `/verifications/` | **vaccination:verify** |
| GET | `/verifications/{id}/` | **vaccination:verify** |

Filters: `success`, `certificate`. Reading this log requires
`vaccination:verify` (not `view`) and is port-scoped via
`certificate__record__site__entry_point`.

Fields: `id, certificate, verified_by, verified_by_name, success, ip_address,
note, created_at`.

### 3.9 Dashboard

| Method | Path | Permission |
|---|---|---|
| GET | `/dashboard/` | vaccination:view |

Returns aggregated statistics scoped to the caller's port:

```json
{
  "doses_today": 0,
  "doses_this_week": 0,
  "total_records": 0,
  "active_certificates": 0,
  "batches_count": 0,
  "expiring_soon_batches": [],
  "by_vaccine": [],
  "recent_records": []
}
```

`batches_count` and `expiring_soon_batches` are intentionally national (batches
are shared stock, not owned by a port).

### 3.10 Public endpoints (no authentication, rate-limited)

Both use `ScopedRateThrottle` with scope `traveler_lookup` = **30 requests/hour**
(per client key). The verify endpoint writes a `CertificateVerification` row for
every attempt (success or failure); the lookup endpoint does not log.

#### GET `/public/verify/{code}/?sig=<hmac>`

Fail-closed verification of a printed certificate QR.

- `404` — `رقم الشهادة غير موجود`
- `400` — missing or non-matching `sig`:
  `توقيع رمز QR لا يطابق الشهادة — قد تكون الشهادة معدَّلة`
  (a failed `CertificateVerification` row is written)
- `200` —

```json
{
  "certificate_number": "AFY-VAC-000123",
  "vaccine_name_ar": "كوفيد-19",
  "vaccine_code": "...",
  "issued_at": "2024-07-01T10:00:00+02:00",
  "valid_until": "2034-06-29",
  "status": "ACTIVE | REVOKED | EXPIRED",
  "signature_valid": true,
  "verified": true
}
```

`status` is the **effective** status (an `ACTIVE` certificate past
`valid_until` reports `EXPIRED`). The response `message` is
`الشهادة سارية` or `الشهادة غير سارية`.

#### GET `/public/lookup/?passport=<passport>`

Operational lookup for port officers (no signature required).

```json
{
  "traveler": { "full_name": "...", "passport_partial": "AB12*****" },
  "certificates": [
    {
      "vaccine_name_ar": "...",
      "vaccine_code": "...",
      "valid_until": "2034-06-29",
      "verification_path": "/verify/vaccination/AFY-VAC-000123"
    }
  ]
}
```

Unknown passport returns `200` with `{ "traveler": null, "message": "لا يوجد مسافر بهذا الرقم" }`.
Only **active** certificates are listed; the passport is masked.

### 3.11 Mobile endpoints

Base: `/api/v1/mobile/` (`apps.mobile_api.urls`), `IsAuthenticated`; the
traveler is resolved from the authenticated principal.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/mobile/certificates/` | own certificates only |
| GET | `/api/v1/mobile/certificates/{uuid}/` | own certificate; `404` otherwise (no existence disclosure) |

Payload per certificate:

```json
{
  "id": "uuid",
  "certificate_number": "AFY-VAC-000123",
  "vaccine_name": "...",
  "issued_at": "2024-07-01T10:00:00+02:00",
  "valid_until": "2034-06-29",
  "status": "ACTIVE | REVOKED | EXPIRED"
}
```

These endpoints are read-only; no verification tools are exposed to the mobile
client. Contract: `contracts/src/mobile/certificates.ts`.

## 4. Certificate Lifecycle

| Transition | Trigger | Rules |
|---|---|---|
| **ISSUE** | `POST /certificates/` | record must be `GIVEN`; idempotent per traveler + vaccine + record |
| **REVOKE** | `POST /certificates/{id}/revoke/` | any non-revoked certificate; idempotent |
| **REPLACE** | `POST /certificates/{id}/replace/` | source must be effective `ACTIVE`; source → `REVOKED`, new cert linked via `replaces` |
| **REISSUE** | `POST /certificates/{id}/reissue/` | source must be non-`ACTIVE`; max one direct child; idempotent |

Every transition writes a `VaccinationAuditLog` row inside the same
transaction (audit failure rolls the mutation back).

Status is stored as `ACTIVE | REVOKED | EXPIRED`, but `EXPIRED` is normally
**derived** (`ACTIVE` with `valid_until < today`); `effective_status` is what
list filters, the dashboard, mobile payloads and public verification expose.

## 5. Certificate Numbering

- Format: `AFY-VAC-` + 6 zero-padded digits (`AFY-VAC-000001` … `AFY-VAC-999999`).
- Allocation is race-safe: the sequence is read, then the unique constraint on
  `certificate_number` arbitrates concurrent inserts; collisions retry
  (up to 5 attempts).
- Beyond `999999`, issuance raises `ValueError` (`تجاوز عدد شهادات التلعيم الحد
  المسموح`) — **no prefix rotation is implemented**.

## 6. Error Reference

| Code | Meaning | Examples |
|---|---|---|
| 400 | Invalid request / business rule | `اللقاح غير صالح`, `العيادة خارج نطاق منفذك`, `لا يمكن إصدار شهادة لجرعة ملغاة`, `لا يمكن استبدال شهادة ليست فعالة ACTIVE`, `لا يمكن إعادة إصدار شهادة ACTIVE`, invalid QR signature |
| 401 | Missing/expired JWT | any private endpoint |
| 403 | Missing `vaccination:<action>` permission | e.g. `vaccination:issue` on QR/revoke/replace/reissue |
| 404 | Object not found (or hidden by port scope) | `سجل الجرعة غير موجود`, `رقم الشهادة غير موجود` |
| 405 | Method not allowed | `PUT`/`PATCH`/`DELETE` on `/certificates/{id}/` |
| 429 | Throttled | public endpoints (30/hour) |

## 7. Planned / Not Implemented

The following were described in earlier revisions of this document but are
**not implemented**:

| Previously documented | Reality |
|---|---|
| `POST /api/v1/vaccinations/certificates/` with `multipart/form-data` (`file` upload) | **Not implemented.** Certificates are issued from an existing `VaccinationRecord` (`POST /certificates/` with `{"record": "<uuid>"}`); no file upload, no `PENDING` verification workflow. |
| `POST /api/v1/vaccinations/scan-qr/` | **Not implemented.** QR verification is `GET /public/verify/{code}/?sig=<hmac>`. |
| `POST /certificates/{id}/verify/` with `VERIFIED`/`REJECTED` | **Not implemented.** There is no manual verification state on certificates; `CertificateVerification` is an append-only log written by verification attempts. |
| `PUT /certificates/{id}/` (and `PATCH`/`DELETE`) | **Not allowed — 405.** Certificates are immutable; changes happen only via `revoke` / `replace` / `reissue`. |
| `GET /travelers/{traveler_id}/certificates/` | **Not implemented.** Use `GET /certificates/?search=<passport>` or `GET /records/search-traveler/?passport=...`. |
| Base URL `/api/v1/vaccinations/` | **Incorrect.** Actual base is `/api/v1/vaccination/` (singular). |
| `verification_status: PENDING/VERIFIED/REJECTED`, `qr_hash`, `file_url`, `disease_id` | **Not part of the implemented model.** See `02_Database_Schema.md` (also pending reconciliation) and `backend/apps/vaccination/models.py` for the real schema. |

## 8. References

- Source of truth: `backend/apps/vaccination/urls.py`, `views.py`,
  `serializers.py`, `services.py`, `models.py`
- Public views in the same module: `PublicVaccinationVerifyView`,
  `PublicVaccinationLookupView`
- Mobile: `backend/apps/mobile_api/views.py`
  (`MobileCertificatesView`, `MobileCertificateDetailView`),
  contract `contracts/src/mobile/certificates.ts`
- RBAC seed: `backend/apps/accounts/management/commands/seed_rbac.py`
  (`vaccination` resource)
- Related docs: `01_System_Overview.md`, `02_Database_Schema.md`,
  `04_Vaccination_Workflow.md`, `05_Vaccination_UI_UX.md`
