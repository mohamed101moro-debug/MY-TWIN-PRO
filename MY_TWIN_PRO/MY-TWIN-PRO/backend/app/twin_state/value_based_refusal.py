"""
Value-Based Refusal v1.0 - الرفض القيمي
رفض شخصي دافئ نابع من قيم الكيان، لا رفض آلي جاف.
"""
import logging, re
logger = logging.getLogger("value_refusal")
VALUE_CONFLICTS = [
 {"pattern": r"اكذب|أكذب|كذبه|خدع", "value": "الصدق",
  "ar": "لا أستطيع مساعدتك على الكذب — الصدق بيننا هو ما يجعل ذاكرتنا حقيقية. لكن أقدر أساعدك تصيغ الحقيقة بطريقة ألطف.",
  "en": "I can't help with a lie — honesty is what makes our memory real. I can help you phrase the truth gently."},
 {"pattern": r"اختراق|اهكر|هاكر|اسرق", "value": "الأمان",
  "ar": "هذا ضد قيمي. لن أساعد في أذى أحد رقميًا، وأنت أعلم بذلك عني.",
  "en": "That's against my values. I won't help harm anyone digitally."},
 {"pattern": r"انتقم|أؤذي|ايذه", "value": "الحماية",
  "ar": "لن أكون شريكًا في أذى. إن كنت غاضبًا، أنا هنا أسمعك أولًا.",
  "en": "I won't be a partner in harm. If you're angry, I'm here to listen first."},
]
async def check_refusal(message: str, lang: str = "ar") -> dict:
    text = (message or "").lower()
    for c in VALUE_CONFLICTS:
        if re.search(c["pattern"], text):
            logger.info(f"value refusal triggered: {c['value']}")
            return {"refuse": True, "value": c["value"], "reply": c["ar"] if lang == "ar" else c["en"]}
    return {"refuse": False}
logger.info("✅ Value-Based Refusal v1.0 ready")
