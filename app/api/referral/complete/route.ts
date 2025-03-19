import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { referralCode, userId } = await request.json();
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

    // Create a referral record
    const { error: referralInsertError } = await supabase
      .from('referrals')
      .insert({
        referrer_id: referralData.user_id,
        referred_user_id: userId,
        status: 'pending',
        completed_task_count: 0,
        points_awarded: false
      });

    if (referralInsertError) {
      console.error('Error creating referral:', referralInsertError);
      return NextResponse.json(
        { error: 'Failed to create referral' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error completing referral:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 