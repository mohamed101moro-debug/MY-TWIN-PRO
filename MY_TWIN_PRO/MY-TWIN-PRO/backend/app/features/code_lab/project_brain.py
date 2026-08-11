"""
PROJECT BRAIN v3.0 – ذاكرة المشروع (Code Lab)
================================================
- Architecture Evolution Tree
- Decision Log (لماذا اخترنا X لا Y)
- Codebase Map (كل ملف وعلاقاته)
"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class ProjectBrain:
    def __init__(self):
        self.memory_client = None

    async def initialize_project(self, project_id: str, idea: str, stack: Dict, user_id: str) -> Dict:
        if self.memory_client:
            try:
                await self.memory_client.store_entity("code_project", project_id, {
                    "idea": idea, "stack": stack, "user_id": user_id,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "decisions": [], "files": [],
                })
            except Exception as e:
                logger.warning(f"Project init failed: {e}")
        return {"project_id": project_id, "status": "initialized"}

    async def log_decision(self, project_id: str, decision: str, rationale: str, alternatives: List[str] = None) -> Dict:
        entry = {"decision": decision, "rationale": rationale, "alternatives": alternatives or [],
                 "timestamp": datetime.now(timezone.utc).isoformat()}
        if self.memory_client:
            try:
                await self.memory_client.append_to_entity("code_project", project_id, "decisions", entry)
            except: pass
        return entry

    async def index_file(self, project_id: str, file_path: str, content: str, dependencies: List[str] = None) -> Dict:
        file_data = {"path": file_path, "dependencies": dependencies or [], "size": len(content),
                     "last_modified": datetime.now(timezone.utc).isoformat()}
        if self.memory_client:
            try:
                await self.memory_client.append_to_entity("code_project", project_id, "files", file_data)
            except: pass
        return {"indexed": file_path}

    async def get_project_context(self, project_id: str) -> Dict:
        if self.memory_client:
            try:
                data = await self.memory_client.get_entity("code_project", project_id)
                if data: return data
            except: pass
        return {"project_id": project_id, "error": "Not found"}


project_brain = ProjectBrain()
