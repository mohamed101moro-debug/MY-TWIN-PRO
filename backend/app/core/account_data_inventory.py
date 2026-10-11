"""Canonical account-owned data inventory shared by API and operations tooling.

Schema mappings remain deliberately incomplete until a staging catalog report verifies
all tables, ownership columns, export ordering columns, and primary-key tie-breakers.
"""

# Single source of truth for account-owned data. Export metadata is populated only
# where an ordering column is explicitly configured; live schema verification is still required. Entries with
# export_key=None remain deletion-only and are an explicit export-coverage gap until
# their deployed schemas and stable ordering keys are verified.
_ACCOUNT_TABLE_ROWS = [
    ("raw_conversation_archive", "raw_conversations", "created_at"),
    ("emotional_memory", "emotional_memory", "created_at"),
    ("reflection_insights", "reflections", "last_observed"),
    ("person_nodes", "people_network", "importance_score"),
    ("identity_model", "identity", "created_at"),
    ("goals", "goals", "created_at"),
    ("user_knowledge_state", "knowledge_state", "created_at"),
    ("memory_graph_edges", "memory_graph_edges", "created_at"),
    ("episodic_memory", "episodic_memory", "created_at"),
    ("working_memory", "working_memory", "created_at"),
    ("twin_events", "twin_events", "ts"),
    ("twin_internal_states", "twin_internal_state", "updated_at"),
    ("twin_entity_identity", "entity_identity", "created_at"),
    ("lifecycle_intention_receipts", "lifecycle_receipts", "accepted_at"),
    # The current user choice is private account data and must follow export/deletion.
    ("privacy_consents", "privacy_consents", "id"),
    # These tables are already part of the deletion inventory, but are not yet
    # safe to export until their deployed schema and deterministic order column
    # are verified against the live migration/catalog inventory.
    ("identity_versions", None, None),
    ("tasks", None, None),
    ("user_knowledge", None, None),
    ("memory_summaries", None, None),
    ("twin_personalities", None, None),
    ("twin_states", None, None),
    ("twin_goals", None, None),
    ("user_goals", None, None),
    ("user_devices", None, None),
    ("user_fingerprints", None, None),
    ("daily_usage", None, None),
    ("agent_metrics", None, None),
    ("ai_metrics", None, None),
    ("business_projects", None, None),
    ("capability_passes", None, None),
    ("message_feedback", None, None),
    ("proactive_notifications", None, None),
    ("product_clicks", None, None),
    ("product_impressions", None, None),
    ("projects", None, None),
    ("purchase_history", None, None),
    ("referral_codes", None, None),
    ("referral_rewards", None, None),
    ("referral_usage", None, None),
    ("relationship_economy", None, None),
    ("relationship_memory", None, None),
    ("sync_history", None, None),
]

# Runtime views are derived from the same registry to prevent independent lists
# from silently drifting apart.
EXPORT_TABLES = {
    export_key: (table_name, order_column)
    for table_name, export_key, order_column in _ACCOUNT_TABLE_ROWS
    if export_key is not None and order_column is not None
}
DELETION_USER_TABLES = tuple(table_name for table_name, _key, _order in _ACCOUNT_TABLE_ROWS)
EXPORT_NOT_COVERED_TABLES = tuple(
    table_name for table_name, export_key, _order in _ACCOUNT_TABLE_ROWS if export_key is None
)
EXPORT_PAGE_SIZE = 500
EXPORT_MAX_RECORDS = 50_000
# Deliberately false until a staging catalog report confirms every table, owner column,
# export ordering column, primary key, and deterministic PK tie-breaker in the query.
EXPORT_SCHEMA_VERIFICATION_PASSED = False
