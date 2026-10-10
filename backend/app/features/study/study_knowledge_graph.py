"""
DYNAMIC STUDY KNOWLEDGE GRAPH v2.0 – رسم معرفي ديناميكي خاص بكل طالب
"""
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("study_knowledge_graph")

class StudyKnowledgeGraph:
    def __init__(self):
        self.global_graph: Dict[str, Dict] = {}
        self.user_graphs: Dict[str, Dict] = {}
        self.memory_client = None
        self._init_default_concepts()

    def _init_default_concepts(self):
        concepts = [
            ("numbers", "الأعداد", "رياضيات", [], "easy"),
            ("addition", "الجمع", "رياضيات", ["numbers"], "easy"),
            ("multiplication", "الضرب", "رياضيات", ["addition"], "medium"),
            ("algebra", "الجبر", "رياضيات", ["multiplication"], "hard"),
        ]
        for c in concepts:
            self.add_concept(*c)

    def add_concept(self, concept_id, name, subject, prerequisites=None, difficulty="medium"):
        self.global_graph[concept_id] = {
            "id": concept_id, "name": name, "subject": subject,
            "prerequisites": prerequisites or [], "dependents": [],
            "difficulty": difficulty
        }
        for prereq_id in (prerequisites or []):
            if prereq_id in self.global_graph:
                if concept_id not in self.global_graph[prereq_id]["dependents"]:
                    self.global_graph[prereq_id]["dependents"].append(concept_id)

    async def get_user_learning_path(self, user_id: str, concept_id: str) -> List[str]:
        """مسار تعلم ديناميكي خاص بالطالب (يراعي نقاط ضعفه)"""
        if self.memory_client:
            try:
                user_graph = await self.memory_client.get_entity("user_knowledge_graph", user_id)
                if user_graph:
                    path = self._calculate_path(concept_id, user_graph.get("mastered", []))
                    return path if path else [concept_id]
            except: pass
        return self._calculate_path(concept_id, [])
    
    def _calculate_path(self, target: str, mastered: List[str]) -> List[str]:
        if target not in self.global_graph:
            return [target]
        path, visited = [], set()
        def dfs(cid):
            if cid in visited or cid in mastered: return
            visited.add(cid)
            for prereq in self.global_graph.get(cid, {}).get("prerequisites", []):
                dfs(prereq)
            if cid not in mastered:
                path.append(cid)
        dfs(target)
        return path

    async def mark_as_mastered(self, user_id: str, concept_id: str):
        if self.memory_client:
            try:
                graph = await self.memory_client.get_entity("user_knowledge_graph", user_id) or {"mastered": []}
                if concept_id not in graph["mastered"]:
                    graph["mastered"].append(concept_id)
                await self.memory_client.store_entity("user_knowledge_graph", user_id, graph)
            except: pass


knowledge_graph = StudyKnowledgeGraph()
