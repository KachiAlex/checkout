// Request parsing helpers for Supabase Edge Functions

export async function parseRequestBody<T = any>(req: Request): Promise<T | null> {
  try {
    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return null;
    }

    const text = await req.text();
    if (!text) {
      return null;
    }

    return JSON.parse(text) as T;
  } catch (error) {
    console.error('Error parsing request body:', error);
    return null;
  }
}

export function getQueryParams(req: Request): URLSearchParams {
  const url = new URL(req.url);
  return url.searchParams;
}

export function getPathParams(path: string, pattern: string): Record<string, string> {
  const pathParts = path.split('/').filter(Boolean);
  const patternParts = pattern.split('/').filter(Boolean);

  const params: Record<string, string> = {};

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    if (patternPart.startsWith(':')) {
      const paramName = patternPart.slice(1);
      params[paramName] = pathParts[i] || '';
    }
  }

  return params;
}

