from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BRIDGE = ROOT / "src/core/LifeIntentionBridge.ts"


def test_queue_never_evicted_on_capacity():
    text = BRIDGE.read_text()
    assert "const MAX_QUEUE = 256" in text
    assert "queue.length >= MAX_QUEUE" in text
    assert "lifecycle_queue_capacity_exceeded" in text
    assert "queue.slice(-MAX_QUEUE)" not in text


def test_storage_failures_are_not_silently_converted_to_empty_queue():
    text = BRIDGE.read_text()
    assert "JSON.parse(raw)" in text
    assert "lifecycle_queue_corrupt" in text
    assert "await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue))" in text
    assert "catch {}" not in text


def test_backend_ack_is_required_before_queue_removal():
    text = BRIDGE.read_text()
    send_block = text.split("private async send", 1)[1].split("private applyAuthoritativeResponse", 1)[0]
    assert "return 'accepted'" in send_block
    flush = text.split("async flush(): Promise<void>", 1)[1]
    assert "result === 'accepted' || result === 'discard'" in flush
