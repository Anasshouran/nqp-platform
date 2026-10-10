/**
 * جدول حراسة المسارات مبني آنياً من نص `src/routes.tsx`.
 *
 * لكل مسار معرَّف: قائمة الأدوار المسموح بها، أو `null` للمسار المفتوح
 * لكل مستخدم موثَّق. المسارات غير المعرَّفة غائبة عن الجدول.
 *
 * يُستخدم في الاختبارات لإثبات أن عناصر القوائم الجانبية ومسارات الدور
 * تؤدي فعلاً إلى مسار يستطيع دور المستخدم الوصول إليه (F01/F16).
 *
 * يقرأ الملف عبر `import.meta.glob` (Vite) بدل `node:fs` — لأن حزمة
 * `@types/node` غير مثبتة ولا يُسمح بتغيير التبعيات.
 */

export type GuardTable = Record<string, string[] | null>;

const routesRaw = import.meta.glob('../routes.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const ROUTES_SOURCE: string = routesRaw['../routes.tsx'] ?? '';

/** يقرأ وسم `<Route ...>` كاملاً بالنظر في التداخل `{}` و`<>` داخله. */
const readTag = (src: string, start: number): string => {
  let angle = 0;
  let quote: string | null = null;
  for (let i = start; i < src.length; i += 1) {
    const ch = src[i];
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '<') angle += 1;
    else if (ch === '>') {
      angle -= 1;
      if (angle === 0) return src.slice(start, i + 1);
    }
  }
  return src.slice(start);
};

const joinPath = (parent: string | null, child: string): string => {
  if (child.startsWith('/')) return child;
  if (!parent) return child;
  return `${parent.replace(/\/$/, '')}/${child}`;
};

const normalizePath = (path: string): string => {
  const withoutHash = path.split(/[?#]/)[0];
  if (withoutHash.length > 1 && withoutHash.endsWith('/')) return withoutHash.slice(0, -1);
  return withoutHash;
};

export const loadRouteGuards = (src: string = ROUTES_SOURCE): GuardTable => {
  const table: GuardTable = {};
  const stack: Array<{ path: string | null; guard: string[] | null }> = [];
  const topGuard = (): string[] | null =>
    stack.length ? stack[stack.length - 1].guard : null;
  let i = 0;

  while (i < src.length) {
    if (src.startsWith('</Route>', i)) {
      stack.pop();
      i += '</Route>'.length;
      continue;
    }
    if (src.startsWith('<Route', i)) {
      const tag = readTag(src, i);
      i += tag.length;
      const pathMatch = /\bpath="([^"]+)"/.exec(tag);
      const rolesMatch = /ProtectedRoute\s+roles=\{\[([^\]]*)\]/.exec(tag);
      let guard: string[] | null;
      if (rolesMatch) {
        guard = [...rolesMatch[1].matchAll(/'([A-Z0-9_]+)'/g)].map((m) => m[1]);
      } else if (/<\w*ProtectedRoute\s*\/>/.test(tag)) {
        guard = null;
      } else {
        guard = topGuard();
      }
      const path = pathMatch ? joinPath(stack[stack.length - 1]?.path ?? null, pathMatch[1]) : null;
      if (path) table[normalizePath(path)] = guard;
      if (!tag.trimEnd().endsWith('/>')) {
        stack.push({ path, guard });
      }
      continue;
    }
    i += 1;
  }
  return table;
};

let cachedTable: GuardTable | null = null;

const table = (): GuardTable => {
  if (!cachedTable) cachedTable = loadRouteGuards();
  return cachedTable;
};

/** هل يستطيع `role` الوصول إلى `path` (حارس يشمل الدور أو مسار مفتوح)؟ */
export const canRoleReach = (role: string, path: string): boolean => {
  const guard = table()[normalizePath(path)];
  if (guard === undefined) return false;
  return guard === null || guard.includes(role);
};

/** حراسة مسار معيّن — للرسائل التوضيحية في الاختبارات. */
export const guardFor = (path: string): string[] | null | undefined =>
  table()[normalizePath(path)];
