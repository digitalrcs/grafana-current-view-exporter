export class ExportAbortedError extends Error {
  constructor() {
    super('Export cancelled.');
    this.name = 'AbortError';
  }
}

export function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw signal.reason instanceof Error ? signal.reason : new ExportAbortedError();
  }
}
