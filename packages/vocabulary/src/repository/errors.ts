export type VocabularyIssueKind =
  | 'parse'
  | 'schema'
  | 'filename'
  | 'missing-dir'
  | 'missing-file';

export interface VocabularyIssue {
  filePath: string;
  kind: VocabularyIssueKind;
  message: string;
}

export class VocabularyLoadError extends Error {
  public readonly rootDir: string;
  public readonly issues: readonly VocabularyIssue[];

  constructor(rootDir: string, issues: readonly VocabularyIssue[]) {
    if (issues.length === 0) {
      throw new Error('VocabularyLoadError requires at least one issue');
    }
    super(
      `Vocabulary load failed for ${rootDir}: ${issues.length} ${issues.length === 1 ? 'issue' : 'issues'} - ${issues.map(i => `${i.kind}:${i.filePath}`).join(', ')}`,
    );
    this.name = 'VocabularyLoadError';
    this.rootDir = rootDir;
    this.issues = issues;
  }
}
