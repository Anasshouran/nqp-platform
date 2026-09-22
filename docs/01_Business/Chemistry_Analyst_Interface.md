# 🧪 Chemistry Analyst Interface Design

## Overview

The **Chemistry Analyst Interface** is an **execution interface**, not an administrative one. It focuses on **assigned samples, test execution, result entry, QC, instruments and reagents, and specification review before submitting results to the Chemistry Section Head**.

---

## 1. General Structure

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ 🧪 FCLIS │ الكيميائي المختبر │ 🔔 │ 👤 Analyst Chemistry                  │
├───────────┬────────────────────────────────────────────────────────────┤
│           │                                          │
│ 🏠 الرئيسية   │              Chemistry Dashboard       │
│           │                                          │
│ 🧪 عيناتي     │ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐            │
│               │ │ جديدة  │ │ قيد    │ │ للمراجعة│ │ متأخرة │            │
│ 🔬 التحاليل   │ │   08   │ │التحليل │ │   03   │ │   ⚠️   │            │
│               │ │        │ │   05   │ │        │ │   ⚠️   │            │
│ 🧪 QC         │ └────────┘ └────────┘ └────────┘ └────────┘            │
│           │                                          │
│ 🧰 الأجهزة    │ 🔍 Search Sample / Barcode               │
│           │                                          │
│ 🧪 الكواشف    │ ┌────────────────────────────────────────┐   │
│               │ │ عيناتي                                │   │
│ ⏱ SLA         │ ├────────┬────────┬────────┬────────┬─────────┤   │
│               │ │ Sample │ Product│ Test   │ SLA   │ Action    │   │
│ 📋 النتائج    │ ├────────┼────────┼────────┼────────┼─────────┤   │
│               │ │ SMP001 │ Milk   │ Fat    │ 1d     │ Start     │   │
│ 🔔 التنبيهات  │ │ SMP002 │ Rice   │ Moist. │ ⚠️   │ Follow-up │   │
│               │ └────────┴────────┴────────┴────────┴─────────┘   │
└───────────────┴──────────────────────────────────────────────────────────┘
```

---

## 2. Analyst Dashboard

### KPIs

```text
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ 🧪 New Samples│ │ 🔬 In Analysis│ │ 📋 For Review │
│       8      │ │       5      │ │       3      │
└──────────────┘ └──────────────┘ └──────────────┘

┌──────────────┐ ┌──────────────┐
│ ⚠️ Overdue    │ │ ✓ Completed  │
│       1      │ │      24      │
└──────────────┘ └──────────────┘
```

Also shows:

* Analyses due today.
* Urgent samples.
* Required QC tests.
* Unavailable instruments.
* Reagents approaching expiry.

---

## 3. My Samples List

```text
┌──────────────────────────────────────────────────────────────────────┐
│ 🧪 My Assigned Samples                                               │
├─────────┬────────────┬──────────────┬─────────┬─────────┬────────────┤
│ Sample  │ Product    │ Test         │ Priority│ SLA     │ Status     │
├─────────┼────────────┼──────────────┼─────────┼─────────┼────────────┤
│ SMP001  │ Milk Powder│ Moisture     │ Normal  │ 1 Day   │ Pending    │
│ SMP002  │ Oil        │ Fat          │ Urgent  │ ⚠️ 4h   │ In Progress│
│ SMP003  │ Rice       │ Aflatoxin    │ Normal  │ 2 Days  │ Pending    │
└─────────┴────────────┴──────────────┴─────────┴─────────┴────────────┘
```

Actions:

```text
👁 View
▶ Start
⏸ Stop
📝 Enter Result
📋 Details
```

---

## 4. Sample Details Screen

When opening a sample:

```text
┌────────────────────────────────────────────────────────────┐
│ SMP-2026-00125                                  🟡 PENDING │
├────────────────────────────────────────────────────────────┤
│ Product:        Milk Powder                                │
│ Source:         Port Sudan – Northern Port                 │
│ Request:        REQ-2026-00321                             │
│ Received:       16/08/2026 09:20                           │
│ Analyst:        Ahmed                                      │
├────────────────────────────────────────────────────────────┤
│ Tests                                                        │
│                                                            │
│ ☑ Moisture                                                 │
│ ☑ Fat                                                      │
│ ☑ Protein                                                  │
│ ☑ Ash                                                      │
│ ☐ Aflatoxin                                                │
└────────────────────────────────────────────────────────────┘
```

---

## 5. Pre-Analysis Auto-Check

The system automatically checks:

```text
Sample Valid?          ✓
Payment Status?        ✓
Method Available?      ✓
Equipment Available?   ✓
Reagent Available?     ✓
QC Status?             ✓
Specification Active?  ✓
```

If all is well:

```text
[ ▶ Start Analysis ]
```

If there's an issue:

```text
🔴 Cannot Start Test

Reason:
Required reagent expired.
```

---

## 6. Analysis Execution Screen

Example **Aflatoxin**:

```text
┌─────────────────────────────────────────────────────────────┐
│ ⚗️ Aflatoxin Analysis                                      │
├─────────────────────────────────────────────────────────────┤
│ Sample: SMP-2026-00125                                     │
│ Product: Milk Powder                                       │
├─────────────────────────────────────────────────────────────┤
│ Test Method                                                │
│ ISO / Approved Method                                      │
│ Version: 2026                                              │
├─────────────────────────────────────────────────────────────┤
│ Equipment                                                  │
│ [ HPLC-001 ▼ ]                                             │
│ Status: ✓ Calibrated                                       │
├─────────────────────────────────────────────────────────────┤
│ Reagent / Standard                                         │
│ [ Aflatoxin Standard LOT-22 ▼ ]                            │
│ Expiry: 20/10/2026                                         │
├─────────────────────────────────────────────────────────────┤
│ Result                                                     │
│                                                             │
│ [_____________] µg/kg                                     │
│                                                             │
│ Detection Limit: 1.0 µg/kg                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Automatic Specification Lookup

The analyst **does not search for limits manually**.

The system links:

```text
Product
   ↓
Product Category
   ↓
Test
   ↓
Specification
   ↓
Applicable Limit
```

Example:

```text
┌─────────────────────────────────────┐
│ 🧬 Applicable Specification         │
├─────────────────────────────────────┤
│ Test: Aflatoxin                     │
│ Unit: µg/kg                         │
│ Limit: 10 µg/kg                     │
│ Version: 2026.1                     │
│ Status: ACTIVE                      │
└─────────────────────────────────────┘
```

---

## 8. Result Entry

The system supports multiple result types:

### Numeric

```text
Result: 7.5
Unit: mg/kg
```

### Qualitative

```text
Result:
○ Positive
● Negative
```

### Range

```text
Min: 6.5
Max: 7.0
```

### Multiple Parameters

```text
Parameter       Result       Unit
----------------------------------
Moisture        3.5          %
Fat             26.2         %
Protein         34.5         %
Ash             5.1          %
```

---

## 9. Automatic Evaluation

After result entry:

```text
Result
  ↓
Validation
  ↓
Specification
  ↓
Automatic Evaluation
```

Example:

```text
Aflatoxin

Result:
7.5 µg/kg

Maximum Limit:
10 µg/kg

──────────────────

✓ COMPLIANT
```

Or:

```text
Result:
15 µg/kg

Maximum Limit:
10 µg/kg

──────────────────

🔴 NON-COMPLIANT
```

**The analyst cannot manually change Non-Compliant to Compliant.**

---

## 10. QC During Analysis

Before result approval, the system may require:

```text
QC Required

Control Sample:
QC-2026-005

Result:
[________]

Expected Range:
9.5 – 10.5

Status:
○ Pass
○ Fail
```

If QC fails:

```text
🔴 QC FAILED

Result cannot be submitted.

Please contact Section Head.
```

---

## 11. Instrument Registration

The system records automatically:

```text
Equipment:
HPLC-001

Calibration:
Valid

Last Calibration:
01/08/2026

Next Calibration:
01/11/2026

Analyst:
Ahmed

Start:
10:15

End:
11:42
```

The analyst **does not need to enter this data manually**.

---

## 12. Reagent Registration

Each test records:

```text
Reagent
Lot Number
Expiry Date
Quantity Used
```

Example:

```text
Aflatoxin Standard

LOT:
AF-2026-22

Expiry:
20/10/2026

Used:
2 ml
```

This is critical for **Traceability**.

---

## 13. Attachments

The analyst can attach:

* Instrument photo.
* Chromatogram.
* Device file.
* Reading image.
* Work sheet.
* Technical notes.

```text
📎 Attach File
```

---

## 14. Result Submission

Upon completion:

```text
┌─────────────────────────────────────────┐
│ Result Summary                           │
├─────────────────────────────────────────┤
│ Sample: SMP-001                         │
│ Test: Aflatoxin                         │
│ Result: 7.5 µg/kg                      │
│ Limit: 10 µg/kg                        │
│ Decision: ✓ Compliant                  │
├─────────────────────────────────────────┤
│ Analyst Comment                         │
│ [.....................................] │
└─────────────────────────────────────────┘

[ 💾 Save Draft ]

[ 📤 Submit for Review ]
```

---

## 15. Result Workflow

```text
Draft
  │
  ▼
In Analysis
  │
  ▼
Result Entered
  │
  ▼
Self Validation
  │
  ▼
Submitted
  │
  ▼
Section Head Review
  │
  ├──── Reject ──► Analyst Revision
  │
  ▼
Section Approved
  │
  ▼
Laboratory Director
```

---

## 16. If Section Head Returns Result

The analyst sees:

```text
🔴 Result Returned

Sample:
SMP-2026-00125

Reason:
"Please verify dilution factor."
```

Then can modify **Draft/Unapproved Result** recording:

```text
Old Value
New Value
Changed By
Changed At
Reason
```

---

## 17. SLA

```text
⏱ Test SLA

Test:
Chemistry

Target:
1–2 Days

Started:
16/08/2026 10:15

Due:
17/08/2026 10:15

Remaining:
18h 42m

🟢 On Track
```

If due soon:

```text
🟡 Due Soon
```

If overdue:

```text
🔴 Overdue
```

---

## 18. Analyst QC Screen

```text
🧪 My QC Tasks

QC-001   HPLC      Pending
QC-002   Aflatoxin Passed
QC-003   Protein   Required
```

The analyst can execute allowed QC but **cannot delete or modify previous QC records**.

---

## 19. Notifications

```text
🔔 Notifications

🔴 Test SLA exceeded
⚠️ Reagent expires in 5 days
⚠️ QC required before submission
🔵 Result returned by Section Head
🟢 New sample assigned
🧰 HPLC calibration due soon
```

---

## 20. Permissions

| Operation                | Chemistry Analyst |
|--------------------------|-------------------:
| View My Samples          | ✅ |
| Start Analysis           | ✅ |
| Perform Test             | ✅ |
| Enter Result             | ✅ |
| Save Draft               | ✅ |
| Modify Unapproved Result | ✅ |
| Submit for Review        | ✅ |
| Execute QC               | Based on permission |
| View Specification       | ✅ |
| Modify Specification     | ❌ |
| Modify Test Price        | ❌ |
| Final Result Approval    | ❌ |
| Section Approval         | ❌ |
| Delete Sample            | ❌ |
| Delete Result            | ❌ |
| Modify Audit Trail       | ❌ |
| Manage Users             | ❌ |

---

## 21. Final Sidebar

```text
🏠 Dashboard

🧪 My Samples
   ├── New
   ├── In Analysis
   ├── For Review
   └── Returned

⚗️ Analyses
   ├── Chemistry Tests
   ├── My Work Queue
   └── Test History

🧪 QC
   ├── QC Tasks
   └── QC Results

🧰 Instruments
   └── Available Instruments

🧪 Reagents
   └── Reagents

🧬 Specifications
   └── Applicable Specifications

⏱ SLA

📋 Results

🔔 Notifications
```

---

## 22. The Core Principle of the Chemistry Analyst Interface

The interface must make the analyst **perform the test, not make the final administrative decision**:

```text
                 Sample
                    │
                    ▼
             Chemistry Analyst
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
      Test Method           Equipment
          │                   │
          └─────────┬─────────┘
                    ▼
               Test Result
                    │
                    ▼
          Automatic Evaluation
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
       Compliant          Non-Compliant
          │                   │
          └─────────┬─────────┘
                    ▼
             Submit for Review
                    │
                    ▼
          Chemistry Section Head
                    │
                    ▼
          Laboratory Director
```

This makes the **Chemistry Analyst** a clear part of the **Chain of Custody + Analytical Workflow + Quality Control**, while keeping specifications, limits, and automated evaluation separate from the analyst's authority — the most suitable design for a government laboratory system that is auditable and scalable.