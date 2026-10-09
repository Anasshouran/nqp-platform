/**
 * M3-0 (G1/G2) — مطابقة قيم constants وسجل الحالة بعد المزامنة:
 * - QR_VERIFICATION_STATUS لم يعد BLOCKED/NG-04.
 * - السجل يُطابق الحالة المؤكدة (server-authoritative fail-closed).
 */
import * as fs from 'fs';
import * as path from 'path';
import { QR_VERIFICATION_STATUS } from '../src/security/qr';
import { SECURITY_CONTROLS, controlStatus } from '../src/security/status';

const SRC_DIR = path.resolve(__dirname, '../src');

function collectSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const sourceFiles = collectSourceFiles(SRC_DIR);

describe('QR verification status (M3-0 G1)', () => {
  it('is server-authoritative fail-closed', () => {
    expect(QR_VERIFICATION_STATUS).toBe('SERVER_AUTHORITATIVE_FAIL_CLOSED');
  });

  it('ledger no longer labels QR verification BLOCKED', () => {
    expect(controlStatus('qr-signature-verification')).not.toBe('BLOCKED');
    expect(controlStatus('qr-signature-verification')).toBe('IMPLEMENTED');
  });

  it('QR_VERIFICATION_STATUS has no callers that depend on BLOCKED', () => {
    const sources = sourceFiles.map((file) => fs.readFileSync(file, 'utf8'));
    const staleQrConstant = sources.some((text) =>
      text.includes("QR_VERIFICATION_STATUS = 'BLOCKED'"),
    );
    expect(staleQrConstant).toBe(false);
  });
});

describe('security ledger synced to M3-0 CONFIRMED state (G2)', () => {
  it('matches the required A2 statuses', () => {
    expect(controlStatus('log-scrubbing')).toBe('IMPLEMENTED');
    expect(controlStatus('token-storage')).toBe('IMPLEMENTED');
    expect(controlStatus('encrypted-sensitive-store')).toBe('SCAFFOLDED');
    expect(controlStatus('biometric-app-lock')).toBe('SCAFFOLDED');
    expect(controlStatus('certificate-pinning')).toBe('SCAFFOLDED');
    expect(controlStatus('device-risk-signals')).toBe('NOT STARTED');
  });

  it('is free of stale NG-04 references under mobile/src', () => {
    for (const file of sourceFiles) {
      expect(fs.readFileSync(file, 'utf8').includes('NG-04')).toBe(false);
    }
  });

  it('SECURITY_CONTROLS entries have valid statuses and unique ids', () => {
    const statuses = new Set(['IMPLEMENTED', 'SCAFFOLDED', 'BLOCKED', 'NOT STARTED']);
    const ids = new Set<string>();
    for (const control of SECURITY_CONTROLS) {
      expect(statuses.has(control.status)).toBe(true);
      expect(ids.has(control.id)).toBe(false);
      ids.add(control.id);
    }
  });
});