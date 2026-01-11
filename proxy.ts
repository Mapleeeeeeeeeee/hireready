import createMiddleware from 'next-intl/middleware';
import { NextRequest } from 'next/server';
import { routing } from './lib/i18n/routing';

const handleI18nRouting = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  return handleI18nRouting(request);
}

export const config = {
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
};
