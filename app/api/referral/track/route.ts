import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { referralCode } = await request.json();
    const supabase = createRouteHandlerClient({ cookies });

    // Get the referrer's user ID from the referral code
    const { data: referralData, error: referralError } = await supabase
      .from('referral_codes')
      .select('user_id')
      .eq('code', referralCode)
      .single();

    if (referralError || !referralData) {
      console.error('Invalid referral code:', referralError);
      return NextResponse.json(
        { error: 'Invalid referral code' },
        { status: 400 }
      );
    }

    // Track the visit in analytics (you can implement this later)
    // For now, we'll just return success
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking referral:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 