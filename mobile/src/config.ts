/** إعداد الجوال — قاعدة URL قابلة للتجاوز (اختبار/تطوير/إنتاج). */
import { Platform } from 'react-native';

const DEFAULT_HOST = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_URL ?? `${DEFAULT_HOST}/api/v1`;

export const REQUEST_TIMEOUT_MS = 15_000;