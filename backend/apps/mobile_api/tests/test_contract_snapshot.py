"""M1.5 — تجزئة العقد: أي تغيير كاسر يُسقِط CI.

القاعدة (عقد المرحلة الأولى §8): *a breaking API contract must fail CI*.

الآلية: لقطة معتمدة للجزء الخاص بـ ``/api/v1/mobile/`` من مخطط OpenAPI
تُثبَّت في المستودع. هذا الاختبار يولّد المخطط وقت التشغيل ويقارنه باللقطة:

* حذف مسار / method / رمز استجابة / مكوّن / حقل قديم  → كاسر (فشل)
* إضافة حقول أو مسارات أو رموز                      → مُتاح (لا يفشل)
* إضافة حقل إلى ``required`` في مكوّن قديم            → كاسر (فشل)

توليد/تحديث اللقطة بعد تغيير مقصود ومعتمد:

    cd backend && python -m apps.mobile_api.tests.generate_snapshot
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from drf_spectacular.generators import SchemaGenerator

SNAPSHOT_PATH = Path(__file__).parent / 'snapshots' / 'mobile_v1.json'
MOBILE_PREFIX = '/api/v1/mobile/'


def _get_schema() -> dict:
    return SchemaGenerator().get_schema(request=None, public=True) or {}


def extract_mobile_subset(schema: dict) -> dict:
    """يقصّ جزء مساحة الجوال من المخطط: المسارات + المكوّنات المرجعية منها."""
    components = (schema.get('components') or {}).get('schemas') or {}
    mobile_paths = {
        path: ops
        for path, ops in (schema.get('paths') or {}).items()
        if path.startswith(MOBILE_PREFIX)
    }
    used: set[str] = set()

    def _collect_refs(node):
        if isinstance(node, dict):
            ref = node.get('$ref')
            if isinstance(ref, str) and ref.startswith('#/components/schemas/'):
                name = ref.rsplit('/', 1)[-1]
                if name not in used:
                    used.add(name)
                    if name in components:
                        _collect_refs(components[name])
            for value in node.values():
                _collect_refs(value)
        elif isinstance(node, list):
            for item in node:
                _collect_refs(item)

    _collect_refs(mobile_paths)
    return {
        'paths': mobile_paths,
        'components': {name: components[name] for name in sorted(used) if name in components},
    }


def _iter_required_property_paths(spec: dict, prefix: str = '') -> set[str]:
    """يجمع مسارات الحقول المطلوبة (required) داخل مخطط — للتتبع العميق."""
    found: set[str] = set()
    if not isinstance(spec, dict):
        return found
    required = spec.get('required') or []
    props = spec.get('properties') or {}
    for name in required:
        found.add(f'{prefix}{name}')
    for name, child in props.items():
        found |= _iter_required_property_paths(child, prefix=f'{prefix}{name}.')
        if child.get('type') == 'array':
            found |= _iter_required_property_paths(child.get('items') or {}, prefix=f'{prefix}{name}[].')
    for child in (spec.get('allOf') or []):
        found |= _iter_required_property_paths(child, prefix=prefix)
    return found


def _property_paths(spec: dict, prefix: str = '') -> set[str]:
    """كل مسارات الحقول (بالترتيب الشجري) في مخطط مكوّن."""
    paths: set[str] = set()
    if not isinstance(spec, dict):
        return paths
    for name in (spec.get('properties') or {}):
        paths.add(f'{prefix}{name}')
        child = spec['properties'][name]
        paths |= _property_paths(child, prefix=f'{prefix}{name}.')
        if child.get('type') == 'array':
            paths |= _property_paths(child.get('items') or {}, prefix=f'{prefix}{name}[].')
    for child in (spec.get('allOf') or []):
        paths |= _property_paths(child, prefix=prefix)
    return paths


def find_breaking_changes(old: dict, new: dict) -> list[str]:
    problems: list[str] = []

    for path, old_ops in old.get('paths', {}).items():
        if path not in new.get('paths', {}):
            problems.append(f'حذف مسار: {path}')
            continue
        new_ops = new['paths'][path]
        for method, old_op in old_ops.items():
            if method not in new_ops:
                problems.append(f'حذف method: {method.upper()} {path}')
                continue
            new_op = new_ops[method]
            for code in (old_op.get('responses') or {}):
                if code not in (new_op.get('responses') or {}):
                    problems.append(f'حذف رمز استجابة {code} من {method.upper()} {path}')

    for name, old_spec in old.get('components', {}).items():
        if name not in new.get('components', {}):
            problems.append(f'حذف مكوّن: {name}')
            continue
        new_spec = new['components'][name]
        old_paths = _property_paths(old_spec)
        new_paths = _property_paths(new_spec)
        for gone in sorted(old_paths - new_paths):
            problems.append(f'حذف حقل كاسر: {name}.{gone}')
        old_required = _iter_required_property_paths(old_spec)
        new_required = _iter_required_property_paths(new_spec)
        for now_required in sorted(new_required - old_required):
            problems.append(f'إضافة required كاسرة: {name}.{now_required}')

    return problems


def test_mobile_contract_snapshot_exists():
    assert SNAPSHOT_PATH.exists(), (
        'لقطة عقد الجوال مفقودة — ولِّدها بـ: '
        'cd backend && python -m apps.mobile_api.tests.generate_snapshot'
    )


def test_no_breaking_contract_change_versus_snapshot():
    old = json.loads(SNAPSHOT_PATH.read_text(encoding='utf-8'))
    new = extract_mobile_subset(_get_schema())
    problems = find_breaking_changes(old, new)
    assert not problems, (
        'تغيير كاسر في عقد /api/v1/mobile/ (يتطلب قراراً معتمداً + تحديث اللقطة '
        f'وعقد الإصدار):\n' + '\n'.join(f' - {p}' for p in problems)
    )


def test_contract_snapshot_matches_current_mobile_schema_field_set():
    """لا حذوف حقول بين اللقطة والحالي — حارس إضافي برسالة أوضح."""
    old = json.loads(SNAPSHOT_PATH.read_text(encoding='utf-8'))
    new = extract_mobile_subset(_get_schema())
    for name, spec in old.get('components', {}).items():
        if name not in new.get('components', {}):
            continue
        missing = _property_paths(spec) - _property_paths(new['components'][name])
        assert not missing, f'{name}: حقول مفقودة عن اللقطة: {sorted(missing)}'
