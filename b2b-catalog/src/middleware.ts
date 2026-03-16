import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const pathname = request.nextUrl.pathname;

  // Add noindex header for catalog pages
  if (pathname.startsWith('/catalog/')) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  // When Supabase is configured, enforce auth on protected routes
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your-project')) {
    // Demo mode: no auth enforcement
    return response;
  }

  // Public routes always pass through
  if (
    pathname.startsWith('/catalog/') ||
    pathname === '/login' ||
    pathname === '/'
  ) {
    return response;
  }

  // With real Supabase: check session cookie presence as lightweight guard
  const hasSession = request.cookies.getAll().some(c => c.name.startsWith('sb-'));
  if (!hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
};
