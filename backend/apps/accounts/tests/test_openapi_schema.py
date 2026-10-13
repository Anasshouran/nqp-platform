"""Regression tests for `GET /api/schema/` (HTTP 500 — API schema).

Root cause (see docs/audit/API-SCHEMA-500-ROOT-CAUSE-AND-REMEDIATION.md):
the default OpenAPI renderer is YAML, whose serialization of this large
schema takes ~60s+ on the dev VPS — longer than Gunicorn's default worker
timeout of 30s. Gunicorn aborts the worker mid-render and the request fails
with HTTP 500, while `/api/docs/` (a static Swagger UI page) stays at 200.

The fix raises the Gunicorn worker timeout for the dev backend via
`deploy/docker-compose.dev-vps.yml`. These tests guard:

* the endpoint contract (valid, non-empty OpenAPI JSON document), and
* the deployment configuration that makes the slow YAML render feasible.
"""

from __future__ import annotations

from pathlib import Path

import yaml
from django.test import Client

REPO_ROOT = Path(__file__).resolve().parents[4]
DEV_VPS_COMPOSE = REPO_ROOT / 'deploy' / 'docker-compose.dev-vps.yml'

# Gunicorn default worker timeout is 30s; the full-schema YAML render on the
# dev VPS was measured at ~60-65s. Keep a wide margin so schema generation
# never gets aborted mid-render again.
MIN_GUNICORN_TIMEOUT_SECONDS = 180


def test_schema_endpoint_returns_valid_openapi_document():
    res = Client().get('/api/schema/', {'format': 'json'})
    assert res.status_code == 200
    doc = res.json()
    assert doc['openapi'].startswith('3.0')
    assert doc['info']['title'] == 'NQP API'
    assert doc['paths']
    assert doc['components']['schemas']
    login = doc['paths'].get('/api/v1/auth/login/')
    assert login is not None
    assert login['post']['operationId']


def test_dev_vps_gunicorn_command_sets_schema_safe_timeout():
    compose = yaml.safe_load(DEV_VPS_COMPOSE.read_text())
    command = compose['services']['backend']['command']
    args = command.split()
    assert '--timeout' in args, 'gunicorn --timeout missing in dev-vps backend command'
    timeout = int(args[args.index('--timeout') + 1])
    assert timeout >= MIN_GUNICORN_TIMEOUT_SECONDS