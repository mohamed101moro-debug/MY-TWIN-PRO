import { StateBus } from './StateBus';

export class CrashReporting {
  static captureException(error: Error, context?: any) {
    const state = StateBus.getState();
    const report = {
      error: error.message,
      stack: error.stack,
      device: {
        runtime: state.interfaceState,
        presence: state.presenceLevel,
        memory: state.memory,
        workspace: state.workspace,
      },
      timestamp: new Date().toISOString(),
    };
    
    // لا نرسل أي محادثات أو بيانات شخصية
    console.error('[CrashReport]', report);
    
    // هنا يتم إرسال التقرير إلى خدمة مثل Sentry
  }
}
