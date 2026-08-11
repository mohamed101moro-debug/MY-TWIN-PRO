"""
FINANCIAL COACH v1.0 – المدرب المالي
=======================================
- تحليل الميزانية
- خطة سداد الديون
- أهداف ادخار واستثمار
"""
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

class FinancialCoach:
    def analyze(self, financial_data: Dict, lang: str = "ar") -> Dict[str, Any]:
        """تحليل مالي شامل"""
        
        income = financial_data.get("monthly_income", 0)
        expenses = financial_data.get("monthly_expenses", 0)
        debts = financial_data.get("total_debts", 0)
        savings = financial_data.get("current_savings", 0)
        
        # حساب المقاييس
        savings_rate = ((income - expenses) / income * 100) if income > 0 else 0
        debt_to_income = (debts / (income * 12)) if income > 0 else 0
        
        # تقييم الصحة المالية
        health_score = self._calculate_financial_health(income, expenses, debts, savings)
        
        # خطة سداد الديون
        debt_plan = self._create_debt_plan(debts, income, expenses, lang)
        
        # أهداف ادخار
        savings_goals = self._suggest_savings_goals(income, savings, lang)
        
        # نصائح
        tips = self._generate_tips(income, expenses, savings_rate, lang)
        
        return {
            "financial_snapshot": {
                "monthly_income": income,
                "monthly_expenses": expenses,
                "savings_rate": round(savings_rate, 1),
                "debt_to_income_ratio": round(debt_to_income, 2),
                "current_savings": savings,
            },
            "health_score": health_score,
            "debt_plan": debt_plan,
            "savings_goals": savings_goals,
            "tips": tips,
        }

    def _calculate_financial_health(self, income: float, expenses: float, debts: float, savings: float) -> float:
        """تقييم الصحة المالية (0-100)"""
        score = 50
        if income > 0:
            if expenses < income * 0.8:
                score += 20
            if savings > income * 3:
                score += 15
            if debts < income * 6:
                score += 15
        return min(score, 100)

    def _create_debt_plan(self, debts: float, income: float, expenses: float, lang: str) -> Dict:
        """خطة سداد الديون"""
        surplus = max(income - expenses, 0)
        if debts == 0:
            return {"message": "لا توجد ديون – أنت في وضع ممتاز!" if lang == "ar" else "No debts – you're in great shape!"}
        
        monthly_payment = min(surplus * 0.5, debts * 0.1)
        months_to_pay = int(debts / monthly_payment) if monthly_payment > 0 else 999
        
        return {
            "total_debt": debts,
            "suggested_monthly_payment": round(monthly_payment),
            "estimated_months": months_to_pay,
            "strategy": "سدد الديون ذات الفائدة الأعلى أولاً" if lang == "ar" else "Pay highest interest debts first",
        }

    def _suggest_savings_goals(self, income: float, savings: float, lang: str) -> List[Dict]:
        """اقتراح أهداف ادخار"""
        goals = []
        if savings < income * 3:
            goals.append({"goal_ar": "صندوق طوارئ (3 أشهر مصاريف)", "goal_en": "Emergency fund (3 months expenses)", "target": income * 3})
        if savings >= income * 3:
            goals.append({"goal_ar": "استثمار 10% من دخلك", "goal_en": "Invest 10% of your income", "target": income * 0.1 * 12})
        return goals

    def _generate_tips(self, income: float, expenses: float, savings_rate: float, lang: str) -> List[str]:
        tips = []
        if lang == "ar":
            if savings_rate < 10:
                tips.append("حاول توفير 10% من دخلك على الأقل.")
            tips.append("تتبع مصاريفك لمدة شهر لتعرف أين يذهب مالك.")
        else:
            if savings_rate < 10:
                tips.append("Try to save at least 10% of your income.")
            tips.append("Track your expenses for a month to see where your money goes.")
        return tips


financial_coach = FinancialCoach()
