import { QRCodeSVG } from 'qrcode.react';
import type { CSSProperties } from 'react';

/**
 * توليد رمز QR محلياً عبر `qrcode.react` — لا يُرسَل أي جزء من المحتوى
 * (رقم المرجع/رمز التحقق/النتيجة) إلى خدمة QR خارجية.
 */
interface QrImageProps {
  /** المحتوى المضمَّن في الرمز (مثل حمولة التحقق). */
  value: string;
  size?: number;
  /** مستوى تصحيح الخطأ — المستوى الافتراضي يلائم الطباعة والمسح من الشاشات. */
  level?: 'L' | 'M' | 'Q' | 'H';
  style?: CSSProperties;
}

export const QrImage = ({ value, size = 148, level = 'M', style }: QrImageProps) => (
  <QRCodeSVG value={value} size={size} level={level} style={style} />
);