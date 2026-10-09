/**
 * عميل API للجوال — يفهم الغلاف المعتمد §11 ويرفض أي شكل آخر.
 *
 * M1: أساس فقط. لا يُنفَّذ أي سلوك أعمال؛ الاستدعاءات الفعلية مؤجَّلة.
 * الأخطاء ثنائية اللغة من غلاف الخادم، ولا تُعرض تفاصيل داخلية أبداً.
 */
import { errorEnvelope, successEnvelope, type ErrorMessage } from '@afyatna/contracts';
import type { z } from 'zod';

export class ApiContractError extends Error {
  constructor(
    readonly httpStatus: number,
    readonly message_: ErrorMessage,
  ) {
    super(`${message_.code}: ${message_.ar}`);
    this.name = 'ApiContractError';
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  getAccessToken?: () => string | null;
}

const DEFAULT_TIMEOUT_MS = 15_000; // مُعايَرة لشبكات 2G لاحقاً (phase-13 p95)

export class MobileApiClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly getAccessToken?: () => string | null;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.getAccessToken = options.getAccessToken;
  }

  async request<T>(
    method: 'GET' | 'POST' | 'PATCH',
    path: string,
    options: { body?: unknown; schema: z.ZodType<T>; authenticated?: boolean; idempotencyKey?: string } ,
  ): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (options.authenticated !== false) {
      const token = this.getAccessToken?.() ?? null;
      if (!token) {
        throw new ApiContractError(401, {
          code: 'AUTH_REQUIRED',
          ar: 'يجب تسجيل الدخول',
          en: 'Authentication required',
        });
      }
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
    } catch {
      throw new ApiContractError(0, {
        code: 'SERVER_ERROR',
        ar: 'حدث خطأ مؤقت — يرجى المحاولة لاحقاً',
        en: 'A temporary error occurred — please try again later',
      });
    } finally {
      clearTimeout(timer);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new ApiContractError(response.status, {
        code: 'SERVER_ERROR',
        ar: 'حدث خطأ مؤقت — يرجى المحاولة لاحقاً',
        en: 'A temporary error occurred — please try again later',
      });
    }

    const parsedError = errorEnvelope().safeParse(payload);
    if (parsedError.success) {
      throw new ApiContractError(response.status, parsedError.data.message);
    }

    // الغلاف يتكوّن وقت العرض في الخادم (EnvelopeRenderer) — نتحقق منه هنا.
    const result = successEnvelope(options.schema).safeParse(payload);
    if (!result.success) {
      throw new ApiContractError(response.status, {
        code: 'SERVER_ERROR',
        ar: 'استجابة غير متوقعة من الخادم',
        en: 'Unexpected server response',
      });
    }
    return result.data.data as T;
  }
}
