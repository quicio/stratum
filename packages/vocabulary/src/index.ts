export { ScaleSchema, GenreSchema, MoodSchema } from './domain/types.js';
export type { Scale, Genre, Mood, PerformanceAxis } from './domain/types.js';

export type { Provenance, ProvenanceSource } from './domain/provenance.js';
export { isUser, isResolver, isBaseline } from './domain/provenance.js';

export type { MusicalSignature } from './domain/musical-signature.js';

export { VocabularyRepository } from './repository/vocabulary-repository.js';
export { VocabularyLoadError } from './repository/errors.js';
export type { VocabularyIssue, VocabularyIssueKind } from './repository/errors.js';

export { SignatureFactory, ResolutionError } from './factory/signature-factory.js';
export type {
  DirectComposition,
  IntentComposition,
  ResolutionResult,
  ResolutionWarning,
  IntentResolver,
} from './factory/signature-factory.js';
