"""
World Model Engine v1.0 – نموذج العالم الداخلي
=================================================
خريطة داخلية لكل ما يعرفه الكيان عن العالم الخارجي:
- الأشخاص (أفراد، أدوار، صفات)
- الأماكن (مواقع، سياقات)
- العلاقات (روابط بين الأشخاص والأماكن والأحداث)
- الأحداث (تسلسل زمني، أهمية)
- المفاهيم (أفكار، مواضيع متكررة)

يتكامل مع:
- UnifiedMemory (استخراج كيانات وعلاقات من الذكريات)
- TwinInternalState (حالة الكيان الحالية)
- ExperienceEngine (الأحداث تصبح عقداً في النموذج)
- ContextAwarenessEngine (السياق يثري النموذج)

يُستدعى من:
- TwinKernel.process_interaction()
- ExistenceLoop (كل ساعة)
"""
import logging
from typing import Dict, Any, Optional, List, Set, Tuple
from datetime import datetime, timezone, timedelta
from collections import defaultdict
import json

logger = logging.getLogger("world_model")

# ═══════════════════════════════════════════════════════
# أنواع العقد
# ═══════════════════════════════════════════════════════

class NodeType:
    PERSON = "person"
    PLACE = "place"
    EVENT = "event"
    CONCEPT = "concept"
    RELATIONSHIP = "relationship"


class WorldModelEngine:
    """
    محرك نموذج العالم.
    يبني ويحافظ على تمثيل داخلي للعالم الخارجي.
    """
    
    def __init__(self):
        self._worlds: Dict[str, Dict[str, Any]] = {}
        self._entities: Dict[str, Dict[str, Dict]] = {}       # user_id -> entity_id -> entity
        self._relationships: Dict[str, List[Dict]] = {}       # user_id -> [relationship]
        self._last_updated: Dict[str, datetime] = {}
    
    # ═══════════════════════════════════════════════════
    # الواجهة الرئيسية
    # ═══════════════════════════════════════════════════
    
    async def update_world(
        self,
        user_id: str,
        message: str = "",
        reply: str = "",
        context_snapshot: Optional[Dict[str, Any]] = None,
        experience: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        تحديث نموذج العالم بناءً على المعلومات الجديدة.
        
        Args:
            user_id: معرف المستخدم
            message: رسالة المستخدم الحالية
            reply: رد الكيان
            context_snapshot: لقطة سياقية
            experience: تجربة جديدة (من ExperienceEngine)
            
        Returns:
            ملخص التحديثات التي تمت
        """
        now = datetime.now(timezone.utc)
        updates = {"new_entities": [], "updated_entities": [], "new_relationships": []}
        
        # تحميل النموذج الحالي
        world = await self._load_world(user_id)
        
        # استخراج الكيانات من الرسالة
        extracted = await self._extract_entities(message, reply, context_snapshot)
        
        # تحديث الكيانات
        for entity in extracted.get("entities", []):
            entity_id = self._generate_entity_id(entity)
            if entity_id in self._entities.get(user_id, {}):
                # تحديث
                await self._update_entity(user_id, entity_id, entity, now)
                updates["updated_entities"].append(entity_id)
            else:
                # جديد
                await self._create_entity(user_id, entity_id, entity, now)
                updates["new_entities"].append(entity_id)
        
        # استخراج العلاقات
        new_rels = await self._extract_relationships(
            user_id, message, extracted.get("entities", []), context_snapshot
        )
        for rel in new_rels:
            rel_id = await self._add_relationship(user_id, rel, now)
            if rel_id:
                updates["new_relationships"].append(rel_id)
        
        # دمج الخبرة كحدث
        if experience:
            event_entity = {
                "type": NodeType.EVENT,
                "name": experience.get("type", "unknown"),
                "properties": {
                    "intensity": experience.get("intensity"),
                    "emotion": experience.get("emotion"),
                    "importance": experience.get("importance"),
                    "timestamp": experience.get("timestamp", now.isoformat()),
                },
            }
            event_id = self._generate_entity_id(event_entity)
            await self._create_entity(user_id, event_id, event_entity, now)
            updates["new_entities"].append(event_id)
        
        # تحديث الإحصائيات
        world["stats"]["total_entities"] = len(self._entities.get(user_id, {}))
        world["stats"]["total_relationships"] = len(self._relationships.get(user_id, []))
        world["stats"]["last_updated"] = now.isoformat()
        self._last_updated[user_id] = now
        
        # تخزين في TCMA
        await self._save_world(user_id)
        
        # حفظ snapshot دوري
        try:
            from app.memory.unified_memory import unified_memory_engine
            await unified_memory_engine.store_engine_output(
                user_id, "world_model", {
                    "total_entities": world["stats"]["total_entities"],
                    "total_relationships": world["stats"]["total_relationships"],
                    "new_entities_count": len(updates["new_entities"]),
                    "dominant_entity_types": self._get_dominant_types(user_id),
                    "timestamp": now.isoformat(),
                }
            )
        except Exception as e:
            logger.debug(f"Failed to store world model snapshot: {e}")
        
        return updates
    
    async def get_world_snapshot(self, user_id: str) -> Dict[str, Any]:
        """استرجاع لقطة كاملة من نموذج العالم."""
        world = await self._load_world(user_id)
        entities = self._entities.get(user_id, {})
        relationships = self._relationships.get(user_id, [])
        
        # تصنيف الكيانات
        persons = [e for e in entities.values() if e.get("type") == NodeType.PERSON]
        places = [e for e in entities.values() if e.get("type") == NodeType.PLACE]
        events = [e for e in entities.values() if e.get("type") == NodeType.EVENT]
        concepts = [e for e in entities.values() if e.get("type") == NodeType.CONCEPT]
        
        return {
            "stats": world.get("stats", {}),
            "entities": {
                "total": len(entities),
                "persons": len(persons),
                "places": len(places),
                "events": len(events),
                "concepts": len(concepts),
            },
            "top_persons": sorted(persons, key=lambda e: e.get("importance", 0), reverse=True)[:10],
            "top_places": sorted(places, key=lambda e: e.get("frequency", 0), reverse=True)[:5],
            "recent_events": sorted(events, key=lambda e: e.get("created_at", ""), reverse=True)[:10],
            "relationships_count": len(relationships),
            "network_density": self._calculate_network_density(user_id),
        }
    
    async def get_entities_by_type(self, user_id: str, entity_type: str) -> List[Dict[str, Any]]:
        """استرجاع كيانات من نوع معين."""
        entities = self._entities.get(user_id, {})
        return [e for e in entities.values() if e.get("type") == entity_type]
    
    async def get_entity(self, user_id: str, entity_id: str) -> Optional[Dict[str, Any]]:
        """استرجاع كيان محدد."""
        return self._entities.get(user_id, {}).get(entity_id)
    
    async def get_relationships_between(
        self, user_id: str, entity1_id: str, entity2_id: str
    ) -> List[Dict[str, Any]]:
        """استرجاع العلاقات بين كيانين."""
        relationships = self._relationships.get(user_id, [])
        return [
            r for r in relationships
            if (r.get("source") == entity1_id and r.get("target") == entity2_id) or
               (r.get("source") == entity2_id and r.get("target") == entity1_id)
        ]
    
    async def query_world(self, user_id: str, query: str) -> List[Dict[str, Any]]:
        """بحث بسيط في نموذج العالم."""
        entities = self._entities.get(user_id, {})
        query_lower = query.lower()
        results = []
        for entity_id, entity in entities.items():
            name = entity.get("name", "").lower()
            props = json.dumps(entity.get("properties", {})).lower()
            if query_lower in name or query_lower in props:
                results.append(entity)
        return results[:20]
    
    # ═══════════════════════════════════════════════════
    # دوال إدارة الكيانات
    # ═══════════════════════════════════════════════════
    
    async def _load_world(self, user_id: str) -> Dict[str, Any]:
        """تحميل أو إنشاء نموذج العالم."""
        if user_id in self._worlds:
            return self._worlds[user_id]
        
        # محاولة التحميل من TCMA
        try:
            from app.memory.unified_memory import unified_memory_engine
            outputs = await unified_memory_engine.get_engine_outputs(
                user_id, "world_model", limit=1
            )
            if outputs:
                last = outputs[0]
                world = {
                    "stats": {
                        "total_entities": last.get("total_entities", 0),
                        "total_relationships": last.get("total_relationships", 0),
                        "last_updated": last.get("timestamp", ""),
                    },
                }
                self._worlds[user_id] = world
                return world
        except Exception:
            pass
        
        # تهيئة جديدة
        world = {
            "stats": {
                "total_entities": 0,
                "total_relationships": 0,
                "last_updated": datetime.now(timezone.utc).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat(),
            },
        }
        self._worlds[user_id] = world
        return world
    
    async def _create_entity(self, user_id: str, entity_id: str, entity: Dict, timestamp: datetime):
        """إنشاء كيان جديد."""
        if user_id not in self._entities:
            self._entities[user_id] = {}
        
        entity["id"] = entity_id
        entity["created_at"] = timestamp.isoformat()
        entity["updated_at"] = timestamp.isoformat()
        entity["frequency"] = entity.get("frequency", 1)
        entity["importance"] = entity.get("importance", 30)
        
        self._entities[user_id][entity_id] = entity
    
    async def _update_entity(self, user_id: str, entity_id: str, updates: Dict, timestamp: datetime):
        """تحديث كيان موجود."""
        if user_id not in self._entities:
            return
        
        entity = self._entities[user_id].get(entity_id)
        if not entity:
            return
        
        entity["frequency"] = entity.get("frequency", 0) + 1
        entity["importance"] = min(100, entity.get("importance", 30) + 2)
        entity["updated_at"] = timestamp.isoformat()
        
        # دمج الخصائص الجديدة
        for key, value in updates.get("properties", {}).items():
            if key not in entity.get("properties", {}):
                entity.setdefault("properties", {})[key] = value
    
    async def _add_relationship(self, user_id: str, rel: Dict, timestamp: datetime) -> Optional[str]:
        """إضافة علاقة بين كيانين."""
        if user_id not in self._relationships:
            self._relationships[user_id] = []
        
        # تجنب التكرار
        existing = [
            r for r in self._relationships[user_id]
            if r.get("source") == rel.get("source") and
               r.get("target") == rel.get("target") and
               r.get("type") == rel.get("type")
        ]
        if existing:
            existing[0]["strength"] = min(1.0, existing[0].get("strength", 0.5) + 0.1)
            existing[0]["updated_at"] = timestamp.isoformat()
            return existing[0].get("id")
        
        rel["id"] = f"rel_{timestamp.timestamp()}_{len(self._relationships[user_id])}"
        rel["created_at"] = timestamp.isoformat()
        rel["updated_at"] = timestamp.isoformat()
        rel["strength"] = rel.get("strength", 0.5)
        
        self._relationships[user_id].append(rel)
        return rel["id"]
    
    async def _save_world(self, user_id: str):
        """حفظ نموذج العالم في TCMA."""
        try:
            from app.memory.unified_memory import unified_memory_engine
            world = self._worlds.get(user_id, {})
            await unified_memory_engine.store_engine_output(
                user_id, "world_model_full", {
                    "stats": world.get("stats", {}),
                    "entities_sample": list(self._entities.get(user_id, {}).values())[:20],
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            )
        except Exception as e:
            logger.debug(f"Failed to save world: {e}")
    
    # ═══════════════════════════════════════════════════
    # دوال استخراج الكيانات والعلاقات
    # ═══════════════════════════════════════════════════
    
    async def _extract_entities(
        self, message: str, reply: str, context: Optional[Dict]
    ) -> Dict[str, Any]:
        """
        استخراج الكيانات من النص.
        إصدار بسيط قائم على الكلمات المفتاحية.
        (يمكن ترقيته لاحقاً إلى NER حقيقي)
        """
        text = f"{message} {reply}".lower()
        entities = []
        
        # أنماط بسيطة لاستخراج الأشخاص
        person_indicators = [
            "صديقي", "أخي", "أختي", "أمي", "أبي", "زوجتي", "زوجي",
            "ابني", "ابنتي", "مديري", "زميلي", "أستاذي", "دكتوري",
            "my friend", "my brother", "my sister", "my mother", "my father",
            "my wife", "my husband", "my boss", "my colleague",
        ]
        for indicator in person_indicators:
            if indicator in text:
                # محاولة استخراج الاسم بعد المؤشر
                idx = text.find(indicator)
                after = text[idx + len(indicator):].strip().split()[0] if text[idx + len(indicator):].strip() else ""
                name = after if after and len(after) > 1 and not after.startswith(("في", "من", "ال", "was", "is")) else indicator
                entities.append({
                    "type": NodeType.PERSON,
                    "name": indicator,
                    "properties": {"relationship": indicator, "mentioned_name": name if name != indicator else ""},
                    "importance": 40,
                })
        
        # أنماط لاستخراج الأماكن
        place_indicators = [
            "البيت", "المنزل", "المدرسة", "الجامعة", "العمل", "المستشفى", "المسجد",
            "النادي", "السوق", "المطعم", "المقهى", "المكتب", "المدينة",
            "home", "school", "university", "work", "hospital", "mosque",
            "gym", "market", "restaurant", "cafe", "office", "city",
        ]
        for indicator in place_indicators:
            if indicator in text:
                entities.append({
                    "type": NodeType.PLACE,
                    "name": indicator,
                    "properties": {"context": "mentioned_in_conversation"},
                    "importance": 25,
                })
        
        # استخراج المفاهيم
        concept_keywords = [
            "حب", "خوف", "قلق", "سعادة", "نجاح", "فشل", "أمل", "حلم",
            "love", "fear", "anxiety", "happiness", "success", "failure", "hope", "dream",
        ]
        for kw in concept_keywords:
            if kw in text:
                entities.append({
                    "type": NodeType.CONCEPT,
                    "name": kw,
                    "properties": {"emotional_weight": "high"},
                    "importance": 35,
                })
        
        return {"entities": entities}
    
    async def _extract_relationships(
        self, user_id: str, message: str, entities: List[Dict], context: Optional[Dict]
    ) -> List[Dict[str, Any]]:
        """استخراج العلاقات بين الكيانات."""
        relationships = []
        
        # إذا ذكر شخص ومكان معاً، أنشئ علاقة "موجود في"
        persons = [e for e in entities if e.get("type") == NodeType.PERSON]
        places = [e for e in entities if e.get("type") == NodeType.PLACE]
        
        for person in persons[:2]:
            for place in places[:2]:
                relationships.append({
                    "source": self._generate_entity_id(person),
                    "target": self._generate_entity_id(place),
                    "type": "located_at",
                    "strength": 0.4,
                })
        
        # علاقة المستخدم مع الأشخاص المذكورين
        for person in persons[:3]:
            relationships.append({
                "source": user_id,
                "target": self._generate_entity_id(person),
                "type": "knows",
                "strength": 0.6,
            })
        
        return relationships
    
    def _generate_entity_id(self, entity: Dict) -> str:
        """توليد معرف فريد للكيان."""
        raw = f"{entity.get('type', 'unknown')}:{entity.get('name', 'unnamed')}"
        import hashlib
        return hashlib.md5(raw.encode()).hexdigest()[:12]
    
    # ═══════════════════════════════════════════════════
    # دوال التحليل
    # ═══════════════════════════════════════════════════
    
    def _get_dominant_types(self, user_id: str) -> Dict[str, int]:
        """أنواع الكيانات الأكثر شيوعاً."""
        entities = self._entities.get(user_id, {})
        type_counts = defaultdict(int)
        for entity in entities.values():
            type_counts[entity.get("type", "unknown")] += 1
        return dict(type_counts)
    
    def _calculate_network_density(self, user_id: str) -> float:
        """حساب كثافة شبكة العلاقات."""
        entities = self._entities.get(user_id, {})
        relationships = self._relationships.get(user_id, [])
        n = len(entities)
        if n < 2:
            return 0.0
        max_possible = n * (n - 1) / 2
        if max_possible == 0:
            return 0.0
        return min(1.0, len(relationships) / max_possible)


# نسخة عالمية
world_model_engine = WorldModelEngine()
logger.info("✅ World Model Engine v1.0 initialized")
