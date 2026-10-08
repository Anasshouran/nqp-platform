/**
 * M1.8 — قفل التطبيق بالبصمة (واجهة فقط — SCAFFOLDED).
 * لا تكامل native في M1؛ لا يُدّعى أن التحكم منفَّذ.
 */

export interface BiometricLock {
  isAvailable(): Promise<boolean>;
  /** يُرجع true فقط إذا نجح التحقق الحيّ; لا يُنشئ هوية جديدة أبداً. */
  unlock(reasonAr: string): Promise<boolean>;
}

export class UnavailableBiometricLock implements BiometricLock {
  async isAvailable(): Promise<boolean> {
    return false;
  }

  async unlock(): Promise<boolean> {
    return false;
  }
}
