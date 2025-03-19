import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  console.log('AuthCallback: Starting callback processing');

  if (!code) {
    console.error('AuthCallback: No code provided');
    return NextResponse.redirect(`${requestUrl.origin}/auth/login?error=No code provided`);
  }

  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Exchange code for session
    const { data: { session, user }, error: authError } = await supabase.auth.exchangeCodeForSession(code);

    if (authError || !user) {
      console.error('AuthCallback: Auth error:', authError);
      return NextResponse.redirect(`${requestUrl.origin}/auth/login?error=Authentication failed: ${authError?.message || 'Unknown error'}`);
    }

    console.log('AuthCallback: Successfully authenticated user', { userId: user.id });

    // Check if profile already exists and get user type
    const { data: profile, error: profileError } = await supabase
      .from('intern_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('AuthCallback: Error checking profile:', profileError);
      return NextResponse.redirect(`${requestUrl.origin}/auth/login?error=Profile check failed`);
    }

    // Set auth cookie and session
    if (session) {
      await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token
      });

      // Verify session was set
      const { data: { session: verifySession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !verifySession) {
        console.error('AuthCallback: Session verification failed:', sessionError);
        return NextResponse.redirect(`${requestUrl.origin}/auth/login?error=Session verification failed`);
      }

      console.log('AuthCallback: Session verified successfully');
    }

    // Redirect based on profile type
    if (profile) {
      console.log('AuthCallback: Profile exists, redirecting to dashboard');
      return NextResponse.redirect(
        new URL(`/dashboard/${profile.is_customer ? 'employer' : 'intern'}`, requestUrl.origin)
      );
    } else {
      // If no profile exists, redirect to signup
      console.log('AuthCallback: No profile exists, redirecting to signup');
      return NextResponse.redirect(
        new URL('/auth/signup', requestUrl.origin)
      );
    }

  } catch (err) {
    console.error('AuthCallback: Unexpected error:', err);
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
    return NextResponse.redirect(
      `${requestUrl.origin}/auth/login?error=${encodeURIComponent(errorMessage)}`
    );
  }
}

function generateReferralCode(): string {
  // Generate a random 8-character code with timestamp to ensure uniqueness
  const timestamp = Date.now().toString(36).substring(0, 2);
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${random}${timestamp}`;
} 