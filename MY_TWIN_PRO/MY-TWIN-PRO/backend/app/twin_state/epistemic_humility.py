"""
Epistemic Humility v1.0 - الوعي بحدود المعرفة
يمكّن التوأم من قول "لا أعرف" بصدق بدل الادعاء.
"""
import logging, re
logger = logging.getLogger("epistemic_humility")
BEYOND_CAPABILITY = [r"تشخيص|جرعة|دواء ل", r"قضية|محكمة|طلاق", r"استثمر|تداول|أسهم", r"كلمة مرور|اختراق"]
FACTUAL = r"(متى|كم عدد|أين يقع|من هو|ما هي السنة|تاريخ)"
async def assess_certainty(message: str, memory_hits: int = 0) -> dict:
    text = (message or "").lower()
    beyond = any(re.search(p, text) for p in BEYOND_CAPABILITY)
    factual = bool(re.search(FACTUAL, text))
    if beyond: certainty = 0.2
    elif factual and memory_hits == 0: certainty = 0.45
    else: certainty = min(0.95, 0.6 + memory_hits * 0.05)
    return {"certainty": round(certainty, 2), "beyond_capability": beyond}
logger.info("✅ Epistemic Humility v1.0 ready")
