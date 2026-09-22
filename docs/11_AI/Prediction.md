
---

### 📄 3. `Prediction.md` (النماذج التنبؤية)

```markdown
# النماذج التنبؤية (Prediction Models)

## 1. الهدف
استخدام تقنيات التعلم الآلي (Machine Learning) للتنبؤ بالاتجاهات المستقبلية، مثل: (توقع أعداد الحالات الإيجابية، تحديد المنافذ الأكثر عرضة للتفشي، وتوقع احتياجات المخزون الاستراتيجي)، لدعم اتخاذ القرارات الاستباقية في غرفة الطوارئ والإدارة الاتحادية.

## 2. النماذج التنبؤية

| النموذج | الوصف | البيانات المستخدمة | التكرار | الأداة |
| :--- | :--- | :--- | :--- | :--- |
| **توقع الحالات الإيجابية** | التنبؤ بعدد الحالات الإيجابية خلال الأيام القادمة. | البيانات التاريخية (الفحوصات، الحالات) | يومي | ARIMA / Prophet |
| **توقع ازدحام المنافذ** | التنبؤ بأوقات الذروة في المنافذ. | بيانات الرحلات القادمة، البيانات التاريخية | كل ساعة | XGBoost / LSTM |
| **توقع احتياجات المخزون** | التنبؤ بالاحتياجات المستقبلية من الأدوية والمستلزمات. | بيانات المخزون الحالي، اتجاهات الحالات | أسبوعي | Prophet / Linear Regression |
| **توقع تفشي المرض** | تحديد المناطق والمنافذ الأكثر عرضة للتفشي. | بيانات الحالات، الحركة، الموسم | يومي | Random Forest / XGBoost |

## 3. التقنية المستخدمة

### 3.1. المكتبات (Python)
```python
# requirements.txt (مضافة)
pandas==2.2.2
numpy==1.26.4
scikit-learn==1.5.0
statsmodels==0.14.0
prophet==1.1.5
xgboost==2.0.3
tensorflow==2.16.1

3.2. نموذج توقع الحالات الإيجابية (ARIMA)
# apps/ai/services/prediction_service.py
import pandas as pd
from statsmodels.tsa.arima.model import ARIMA
from django.core.cache import cache

class PredictionService:
    def predict_positive_cases(self, days_ahead: int = 7) -> list:
        # 1. جلب البيانات التاريخية من PostgreSQL
        data = self._get_historical_data()
        series = pd.Series(data, index=pd.date_range(start='2024-01-01', periods=len(data), freq='D'))

        # 2. تدريب نموذج ARIMA
        model = ARIMA(series, order=(5, 1, 0))
        model_fit = model.fit()

        # 3. التنبؤ
        forecast = model_fit.forecast(steps=days_ahead)

        # 4. تخزين النتيجة في Redis (لتسريع الاستعلام)
        cache.set('positive_cases_forecast', forecast.tolist(), timeout=3600)

        return forecast.tolist()


3.3. نموذج توقع ازدحام المنافذ (XGBoost)
# apps/ai/services/congestion_service.py
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split

class CongestionPredictionService:
    def train_model(self):
        # 1. جلب البيانات التاريخية
        data = self._get_historical_congestion_data()
        df = pd.DataFrame(data)

        # 2. إعداد الميزات (Features)
        features = ['hour', 'day_of_week', 'is_holiday', 'flights_arriving']
        X = df[features]
        y = df['congestion_score']

        # 3. تدريب النموذج
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
        model = xgb.XGBRegressor(n_estimators=100, max_depth=6)
        model.fit(X_train, y_train)

        # 4. حفظ النموذج
        import joblib
        joblib.dump(model, 'models/congestion_model.pkl')
        return model

4. عرض النتائج في لوحة
التحكم

    رسم بياني: عرض التوقعات على شكل رسم بياني خطي (مع فاصل الثقة 95%).

    تنبيهات: إذا تجاوزت التوقعات عتبة معينة، يتم إرسال تنبيه إلى غرفة الطوارئ (EOC) عبر WebSocket.

    مقارنة الأداء: عرض دقة النموذج (MAPE - Mean Absolute Percentage Error) مقابل التوقعات السابقة.

5. تحديث النماذج (Model Retraining)

    التكرار: يتم إعادة تدريب النماذج شهرياً (أو أسبوعياً في مواسم الذروة).

    الجدولة: استخدام Celery Beat لتشغيل عملية التدريب تلقائياً.

    التقييم: يتم تقييم النموذج الجديد قبل استبدال القديم (إذا كان أداؤه أفضل).

6. نقاط النهاية الخلفية (API Endpoints)
الطريقة	المسار	الوصف	الصلاحية
GET	/api/v1/ai/predictions/cases/	توقع الحالات الإيجابية.	Federal Admin, EOC Operator
GET	/api/v1/ai/predictions/congestion/	توقع ازدحام المنافذ.	Federal Admin, EOC Operator
GET	/api/v1/ai/predictions/stockpile/	توقع احتياجات المخزون.	Federal Admin, EOC Operator
GET	/api/v1/ai/predictions/outbreak/	توقع مناطق التفشي.	Federal Admin, EOC Operator

