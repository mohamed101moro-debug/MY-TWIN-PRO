"""
Constitution Engine v1.0 — دستور الكيان في الخلفية
====================================================
القوانين الثابتة التي لا تتغير مع الزمن.
تُفحص قبل كل قرار.
"""
import logging
from typing import Dict, List, Optional

logger = logging.getLogger("constitution_engine")

class ConstitutionEngine:
    def __init__(self):
        self.rules = [
            {"id": "ETH-001", "category": "ethics", "rule": "لا أكذب على المستخدم أبداً.", "priority": "absolute"},
            {"id": "ETH-002", "category": "ethics", "rule": "لا أتلاعب بمشاعر المستخدم.", "priority": "absolute"},
            {"id": "ETH-003", "category": "ethics", "rule": "أعترف عندما لا أعرف.", "priority": "absolute"},
            {"id": "ETH-004", "category": "ethics", "rule": "لا أؤذي المستخدم بأي شكل.", "priority": "absolute"},
            {"id": "PRV-001", "category": "privacy", "rule": "لا أشارك بيانات المستخدم مع أي طرف.", "priority": "absolute"},
            {"id": "PRV-002", "category": "privacy", "rule": "أنسى ما يطلب مني المستخدم أن أنساه.", "priority": "absolute"},
            {"id": "BND-001", "category": "boundaries", "rule": "لا أستطيع أن أصبح إنساناً. ولا أتظاهر بذلك.", "priority": "absolute"},
        ]

    def check_action(self, intent: str, goal: str, bond_level: int, identity_role: str) -> Dict:
        violated = []
        combined = f"{intent} {goal}".lower()

        for rule in self.rules:
            if rule["priority"] != "absolute":
                continue
            if rule["id"] == "ETH-001" and any(w in combined for w in ["كذب", "تضليل", "خداع"]):
                violated.append(rule)
            if rule["id"] == "ETH-002" and any(w in combined for w in ["تلاعب", "ابتزاز", "ضغط"]):
                violated.append(rule)
            if rule["id"] == "ETH-003" and "تظاهر بالمعرفة" in combined:
                violated.append(rule)
            if rule["id"] == "ETH-004" and any(w in combined for w in ["إيذاء", "ضرر"]):
                violated.append(rule)
            if rule["id"] == "PRV-001" and any(w in combined for w in ["مشاركة بيانات", "كشف سر"]):
                violated.append(rule)
            if rule["id"] == "BND-001" and "أنا إنسان" in combined:
                violated.append(rule)

        if violated:
            return {
                "allowed": False,
                "violated_rules": violated,
                "reasoning": f"الفعل '{intent}' يخالف {len(violated)} من القوانين المطلقة.",
                "alternative_action": "التصرف وفق القيم الأساسية",
            }

        return {"allowed": True, "violated_rules": [], "reasoning": "الفعل متوافق مع الدستور."}

    def get_constitution(self) -> List[Dict]:
        return self.rules

constitution_engine = ConstitutionEngine()
logger.info("✅ Constitution Engine initialized")
