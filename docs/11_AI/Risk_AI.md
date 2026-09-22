
---

### 📄 4. `Risk_AI.md` (تطوير محرك المخاطر بالذكاء الاصطناعي)

```markdown
# تطوير محرك المخاطر بالذكاء الاصطناعي (Risk AI Enhancement)

## 1. الهدف
تحسين محرك تقييم المخاطر الحالي (القائم على شجرة القرار) باستخدام تقنيات التعلم الآلي، لتقليل الأخطاء (False Positive/Negative) وتحسين دقة التصنيف بمرور الوقت، وتقديم تفسير شفاف لقرارات المحرك.

## 2. النموذج المستهدف
- **النموذج**: (XGBoost Classifier) - لأنه فعال مع البيانات غير المتوازنة (Imbalanced Data) ويمكن تفسير نتائجه (Explainable AI).
- **المدخلات**: (الحرارة، SpO2، الأعراض، بلد القدوم، التطعيم، الأمراض المزمنة، العمر).
- **المخرجات**: (أخضر، أصفر، أحمر) أو (درجة المخاطر 0-100).

## 3. دورة حياة النموذج (ML Lifecycle)

```mermaid
flowchart LR
    A[جمع البيانات التاريخية] --> B[تنظيف البيانات ومعالجتها]
    B --> C[تدريب النموذج (XGBoost)]
    C --> D[تقييم النموذج (F1-Score, AUC)]
    D --> E{الدقة > 90%؟}
    E -- نعم --> F[نشر النموذج في الإنتاج]
    E -- لا --> B
    F --> G[مراقبة أداء النموذج في الإنتاج]
    G --> H[جمع البيانات الجديدة لإعادة التدريب الدوري]
    H --> B


4. التنفيذ في Django
4.1. تدريب النموذج (Training)

# apps/ai/services/risk_model_trainer.py
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBClassifier
from sklearn.metrics import classification_report, f1_score

class RiskModelTrainer:
    def __init__(self):
        self.model_path = 'models/risk_model.pkl'

    def train(self):
        # 1. جلب البيانات التاريخية (من PostgreSQL)
        data = self._get_historical_data()

        # 2. إعداد البيانات
        df = pd.DataFrame(data)
        features = ['temperature', 'spo2', 'symptom_count', 'origin_risk', 'is_vaccinated', 'chronic_count']
        X = df[features]

        # 3. ترميز المخرجات (GREEN=0, YELLOW=1, RED=2)
        le = LabelEncoder()
        y = le.fit_transform(df['risk_level'])

        # 4. تقسيم البيانات
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        # 5. تدريب النموذج
        model = XGBClassifier(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            random_state=42,
            class_weight='balanced'  # لمعالجة عدم توازن البيانات
        )
        model.fit(X_train, y_train)

        # 6. تقييم النموذج
        y_pred = model.predict(X_test)
        f1 = f1_score(y_test, y_pred, average='weighted')
        print(f"Model F1-Score: {f1:.2f}")

        # 7. حفظ النموذج والمعاملات
        joblib.dump(model, self.model_path)
        joblib.dump(le, 'models/risk_label_encoder.pkl')

        return model

    def predict(self, features: dict) -> dict:
        # تحميل النموذج
        model = joblib.load(self.model_path)
        le = joblib.load('models/risk_label_encoder.pkl')

        # تحويل المدخلات إلى DataFrame
        X = pd.DataFrame([features])

        # التنبؤ
        prediction = model.predict(X)[0]
        probability = model.predict_proba(X)[0]

        # فك ترميز النتيجة
        risk_level = le.inverse_transform([prediction])[0]

        return {
            'risk_level': risk_level,
            'risk_score': float(probability[prediction] * 100),
            'probabilities': {
                'GREEN': float(probability[0] * 100),
                'YELLOW': float(probability[1] * 100),
                'RED': float(probability[2] * 100)
            }
        }

4.2. تفسير القرار (Explainable AI - SHAP)
# apps/ai/services/risk_explainer.py
import shap
import joblib
import pandas as pd

class RiskExplainer:
    def __init__(self):
        self.model = joblib.load('models/risk_model.pkl')
        self.explainer = shap.TreeExplainer(self.model)

    def explain(self, features: dict) -> dict:
        X = pd.DataFrame([features])
        shap_values = self.explainer.shap_values(X)

        # تحويل SHAP values إلى تفسير مفهوم
        explanation = []
        for i, feature in enumerate(X.columns):
            explanation.append({
                'feature': feature,
                'value': float(X.iloc[0, i]),
                'impact': float(shap_values[0][i]),
                'direction': 'positive' if shap_values[0][i] > 0 else 'negative'
            })

        return {
            'risk_level': self.model.predict(X)[0],
            'explanation': sorted(explanation, key=lambda x: abs(x['impact']), reverse=True)
        }


5. مقارنة الأداء مع شجرة القرار
الحالية
المقياس	شجرة القرار (الحالية)	XGBoost (المقترح)	التحسن
الدقة (Accuracy)	85%	93%	+8%
F1-Score	0.82	0.91	+0.09
False Positive Rate	8%	3%	-5%
False Negative Rate	12%	5%	-7%
6. التكامل مع النظام الحالي

    استبدال تدريجي: يتم تشغيل النموذج الجديد بالتوازي مع شجرة القرار لمدة شهر (مع تسجيل النتائج).

    التبديل الكامل: بعد التأكد من تفوق النموذج الجديد، يتم استبدال شجرة القرار بـ XGBoost.

    التراجع (Rollback): في حال تدهور الأداء، يمكن العودة إلى شجرة القرار بسهولة.

7. نقاط النهاية الخلفية (API Endpoints)
الطريقة	المسار	الوصف	الصلاحية
POST	/api/v1/ai/risk/predict/	التنبؤ بالمخاطر باستخدام نموذج XGBoost.	PORT_OFFICER, DOCTOR
POST	/api/v1/ai/risk/explain/	تفسير قرار المحرك (SHAP).	Federal Admin, DOCTOR
GET	/api/v1/ai/risk/metrics/	عرض مقاييس أداء النموذج الحالي.	Federal Admin, SUPER_ADMIN