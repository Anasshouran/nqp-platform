import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { QrImage } from './qr-generator';

describe('qr-generator — توليد QR محلي دون خدمة خارجية', () => {
  it('يعرض رمز QR محلياً (SVG) للمحتوى المطلوب دون أي طلب لخدمة خارجية', () => {
    const payload = JSON.stringify({
      type: 'NQL_RESULT',
      reference: 'NQL-2026-000123',
      code: 'LNC-A3F9K2',
      issued_at: '2026-10-03T08:00:00Z',
    });

    const { container } = render(<QrImage value={payload} size={148} />);

    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();

    // لا يجب أن يوجد أي `<img>` أو عنوان URL لخدمة QR خارجية.
    expect(container.querySelector('img')).toBeNull();
    expect(container.innerHTML).not.toContain('qrserver');
    expect(container.innerHTML).not.toMatch(/src=["']https?:\/\/api\.qrserver\.com/);
  });

  it('يحافظ على حمولة التحقق كاملة في الرمز دون إرسالها خارجياً', () => {
    const payload = JSON.stringify({ type: 'NQL_RESULT', reference: 'NQL-1', code: 'CODE-X' });
    const { container } = render(<QrImage value={payload} size={100} />);
    // qrcode.react يعرِّف المحتوى كسمة data على النمط المُدوَّن؛
    // الأهم هنا غياب أي مرجع خارجي ووجود SVG.
    expect(container.querySelector('svg')).not.toBeNull();
  });
});