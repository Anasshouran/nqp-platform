/**
 * laboratory.ts — API layer tests.
 *
 * Captures the outgoing request (method / url / params / body) via a custom
 * axios adapter installed on the shared client — no new dependencies. Mirrors
 * the approach in `src/api/__tests__/client.test.ts`.
 *
 * Every exported endpoint function is exercised at least once, so the whole
 * lab API surface (which had zero frontend tests) is pinned down.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import apiClient from '../../client';
import * as lab from '../laboratory';

interface Captured {
  method?: string;
  url?: string;
  params?: unknown;
  data?: unknown;
}

interface Case {
  title: string;
  run: () => Promise<unknown>;
  method: 'get' | 'post' | 'patch';
  url: string;
  params?: unknown;
  body?: unknown;
}

let last: Captured;
const originalAdapter = apiClient.defaults.adapter;

beforeEach(() => {
  last = {};
  localStorage.clear();
  apiClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    last = {
      method: config.method,
      url: config.url,
      params: config.params,
      data: typeof config.data === 'string' ? JSON.parse(config.data) : config.data,
    };
    return {
      data: { status: 'success', data: {} },
      status: 200,
      statusText: 'OK',
      headers: new AxiosHeaders(),
      config,
    };
  };
});

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
  localStorage.clear();
});

const cases: Case[] = [
  // ── samples ───────────────────────────────────────────────────────────────
  {
    title: 'getLabSamples GETs /laboratory/samples/ with params',
    run: () => lab.getLabSamples({ page: 2, page_size: 20, status: 'received' }),
    method: 'get',
    url: '/laboratory/samples/',
    params: { page: 2, page_size: 20, status: 'received' },
  },
  {
    title: 'getLabSample GETs /laboratory/samples/{id}/',
    run: () => lab.getLabSample('s1'),
    method: 'get',
    url: '/laboratory/samples/s1/',
  },
  {
    title: 'createLabSample POSTs the payload',
    run: () => lab.createLabSample({ sample_type: 'SWAB' }),
    method: 'post',
    url: '/laboratory/samples/',
    body: { sample_type: 'SWAB' },
  },
  {
    title: 'updateLabSample PATCHes /laboratory/samples/{id}/',
    run: () => lab.updateLabSample('s1', { priority: 'HIGH' }),
    method: 'patch',
    url: '/laboratory/samples/s1/',
    body: { priority: 'HIGH' },
  },
  {
    title: 'acceptSample POSTs /laboratory/samples/{id}/accept/',
    run: () => lab.acceptSample('s1', { reception_note: 'ok' }),
    method: 'post',
    url: '/laboratory/samples/s1/accept/',
    body: { reception_note: 'ok' },
  },
  {
    title: 'conditionalAcceptSample POSTs /conditional-accept/',
    run: () => lab.conditionalAcceptSample('s1', { reception_note: 'partial' }),
    method: 'post',
    url: '/laboratory/samples/s1/conditional-accept/',
    body: { reception_note: 'partial' },
  },
  {
    title: 'rejectSample POSTs /reject/ with the reception payload',
    run: () => lab.rejectSample('s1', { rejection_reason: 'damaged' }),
    method: 'post',
    url: '/laboratory/samples/s1/reject/',
    body: { rejection_reason: 'damaged' },
  },
  {
    title: 'assignSample POSTs /assign/ with { section }',
    run: () => lab.assignSample('s1', 'sec-1'),
    method: 'post',
    url: '/laboratory/samples/s1/assign/',
    body: { section: 'sec-1' },
  },
  {
    title: 'addSampleTest POSTs /add-test/',
    run: () => lab.addSampleTest('s1', { test_name: 'CBC' }),
    method: 'post',
    url: '/laboratory/samples/s1/add-test/',
    body: { test_name: 'CBC' },
  },
  {
    title: 'getReceptionQueue GETs /laboratory/samples/reception/',
    run: () => lab.getReceptionQueue({ page: 1 }),
    method: 'get',
    url: '/laboratory/samples/reception/',
    params: { page: 1 },
  },
  {
    title: 'getSampleTrack GETs /laboratory/samples/{id}/track/',
    run: () => lab.getSampleTrack('s1'),
    method: 'get',
    url: '/laboratory/samples/s1/track/',
  },
  {
    title: 'getSampleQr GETs /laboratory/samples/{id}/qr/',
    run: () => lab.getSampleQr('s1'),
    method: 'get',
    url: '/laboratory/samples/s1/qr/',
  },
  {
    title: 'getLabDashboard GETs /laboratory/samples/dashboard/ with sector',
    run: () => lab.getLabDashboard('SEC-1'),
    method: 'get',
    url: '/laboratory/samples/dashboard/',
    params: { sector: 'SEC-1' },
  },
  {
    title: 'getLabDashboard omits params when no sector given',
    run: () => lab.getLabDashboard(),
    method: 'get',
    url: '/laboratory/samples/dashboard/',
  },
  {
    title: 'getNationalLabDashboard GETs /laboratory/samples/national-dashboard/',
    run: () => lab.getNationalLabDashboard(),
    method: 'get',
    url: '/laboratory/samples/national-dashboard/',
  },
  {
    title: 'getLabReports GETs /laboratory/samples/reports/',
    run: () => lab.getLabReports({}),
    method: 'get',
    url: '/laboratory/samples/reports/',
    params: {},
  },

  // ── sample tests / worklist ───────────────────────────────────────────────
  {
    title: 'getSampleTests GETs /laboratory/sample-tests/',
    run: () => lab.getSampleTests({ page: 1 }),
    method: 'get',
    url: '/laboratory/sample-tests/',
    params: { page: 1 },
  },
  {
    title: 'getSampleTest GETs /laboratory/sample-tests/{id}/',
    run: () => lab.getSampleTest('t1'),
    method: 'get',
    url: '/laboratory/sample-tests/t1/',
  },
  {
    title: 'getWorklist GETs /laboratory/sample-tests/worklist/',
    run: () => lab.getWorklist({ page: 1 }),
    method: 'get',
    url: '/laboratory/sample-tests/worklist/',
    params: { page: 1 },
  },
  {
    title: 'startTest POSTs /start/',
    run: () => lab.startTest('t1'),
    method: 'post',
    url: '/laboratory/sample-tests/t1/start/',
  },
  {
    title: 'saveTestResult PATCHes /save-result/',
    run: () => lab.saveTestResult('t1', { outcome: 'NEGATIVE' }),
    method: 'patch',
    url: '/laboratory/sample-tests/t1/save-result/',
    body: { outcome: 'NEGATIVE' },
  },
  {
    title: 'enterTestResult POSTs /enter-result/',
    run: () => lab.enterTestResult('t1'),
    method: 'post',
    url: '/laboratory/sample-tests/t1/enter-result/',
  },
  {
    title: 'reviewTest POSTs /review/',
    run: () => lab.reviewTest('t1'),
    method: 'post',
    url: '/laboratory/sample-tests/t1/review/',
  },
  {
    title: 'approveTest POSTs /approve/',
    run: () => lab.approveTest('t1'),
    method: 'post',
    url: '/laboratory/sample-tests/t1/approve/',
  },
  {
    title: 'returnTestResult POSTs /return-result/ with { reason }',
    run: () => lab.returnTestResult('t1', 'inconclusive'),
    method: 'post',
    url: '/laboratory/sample-tests/t1/return-result/',
    body: { reason: 'inconclusive' },
  },
  {
    title: 'reviseTest POSTs /revise/',
    run: () => lab.reviseTest('t1'),
    method: 'post',
    url: '/laboratory/sample-tests/t1/revise/',
  },
  {
    title: 'acknowledgeTest POSTs /acknowledge/ with default empty note',
    run: () => lab.acknowledgeTest('t1'),
    method: 'post',
    url: '/laboratory/sample-tests/t1/acknowledge/',
    body: { note: '' },
  },
  {
    title: 'acknowledgeTest POSTs /acknowledge/ with a note',
    run: () => lab.acknowledgeTest('t1', 'handled'),
    method: 'post',
    url: '/laboratory/sample-tests/t1/acknowledge/',
    body: { note: 'handled' },
  },

  // ── sections / catalog / equipment ────────────────────────────────────────
  {
    title: 'getSections GETs /laboratory/sections/',
    run: () => lab.getSections({ is_active: true }),
    method: 'get',
    url: '/laboratory/sections/',
    params: { is_active: true },
  },
  {
    title: 'createSection POSTs /laboratory/sections/',
    run: () => lab.createSection({ name_ar: 'قسم' } as never),
    method: 'post',
    url: '/laboratory/sections/',
    body: { name_ar: 'قسم' },
  },
  {
    title: 'getTestCatalog GETs /laboratory/test-catalog/',
    run: () => lab.getTestCatalog({}),
    method: 'get',
    url: '/laboratory/test-catalog/',
    params: {},
  },
  {
    title: 'getEquipment GETs /laboratory/equipment/',
    run: () => lab.getEquipment({}),
    method: 'get',
    url: '/laboratory/equipment/',
    params: {},
  },
  {
    title: 'createEquipment POSTs /laboratory/equipment/',
    run: () => lab.createEquipment({ name: 'معدة' } as never),
    method: 'post',
    url: '/laboratory/equipment/',
    body: { name: 'معدة' },
  },
  {
    title: 'updateEquipment PATCHes /laboratory/equipment/{id}/',
    run: () => lab.updateEquipment('e1', { name: 'معدة 2' } as never),
    method: 'patch',
    url: '/laboratory/equipment/e1/',
    body: { name: 'معدة 2' },
  },

  // ── reagents / materials / storage ────────────────────────────────────────
  {
    title: 'getReagents GETs /laboratory/reagents/',
    run: () => lab.getReagents({ search: 'x' }),
    method: 'get',
    url: '/laboratory/reagents/',
    params: { search: 'x' },
  },
  {
    title: 'createReagent POSTs /laboratory/reagents/',
    run: () => lab.createReagent({ name: 'مادة' } as never),
    method: 'post',
    url: '/laboratory/reagents/',
    body: { name: 'مادة' },
  },
  {
    title: 'getReagentLots GETs /laboratory/reagent-lots/',
    run: () => lab.getReagentLots({}),
    method: 'get',
    url: '/laboratory/reagent-lots/',
    params: {},
  },
  {
    title: 'createReagentLot POSTs /laboratory/reagent-lots/',
    run: () => lab.createReagentLot({ lot_number: 'L1' } as never),
    method: 'post',
    url: '/laboratory/reagent-lots/',
    body: { lot_number: 'L1' },
  },
  {
    title: 'getMaterialIssues GETs /laboratory/material-issues/',
    run: () => lab.getMaterialIssues({}),
    method: 'get',
    url: '/laboratory/material-issues/',
    params: {},
  },
  {
    title: 'createMaterialIssue POSTs /laboratory/material-issues/',
    run: () => lab.createMaterialIssue({ quantity: 1 } as never),
    method: 'post',
    url: '/laboratory/material-issues/',
    body: { quantity: 1 },
  },
  {
    title: 'getStorageLocations GETs /laboratory/storage-locations/',
    run: () => lab.getStorageLocations({}),
    method: 'get',
    url: '/laboratory/storage-locations/',
    params: {},
  },

  // ── QC / quality / critical ───────────────────────────────────────────────
  {
    title: 'getQcRecords GETs /laboratory/qc/',
    run: () => lab.getQcRecords({}),
    method: 'get',
    url: '/laboratory/qc/',
    params: {},
  },
  {
    title: 'createQcRecord POSTs /laboratory/qc/',
    run: () => lab.createQcRecord({ result: 'PASS' } as never),
    method: 'post',
    url: '/laboratory/qc/',
    body: { result: 'PASS' },
  },
  {
    title: 'reviewQcRecord POSTs /laboratory/qc/{id}/review/',
    run: () => lab.reviewQcRecord('q1', { status: 'REVIEWED' }),
    method: 'post',
    url: '/laboratory/qc/q1/review/',
    body: { status: 'REVIEWED' },
  },
  {
    title: 'getNonConformities GETs /laboratory/non-conformities/',
    run: () => lab.getNonConformities({}),
    method: 'get',
    url: '/laboratory/non-conformities/',
    params: {},
  },
  {
    title: 'createNonConformity POSTs /laboratory/non-conformities/',
    run: () => lab.createNonConformity({ title: 'عدم مطابقة' } as never),
    method: 'post',
    url: '/laboratory/non-conformities/',
    body: { title: 'عدم مطابقة' },
  },
  {
    title: 'setNonConformityStatus POSTs /set-status/ with { status }',
    run: () => lab.setNonConformityStatus('n1', 'CLOSED'),
    method: 'post',
    url: '/laboratory/non-conformities/n1/set-status/',
    body: { status: 'CLOSED' },
  },
  {
    title: 'getCapaRecords GETs /laboratory/capa/',
    run: () => lab.getCapaRecords({}),
    method: 'get',
    url: '/laboratory/capa/',
    params: {},
  },
  {
    title: 'createCapaRecord POSTs /laboratory/capa/',
    run: () => lab.createCapaRecord({ action: 'إجراء' } as never),
    method: 'post',
    url: '/laboratory/capa/',
    body: { action: 'إجراء' },
  },
  {
    title: 'setCapaStatus POSTs /capa/{id}/set-status/ with { status }',
    run: () => lab.setCapaStatus('c1', 'DONE'),
    method: 'post',
    url: '/laboratory/capa/c1/set-status/',
    body: { status: 'DONE' },
  },
  {
    title: 'getCriticalResults GETs /laboratory/critical/',
    run: () => lab.getCriticalResults({}),
    method: 'get',
    url: '/laboratory/critical/',
    params: {},
  },
  {
    title: 'acknowledgeCritical POSTs /critical/{id}/acknowledge/ with { note }',
    run: () => lab.acknowledgeCritical('c1', 'noted'),
    method: 'post',
    url: '/laboratory/critical/c1/acknowledge/',
    body: { note: 'noted' },
  },

  // ── movements / diseases / users ──────────────────────────────────────────
  {
    title: 'getSampleMovements GETs /laboratory/sample-movements/',
    run: () => lab.getSampleMovements({}),
    method: 'get',
    url: '/laboratory/sample-movements/',
    params: {},
  },
  {
    title: 'getDiseases GETs /laboratory/diseases/',
    run: () => lab.getDiseases({}),
    method: 'get',
    url: '/laboratory/diseases/',
    params: {},
  },
  {
    title: 'getLabUsers GETs /laboratory/users/',
    run: () => lab.getLabUsers({}),
    method: 'get',
    url: '/laboratory/users/',
    params: {},
  },
  {
    title: 'createLabUser POSTs /laboratory/users/',
    run: () => lab.createLabUser({ email: 'a@b.c' }),
    method: 'post',
    url: '/laboratory/users/',
    body: { email: 'a@b.c' },
  },
  {
    title: 'updateLabUser PATCHes /laboratory/users/{id}/',
    run: () => lab.updateLabUser('u1', { is_active: false }),
    method: 'patch',
    url: '/laboratory/users/u1/',
    body: { is_active: false },
  },
  {
    title: 'resetLabUserPassword POSTs /users/{id}/reset-password/ with { password }',
    run: () => lab.resetLabUserPassword('u1', 'pw123456'),
    method: 'post',
    url: '/laboratory/users/u1/reset-password/',
    body: { password: 'pw123456' },
  },
  {
    title: 'getLabRoles GETs /laboratory/users/lab-roles/',
    run: () => lab.getLabRoles(),
    method: 'get',
    url: '/laboratory/users/lab-roles/',
  },
];

describe('laboratory API — request shapes', () => {
  for (const testCase of cases) {
    it(testCase.title, async () => {
      await testCase.run();

      expect(last.method).toBe(testCase.method);
      expect(last.url).toBe(testCase.url);
      expect(last.params).toEqual(testCase.params);
      expect(last.data).toEqual(testCase.body);
    });
  }
});

describe('laboratory API — surface', () => {
  it('exposes every documented endpoint function', () => {
    const expected = [
      'getLabSamples', 'getLabSample', 'createLabSample', 'updateLabSample',
      'acceptSample', 'conditionalAcceptSample', 'rejectSample', 'assignSample',
      'addSampleTest', 'getReceptionQueue', 'getSampleTrack', 'getSampleQr',
      'getLabDashboard', 'getNationalLabDashboard', 'getLabReports',
      'getSampleTests', 'getSampleTest', 'getWorklist', 'startTest',
      'saveTestResult', 'enterTestResult', 'reviewTest', 'approveTest',
      'returnTestResult', 'reviseTest', 'acknowledgeTest', 'getSections',
      'createSection', 'getTestCatalog', 'getEquipment', 'createEquipment',
      'updateEquipment', 'getReagents', 'createReagent', 'getReagentLots',
      'createReagentLot', 'getMaterialIssues', 'createMaterialIssue',
      'getStorageLocations', 'getQcRecords', 'createQcRecord', 'reviewQcRecord',
      'getNonConformities', 'createNonConformity', 'setNonConformityStatus',
      'getCapaRecords', 'createCapaRecord', 'setCapaStatus', 'getCriticalResults',
      'acknowledgeCritical', 'getSampleMovements', 'getDiseases', 'getLabUsers',
      'createLabUser', 'updateLabUser', 'resetLabUserPassword', 'getLabRoles',
    ];

    for (const name of expected) {
      expect(typeof (lab as Record<string, unknown>)[name]).toBe('function');
    }
    expect(expected).toHaveLength(57);
  });
});
