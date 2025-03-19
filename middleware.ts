import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define routes that don't require authentication
const publicRoutes = [
  '/',
  '/auth/login',
  '/auth/callback',
  '/auth/reset-password',
];

// Define routes that are always accessible regardless of auth status
const alwaysAccessibleRoutes = [
  '/api/',
  '/_next/',
  '/favicon.ico',
  '/fonts/',
  '/images/',
];

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });

  // Refresh session if expired - required for Server Components
  await supabase.auth.getSession();

  // Check auth status
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If user is not logged in and trying to access protected routes
  if (!session && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If user is logged in, check if they're active
  if (session && request.nextUrl.pathname.startsWith('/dashboard')) {
    const { data: profile } = await supabase
      .from('intern_profiles')
      .select('is_active')
      .eq('user_id', session.user.id)
      .single();

    // If user is inactive and not trying to access the suspended page, redirect them
    if (profile && !profile.is_active && request.nextUrl.pathname !== '/dashboard/suspended') {
      return NextResponse.redirect(new URL('/dashboard/suspended', request.url));
    }
  }

  return res;
}

// Specify which routes should be handled by the middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}; 