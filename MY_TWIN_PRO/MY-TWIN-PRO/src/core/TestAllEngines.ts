export async function testAllEngines() {
  const results: Record<string, string> = {};
  
  try {
    const { presenceEngine } = await import('../../engine/presence/PresenceEngine');
    presenceEngine.startPresenceLoop();
    results.presence = '✅';
  } catch(e: any) {
    results.presence = '❌ ' + (e?.message || 'unknown');
  }
  
  try {
    const { existenceLoop } = await import('../core/ExistenceLoop');
    existenceLoop.start();
    results.existence = '✅';
  } catch(e: any) {
    results.existence = '❌ ' + (e?.message || 'unknown');
  }
  
  try {
    const { devicePresenceEngine } = await import('../../engine/device/DevicePresenceEngine');
    devicePresenceEngine.start();
    results.device = '✅';
  } catch(e: any) {
    results.device = '❌ ' + (e?.message || 'unknown');
  }
  
  try {
    const { sensorBridge } = await import('../core/SensorBridge');
    sensorBridge.start();
    results.sensor = '✅';
  } catch(e: any) {
    results.sensor = '❌ ' + (e?.message || 'unknown');
  }
  
  try {
    const { lifeRhythmEngine } = await import('../../engine/life/LifeRhythmEngine');
    lifeRhythmEngine.start();
    results.lifeRhythm = '✅';
  } catch(e: any) {
    results.lifeRhythm = '❌ ' + (e?.message || 'unknown');
  }
  
  try {
    const { dreamEngine } = await import('../../engine/life/DreamEngine');
    dreamEngine.start();
    results.dream = '✅';
  } catch(e: any) {
    results.dream = '❌ ' + (e?.message || 'unknown');
  }
  
  try {
    const { surpriseEngine } = await import('../../engine/life/SurpriseEngine');
    surpriseEngine.start();
    results.surprise = '✅';
  } catch(e: any) {
    results.surprise = '❌ ' + (e?.message || 'unknown');
  }
  
  console.log('🧬 Engine Test Results:', JSON.stringify(results, null, 2));
  return results;
}
