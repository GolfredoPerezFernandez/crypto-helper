import { createContextId, Signal } from '@builder.io/qwik';

export interface DemoModeContextState {
  enabled: Signal<boolean>;
  toggle: () => void;
}

export const DemoModeContext = createContextId<DemoModeContextState>('knrt.demo.mode');
