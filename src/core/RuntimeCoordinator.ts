/**
 * RuntimeCoordinator — App Lifecycle Bridge
 * Connects React Native AppState to TwinRuntime.
 * Handles foreground/background transitions.
 * Manages engine registration order and dependencies.
 */

import { AppState, AppStateStatus } from 'react-native';
import { TwinRuntime, TwinEngine } from './TwinRuntime';
import { StateBus } from './StateBus';
import { EventBus } from './EventBus';

// ── Coordinator Configuration ────────────────────────
export interface CoordinatorConfig {
  autoManageAppState: boolean;
  engineRegistrationOrder: string[]; // engines registered in this order
  debugMode: boolean;
}

const DEFAULT_CONFIG: CoordinatorConfig = {
  autoManageAppState: true,
  engineRegistrationOrder: [],
  debugMode: __DEV__,
};

// ── RuntimeCoordinator Implementation ────────────────
export class RuntimeCoordinator {
  private runtime: TwinRuntime;
  private config: CoordinatorConfig;
  private appStateSubscription: any = null;
  private registeredEngines: Map<string, TwinEngine> = new Map();
  private isInitialized = false;

  constructor(runtime: TwinRuntime, config: Partial<CoordinatorConfig> = {}) {
    this.runtime = runtime;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the coordinator. Sets up app state listeners.
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if (this.config.debugMode) {
      console.log('[RuntimeCoordinator] Initializing...');
    }

    // Set up AppState listener
    if (this.config.autoManageAppState) {
      this.appStateSubscription = AppState.addEventListener(
        'change',
        this.handleAppStateChange.bind(this),
      );
    }

    // Start the runtime
    await this.runtime.start();

    this.isInitialized = true;

    if (this.config.debugMode) {
      console.log('[RuntimeCoordinator] ✅ Initialized. Runtime is alive.');
    }
  }

  /**
   * Register an engine with ordering support.
   */
  async registerEngine(engine: TwinEngine): Promise<void> {
    this.registeredEngines.set(engine.name, engine);
    await this.runtime.registerEngine(engine);
  }

  /**
   * Register multiple engines in specified order.
   */
  async registerEngines(engines: TwinEngine[]): Promise<void> {
    // Sort engines according to configured order
    const order = this.config.engineRegistrationOrder;
    const sorted = [...engines].sort((a, b) => {
      const indexA = order.indexOf(a.name);
      const indexB = order.indexOf(b.name);
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    for (const engine of sorted) {
      await this.registerEngine(engine);
    }
  }

  /**
   * Get the runtime instance.
   */
  getRuntime(): TwinRuntime {
    return this.runtime;
  }

  /**
   * Get the StateBus for UI reading.
   */
  getStateBus() {
    return StateBus;
  }

  /**
   * Get the EventBus for event communication.
   */
  getEventBus() {
    return EventBus;
  }

  /**
   * Clean up all resources.
   */
  destroy(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    this.runtime.stop();
    this.isInitialized = false;

    if (this.config.debugMode) {
      console.log('[RuntimeCoordinator] Destroyed.');
    }
  }

  // ── Private ──────────────────────────────────────

  private handleAppStateChange(nextAppState: AppStateStatus): void {
    if (this.config.debugMode) {
      console.log(`[RuntimeCoordinator] AppState → ${nextAppState}`);
    }

    switch (nextAppState) {
      case 'active':
        // App is in foreground and interactive
        if (this.runtime.getStatus() === 'paused') {
          this.runtime.resume();
        } else if (this.runtime.getStatus() !== 'running') {
          this.runtime.start();
        }
        break;

      case 'inactive':
        // App is transitioning (call incoming, etc.)
        // Keep running but note the transition
        break;

      case 'background':
        // App is in background
        if (this.runtime.getStatus() === 'running') {
          this.runtime.pause();
        }
        break;

      default:
        break;
    }
  }
}

// ── Export Factory ───────────────────────────────────
export function createCoordinator(
  runtime: TwinRuntime,
  config?: Partial<CoordinatorConfig>,
): RuntimeCoordinator {
  return new RuntimeCoordinator(runtime, config);
}
