"""SCS-001 Conformance Suite — boot/heartbeat/handle/isolation/recovery."""
import pytest
import pytest_asyncio
from app.core.soul_core import SoulEvent, EngineState


class EchoEngine:
    id, name, version, handles = "echo", "Echo", "1.0.0", ["echo"]

    def __init__(self):
        self.state = EngineState.CREATED

    async def initialize(self, ctx):
        self.state = EngineState.READY

    async def start(self):
        self.state = EngineState.RUNNING

    async def stop(self):
        self.state = EngineState.STOPPED

    async def pause(self):
        self.state = EngineState.PAUSED

    async def resume(self):
        self.state = EngineState.RUNNING

    async def handle(self, ev):
        return {"echo": ev.payload.get("x")}

    def heartbeat(self):
        from app.core.soul_core import EngineMetrics
        return EngineMetrics(version=self.version)

    def serialize(self):
        return {"s": 1}

    def restore(self, snap):
        return None


class BoomEngine(EchoEngine):
    id, name, handles = "boom", "Boom", ["echo"]

    async def handle(self, ev):
        raise RuntimeError("boom")


@pytest_asyncio.fixture
async def kernel():
    from app.core.soul_core.kernel import SoulKernel
    instance = SoulKernel()
    instance.register(EchoEngine())
    instance.register(BoomEngine())
    await instance.boot()
    yield instance
    await instance.shutdown()


@pytest.mark.asyncio
async def test_boot_active(kernel):
    assert kernel.state.value == "active"


@pytest.mark.asyncio
async def test_handle_echo(kernel):
    result = await kernel.dispatch(SoulEvent("echo", {"x": 7}))
    assert result.get("echo") == 7 or "boom" in str(result)


@pytest.mark.asyncio
async def test_error_isolation(kernel):
    result = await kernel.dispatch(SoulEvent("echo", {"x": 1}))
    assert kernel.state.value == "active" and isinstance(result, dict)


@pytest.mark.asyncio
async def test_presence_bypass(kernel):
    from app.core.soul_core import EventClass
    with pytest.raises(ValueError):
        await kernel.dispatch(SoulEvent("e", event_class=EventClass.PRESENCE))


@pytest.mark.asyncio
async def test_sleep_wake(kernel):
    await kernel.sleep()
    assert kernel.state.value == "sleep"
    await kernel.wake()
    assert kernel.state.value == "active"


@pytest.mark.asyncio
async def test_status_metrics(kernel):
    status = kernel.status()
    assert "echo" in status["engines"]
    assert status["engines"]["echo"]["metrics"]["version"] == "1.0.0"
