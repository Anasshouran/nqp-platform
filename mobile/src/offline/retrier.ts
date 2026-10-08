/**
 * إعادة محاولة محدودة وتحديدية (§7) — للقراءات الآمنة (GET) فقط.
 * لا يعاد إرسال كتابات/مصادقة/عمليات حساسة. إلغاء فوري عبر isCancelled.
 */
export interface RetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  shouldRetryOn?: (error: unknown) => boolean;
  isCancelled?: () => boolean;
}

export class BoundedRetrier {
  constructor(private readonly policy: RetryPolicy) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    let attempt = 0;
    for (;;) {
      attempt += 1;
      if (this.policy.isCancelled?.()) {
        throw new Error('RETRY_CANCELLED');
      }
      try {
        return await fn();
      } catch (error) {
        if (this.policy.isCancelled?.()) {
          throw new Error('RETRY_CANCELLED', { cause: error });
        }
        const shouldRetry =
          this.policy.shouldRetryOn?.(error) ?? isTransientNetwork(error);
        if (!shouldRetry || attempt >= this.policy.maxAttempts || this.policy.isCancelled?.()) {
          throw error;
        }
        await delay(this.policy.baseDelayMs * 2 ** (attempt - 1));
      }
    }
  }
}

export function isTransientNetwork(error: unknown): boolean {
  return (
    error != null &&
    typeof error === 'object' &&
    'httpStatus' in error &&
    (error as { httpStatus?: number }).httpStatus === 0
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}