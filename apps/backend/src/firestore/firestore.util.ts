function toLowercaseMessage(error: unknown): string {
  if (!error) {
    return '';
  }

  if (error instanceof Error) {
    return error.message.toLowerCase();
  }

  if (typeof error === 'string') {
    return error.toLowerCase();
  }

  if (typeof error === 'object' && error !== null) {
    return (String((error as Record<string, unknown>).message) || '').toLowerCase();
  }

  return '';
}

export function isMissingIndexError(error: unknown): boolean {
  const message = toLowercaseMessage(error);
  const code = typeof (error as Record<string, unknown>)?.code === 'string'
    ? ((error as Record<string, unknown>).code as string)
    : undefined;

  return (
    code === 'failed-precondition' ||
    message.includes('requires an index') ||
    message.includes('index is not ready') ||
    (message.includes('index') && message.includes('missing'))
  );
}

