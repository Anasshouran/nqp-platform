"""توليد/تحديث لقطة عقد ``/api/v1/mobile/`` (بعد تغيير مُصرَّح به فقط).

Usage:
    cd backend && python -m apps.mobile_api.tests.generate_snapshot
"""

from __future__ import annotations

import json
import os
from pathlib import Path

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nqp_backend.settings')

import django  # noqa: E402

django.setup()

from .test_contract_snapshot import (  # noqa: E402
    SNAPSHOT_PATH,
    _get_schema,
    extract_mobile_subset,
)


def main() -> None:
    subset = extract_mobile_subset(_get_schema())
    SNAPSHOT_PATH.parent.mkdir(parents=True, exist_ok=True)
    SNAPSHOT_PATH.write_text(
        json.dumps(subset, indent=2, ensure_ascii=False, sort_keys=True) + '\n',
        encoding='utf-8',
    )
    print(f'wrote {SNAPSHOT_PATH} ({len(subset.get("paths", {}))} paths, '
          f'{len(subset.get("components", {}))} components)')


if __name__ == '__main__':
    main()
