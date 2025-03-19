import { supabase, RESUMES_BUCKET, validateConnection } from './supabase';
import { PostgrestError } from '@supabase/supabase-js';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface InternProfile {
  user_id: string;
  email: string;
  first_name: string;  // Required
  last_name: string;   // Required
  phone_number: string; // Required
  github_url?: string;
  resume_url?: string;
  location?: string;
  university?: string;
  major?: string;
  graduation_year?: string;
  is_admin?: boolean;
  is_active?: boolean;
  total_points?: number;
  bio?: string;
  skills?: string[];
  dream_role?: string;
}

// Helper function to get the Supabase client
async function getSupabaseClient() {
  try {
    console.log('Getting Supabase client...');
    
    // Check if environment variables are set
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase credentials in environment variables', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseAnonKey
      });
      throw new Error('Missing Supabase credentials. Please check your environment variables.');
    }
    
    // Validate connection with detailed error handling
    try {
      const isConnected = await validateConnection();
      
      if (!isConnected) {
        console.error('Supabase connection validation failed in getSupabaseClient');
        throw new Error('Database connection failed. Please check your Supabase configuration and connection.');
      }
    } catch (validationError) {
      console.error('Error during connection validation:', validationError);
      throw new Error(`Database connection validation error: ${validationError instanceof Error ? validationError.message : 'Unknown error'}`);
    }
    
    return supabase;
  } catch (error) {
    console.error('Error in getSupabaseClient:', error);
    throw new Error(`Failed to initialize database connection: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getInternProfile(userId: string): Promise<InternProfile | null> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  const supabase = createClientComponentClient();
  
  try {
    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) throw sessionError;
    if (!session) throw new Error('No active session');

    // Try to get the user profile
    const { data: profile, error: profileError } = await supabase
      .from('intern_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      throw profileError;
    }

    // If profile doesn't exist, create it
    if (!profile) {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user?.email) {
        throw new Error('User email not found');
      }

      // Get name from email (e.g., "john.doe@example.com" -> "John" "Doe")
      const emailName = userData.user.email.split('@')[0];
      const names = emailName.split(/[._-]/);
      const firstName = names[0] ? names[0].charAt(0).toUpperCase() + names[0].slice(1) : '';
      const lastName = names[1] ? names[1].charAt(0).toUpperCase() + names[1].slice(1) : '';

      const newProfile: InternProfile = {
        user_id: userId,
        email: userData.user.email,
        first_name: firstName || 'New',  // Default required fields
        last_name: lastName || 'User',
        phone_number: '',  // Required but empty, user must fill this
        is_admin: false,
        is_active: true,
        total_points: 0,
        bio: '',
        skills: [],
        github_url: '',
        location: '',
        university: '',
        major: '',
        graduation_year: '',
        dream_role: ''
      };

      const { data: createdProfile, error: createError } = await supabase
        .from('intern_profiles')
        .insert([newProfile])
        .select()
        .single();

      if (createError) throw createError;
      return createdProfile;
    }

    return profile;
  } catch (error) {
    console.error('Error in getInternProfile:', error);
    throw error;
  }
}

export async function createOrUpdateInternProfile(profile: Partial<InternProfile>): Promise<void> {
  if (!profile.user_id) {
    throw new Error('User ID is required');
  }

  // Validate required fields
  if (profile.first_name !== undefined && !profile.first_name.trim()) {
    throw new Error('First name is required');
  }
  if (profile.last_name !== undefined && !profile.last_name.trim()) {
    throw new Error('Last name is required');
  }
  if (profile.phone_number !== undefined && !profile.phone_number.trim()) {
    throw new Error('Phone number is required');
  }

  const supabase = createClientComponentClient();
  
  try {
    // Get current profile data
    const { data: existingProfile, error: fetchError } = await supabase
      .from('intern_profiles')
      .select('*')
      .eq('user_id', profile.user_id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    // Validate that required fields exist in either existing profile or update
    const mergedProfile = {
      ...existingProfile,
      ...profile,
      updated_at: new Date().toISOString()
    };

    if (!mergedProfile.first_name?.trim()) {
      throw new Error('First name is required');
    }
    if (!mergedProfile.last_name?.trim()) {
      throw new Error('Last name is required');
    }
    if (!mergedProfile.phone_number?.trim()) {
      throw new Error('Phone number is required');
    }

    const { error: updateError } = await supabase
      .from('intern_profiles')
      .upsert(mergedProfile)
      .eq('user_id', profile.user_id);

    if (updateError) throw updateError;
  } catch (error) {
    console.error('Error in createOrUpdateInternProfile:', error);
    throw error;
  }
}

export async function uploadResume(userId: string, file: File): Promise<string> {
  if (!userId || !file) {
    throw new Error('User ID and file are required');
  }

  const supabase = createClientComponentClient();

  try {
    // Create a unique file path
    const timestamp = new Date().getTime();
    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/${timestamp}.${fileExt}`;

    // First check if the bucket exists and is accessible
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Error checking buckets:', bucketsError);
      throw new Error('Unable to access storage. Please try again later.');
    }

    const resumesBucket = buckets.find(b => b.name === 'resumes');
    if (!resumesBucket) {
      console.error('Resumes bucket not found');
      // Try to create the bucket
      const { error: createError } = await supabase.storage.createBucket('resumes', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      });

      if (createError) {
        console.error('Error creating bucket:', createError);
        throw new Error('Resume storage is not properly configured. Please contact support.');
      }
    }

    // Upload file
    const { error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      if (uploadError.message.includes('bucket') || uploadError.message.includes('not found')) {
        throw new Error('Resume storage is not properly configured. Please contact support.');
      }
      throw uploadError;
    }

    // Get public URL
    const { data } = supabase.storage
      .from('resumes')
      .getPublicUrl(filePath);

    if (!data.publicUrl) {
      throw new Error('Failed to get public URL');
    }

    // Update profile with resume URL
    await createOrUpdateInternProfile({
      user_id: userId,
      resume_url: data.publicUrl
    });

    return data.publicUrl;
  } catch (error) {
    console.error('Error in uploadResume:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to upload resume: ${error.message}`);
    }
    throw new Error('Failed to upload resume. Please try again.');
  }
} 