from .models import RiskAssessment, RiskSettings

ORIGIN_RISK_BONUS = 10.0
CHRONIC_DISEASE_BONUS = 5.0
HIGH_RISK_SYMPTOMS = {'fever', 'cough', 'dyspnea', 'shortness_of_breath', 'chest_pain', 'loss_of_smell', 'loss_of_taste'}


class RiskEngineService:
    """Simplified decision-tree risk engine executed on arrival screening."""

    @classmethod
    def assess(cls, screening):
        settings = RiskSettings.get_settings()
        traveler = screening.traveler
        temperature = screening.body_temperature
        spo2 = screening.oxygen_saturation
        symptoms = screening.observed_symptoms or []
        factors = {}

        if temperature is not None and temperature > settings.red_temp_threshold:
            return cls._save(screening, 'RED', 100.0, {'rule': 'temperature_above_threshold', 'temperature': temperature}, 'QUARANTINE')

        if spo2 is not None and spo2 < settings.red_spo2_threshold:
            return cls._save(screening, 'RED', 100.0, {'rule': 'spo2_below_threshold', 'spo2': spo2}, 'QUARANTINE')

        temp_score = max(0.0, (temperature - 37.0)) * 10 if temperature is not None else 0.0
        spo2_score = max(0.0, (100.0 - (spo2 or 100.0))) * 1.5
        symptom_count = len([s for s in symptoms if s in HIGH_RISK_SYMPTOMS]) or len(symptoms)

        origin_risk = 'GREEN'
        try:
            origin_risk = traveler.nationality.risk_level or 'GREEN'
        except AttributeError:
            origin_risk = 'GREEN'
        factors['origin_risk'] = {'GREEN': 10, 'YELLOW': 40, 'RED': 80}.get(origin_risk, 10)
        origin_score = ORIGIN_RISK_BONUS if origin_risk == 'RED' else 0.0

        medical_history = traveler.medical_history or {}
        chronic = any(
            value and key in ('diabetes', 'hypertension', 'asthma', 'heart_disease', 'chronic_renal_disease')
            for key, value in medical_history.items()
        )
        if chronic:
            origin_score += CHRONIC_DISEASE_BONUS

        vaccine_discount = 0.0
        vaccinated = traveler.documents.filter(document_type='VACCINE').exists()
        if vaccinated:
            vaccine_discount = 10.0

        score = (
            settings.temp_weight * temp_score
            + settings.spo2_weight * spo2_score
            + settings.symptom_weight * symptom_count
            + settings.origin_weight * origin_score
            - settings.vaccine_weight * vaccine_discount
        )
        score = max(0.0, min(100.0, score))

        factors.update({
            'symptoms_risk': min(100.0, settings.symptom_weight * symptom_count),
            'vitals_risk': min(100.0, settings.temp_weight * temp_score + settings.spo2_weight * spo2_score),
            'vaccinated': vaccinated,
        })

        if score > settings.red_threshold:
            level, recommendation = 'RED', 'QUARANTINE'
        elif score >= settings.yellow_threshold:
            level, recommendation = 'YELLOW', 'REFER'
        else:
            level, recommendation = 'GREEN', 'ADMIT'

        return cls._save(screening, level, score, factors, recommendation)

    @staticmethod
    def _save(screening, level, score, factors, recommendation):
        assessment, _ = RiskAssessment.objects.update_or_create(
            screening=screening,
            defaults={
                'risk_level': level,
                'risk_score': round(score, 2),
                'decision_factors': factors,
                'recommendation': recommendation,
            },
        )
        return assessment
