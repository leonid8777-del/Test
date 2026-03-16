import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  // Add noindex header for public catalog pages
  if (request.nextUrl.pathname.startsWith('/catalog/')) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  // Auth enforcement is handled at the page level when Supabase is configured.
  // In demo mode all routes are accessible.
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
