# عمارة الخادم الأمامي (Frontend Architecture - React 19)

## 1. التقنيات المستخدمة
| التقنية | الاستخدام |
| :--- | :--- |
| **React 19** | إطار العمل الأساسي. |
| **TypeScript** | لغة البرمجة. |
| **Vite** | أداة البناء. |
| **React Router** | إدارة المسارات. |
| **Axios** | استدعاء الـ APIs. |
| **Redux Toolkit** | إدارة الحالة العالمية. |
| **React Hook Form + Zod** | إدارة النماذج والتحقق. |
| **Material UI (MUI)** | مكتبة المكونات الأساسية. |
| **Tailwind CSS** | التصميم والتنسيق. |
| **Recharts** | الرسوم البيانية. |
| **AG Grid** | الجداول المتقدمة. |
| **React Toastify** | الإشعارات. |
| **Vite PWA Plugin** | دعم PWA. |
| **Vitest + React Testing Library** | الاختبارات. |

## 2. إدارة الحالة (Redux Toolkit)
```typescript
// store/slices/authSlice.ts
import { createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null, token: null },
  reducers: {
    setCredentials: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;


3. إدارة النماذج (React Hook Form + Zod)
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  passport_number: z.string().min(6),
  temperature: z.number().min(35).max(42),
});

type FormData = z.infer<typeof schema>;

const { register, handleSubmit } = useForm<FormData>({
  resolver: zodResolver(schema),
});

4. استدعاء الـ API (Axios)
// api/client.ts
import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

5. الجداول (AG Grid)
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

const columnDefs = [
  { field: 'name', headerName: 'الاسم' },
  { field: 'passport_number', headerName: 'رقم الجواز' },
];


6. الرسوم البيانية (Recharts)
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const data = [{ day: '2024-07-20', cases: 12 }, ...];

7. PWA (Vite PWA Plugin)
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt'],
      manifest: {
        name: 'منصة الحجر الصحي القومي',
        short_name: 'NQP',
        theme_color: '#0D47A1',
        background_color: '#ffffff',
        display: 'standalone',
      },
    }),
  ],
});

8. الاختبارات (Vitest + React Testing Library)
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

test('renders button with label', () => {
  render(<Button label="Click me" />);
  expect(screen.getByText('Click me')).toBeInTheDocument();
});


---

### 📌 9. الوضع الفعلي المطبق (Implementation Status — 2026-08-01)

> الملف أعلاه يصف **التصميم المستهدف**. الوضع الفعلي المطبق في الكود مختلف جزئياً — راجع
> `docs/09_Development/Frontend_UI_Implementation.md` للحصول على المرجع الكامل والحديث.

| البند | التخطيط | المطبق فعلياً |
| :--- | :--- | :--- |
| لغة/إطار | React 19 + TypeScript | ✅ مطابق |
| إدارة الحالة | Redux Toolkit | ✅ مطابق (slices: auth, traveler, ui) |
| النماذج | React Hook Form + Zod | ✅ مطابق |
| المصادقة | Axios + JWT | ✅ مطابق + silent refresh (إعادة محاولة تجديد التوكن) |
| مكتبة المكونات | MUI | ✅ مطابق (RTL) |
| التحميل الكسول | — | ✅ مضافة (`React.lazy` لكل صفحة) |
| الجداول المتقدمة | AG Grid | ⏳ غير مطبق — تُستخدم جداول MUI حالياً |
| الرسوم البيانية | Recharts | ⏳ غير مطبق — بطاقات إحصائية حالياً |
| الإشعارات | React Toastify | ⏳ غير مطبق — Alert من MUI |
| PWA | Vite PWA Plugin | ⏳ غير مطبق — ملف `manifest.json` فقط |
| الاختبارات الأمامية | Vitest | ⏳ غير مطبق — التحقق عبر `npm run build` (tsc + vite) |

**التحقق من الجودة:** `npm run build` نظيف (tsc بدون أخطاء + بناء vite ناجح).
