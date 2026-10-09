/**
 * إعداد الجوال — قاعدة URL قابلة للتجاوز (اختبار/تطوير/إنتاج).
 *
 * G3 (M3-0): في الإصدار لا يُرحَّب بأي رابط غير https/مطلق/آمن —
 * الخادم المعتمد nqp.gov.sd. لا تُطبع قيمة الرابط في أي خطأ: الاسم والسبب فقط.
 */
import { Platform } from 'react-native';

const DEFAULT_HOST = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

const PLACEHOLDER = '__SET_VIA_CLI_OR_DASHBOARD__';
const LOCALHOST_TOKENS = ['localhost', '10.0.2.2', '127.0.0.1'] as const;
const ABSOLUTE_HTTPS = /^https:\/\/[^\s/]+/;

/** أسباب رفض رابط API في بناء الإصدار (لا تُطبع القيمة نفسها أبداً). */
export type ApiUrlRejection =
  | 'MISSING'
  | 'PLACEHOLDER'
  | 'INSECURE_HTTP'
  | 'LOCALHOST'
  | 'INVALID_URL';

function isLocalUri(value: string): boolean {
  const lower = value.toLowerCase();
  return LOCALHOST_TOKENS.some((token) => lower.includes(token));
}

function isAbsoluteHttpsUrl(value: string): boolean {
  return ABSOLUTE_HTTPS.test(value);
}

/**
 * يُعيد الرابط المُدقَّق، أو يرمي خطأً يُسمّي المتغير والسبب دون قيمته.
 *
 * - dev: يسمح بروابط http/محلية ويحذّر فقط؛ غياب القيمة => DEFAULT_HOST.
 * - release: يرفض أي قيمة غائبة/مشبوهة/غير آمنة/غير مطلقة، ويُفرِغ DEFAULT_HOST.
 */
export function resolveApiUrl(explicit?: string | null, isDev: boolean = __DEV__): string {
  const value = typeof explicit === 'string' ? explicit.trim() : '';

  if (isDev) {
    if (!value) {
      return `${DEFAULT_HOST}/api/v1`;
    }
    if (isLocalUri(value) || value.startsWith('http://')) {
      console.warn('[config] EXPO_PUBLIC_API_URL هو عنوان تطوير محلي/غير آمن — وهو مقبول في dev فقط');
    }
    return value;
  }

  const reasons: ApiUrlRejection[] = [];
  if (!value) {
    reasons.push('MISSING');
  }
  if (value === PLACEHOLDER) {
    reasons.push('PLACEHOLDER');
  }
  if (value.startsWith('http://')) {
    reasons.push('INSECURE_HTTP');
  }
  if (isLocalUri(value)) {
    reasons.push('LOCALHOST');
  }
  if (!isAbsoluteHttpsUrl(value)) {
    reasons.push('INVALID_URL');
  }

  if (reasons.length > 0) {
    throw new Error(`[config] EXPO_PUBLIC_API_URL غير مقبول لبناء الإصدار: ${reasons.join(', ')}`);
  }
  return value;
}

export const API_BASE_URL: string = resolveApiUrl();

export const REQUEST_TIMEOUT_MS = 15_000;