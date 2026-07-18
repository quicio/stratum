import type { Provenance } from './provenance.js';
import type { PerformanceAxis } from './types.js';

export interface MusicalSignature {
  readonly scale: {
    readonly name: Provenance<string>;
    readonly root_pitch_class: Provenance<number>;
  };
  readonly genre: {
    readonly name: Provenance<string>;
  };
  readonly mood: {
    readonly name: Provenance<string>;
  };
  readonly performance: {
    readonly tempo: Provenance<number>;
    readonly energy: Provenance<number>;
    readonly complexity: Provenance<number>;
    readonly groove: Provenance<number>;
  };
}

export type { PerformanceAxis };
