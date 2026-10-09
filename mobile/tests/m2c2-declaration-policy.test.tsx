/**
 * M2-C2 — Declaration Write Policy = DEFERRED (guard-client).
 *
 * يُثبت أن تطبيق الجوال يبقى **اقرأ-فقط** للإقرارات:
 *  - مستودع declarations يعرّض list() فقط (لا create/edit/submit/amend/cancel)؛
 *  - لا يوجد باب طابور كتابة إقرار في محرك المزامنة؛
 *  - شاشة Health لا تقدّم نموذج إرسال/تعديل/إلغاء وهمياً.
 * عدم التفويض ≠ فشل: النتيجة الصحيحة DEFERRED (§22).
 */
import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { createRepositories } from '../src/services/repositories';
import { MobileApiClient } from '../src/api/client';
import { HealthScreen } from '../src/screens/dataScreens';
import { makeStore } from '../src/state/store';
import { __setReposForTests } from '../src/services/provider';
import { __setTokenStorageForTests } from '../src/state';
import { InMemorySecureTokenStorage } from '../src/security/secureStorage';
import type { Repositories } from '../src/services/repositories';
import * as engine from '../src/offline/engine';

beforeEach(() => {
  __setTokenStorageForTests(new InMemorySecureTokenStorage());
});
afterEach(() => {
  __setTokenStorageForTests(new InMemorySecureTokenStorage());
});

describe('declaration write policy = deferral-only (read-only client)', () => {
  it('repository exposes only list() for declarations (no write seam)', async () => {
    const client = new MobileApiClient({
      baseUrl: 'http://t',
      fetchImpl: (async () =>
        new Response(
          JSON.stringify({ status: 'success', data: [], message: null }),
          { status: 200 },
        )) as unknown as typeof fetch,
      getAccessToken: () => 't',
    });
    const repos: Repositories = createRepositories(client);
    expect(Object.keys(repos.declarations)).toEqual(['list']);
  });

  it('offline engine has no declaration mutation queue exports', async () => {
    const keys = Object.keys(engine);
    for (const forbidden of ['enqueueDeclaration', 'submitDeclarationOffline', 'pushDeclarationWrite']) {
      expect(keys).not.toContain(forbidden);
    }
  });

  it('no fake submit workflow on Health screen', async () => {
    __setReposForTests({ declarations: { list: async () => [] } } as unknown as Repositories);
    const store = makeStore();
    const { queryByText, queryByTestId } = await render(
      <Provider store={store}>
        <HealthScreen />
      </Provider>,
    );
    // لا تحكم إرسال/تعديل/إلغاء وهمي
    expect(queryByTestId(/^submit/i)).toBeNull();
    expect(queryByTestId(/^amend/i)).toBeNull();
    expect(queryByTestId(/cancel-declaration/i)).toBeNull();
    // عنوان الصحة يظهر (اقرأ-فقط) — لا نموذج يُفترض قدرته على الإرسال
    expect(queryByText('الصحة')).toBeTruthy();
  });
});