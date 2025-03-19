import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Debug logging for environment variables
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key:', supabaseAnonKey?.substring(0, 10) + '...');

if (!supabaseUrl) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}
if (!supabaseAnonKey) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

console.log('Initializing Supabase client with URL:', supabaseUrl);

// Create the main client for general operations
export const supabase = createClientComponentClient({
  supabaseUrl: supabaseUrl,
  supabaseKey: supabaseAnonKey,
});

// Storage bucket for resumes
export const RESUMES_BUCKET = 'resumes';

// Validate connection to database
export const validateConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('intern_profiles')
      .select('user_id')
      .limit(1);

    if (error) {
      console.error('Database connection error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error validating connection:', error);
    return false;
  }
};

// Initialize storage bucket
export const initStorage = async () => {
  try {
    // Validate connection first
    const isConnected = await validateConnection();
    if (!isConnected) {
      throw new Error('Cannot initialize storage: Database connection failed');
    }

    // First check if bucket exists
    const { data: buckets, error: listError } = await supabase
      .storage
      .listBuckets();

    if (listError) {
      console.error('Error listing buckets:', {
        message: listError.message,
        name: listError.name
      });
      throw new Error(`Failed to list buckets: ${listError.message}`);
    }

    const bucketExists = buckets?.some(bucket => bucket.name === RESUMES_BUCKET);

    if (!bucketExists) {
      console.log('Creating new resumes bucket...');
      const { data, error } = await supabase.storage.createBucket(RESUMES_BUCKET, {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      });
      
      if (error) {
        console.error('Error creating bucket:', {
          message: error.message,
          name: error.name
        });
        throw new Error(`Failed to create bucket: ${error.message}`);
      }

      console.log('Created resumes bucket:', data);
    } else {
      console.log('Resumes bucket already exists');
    }

    // Update bucket settings even if it exists
    console.log('Updating bucket settings...');
    const { error: updateError } = await supabase.storage.updateBucket(RESUMES_BUCKET, {
      public: true,
      fileSizeLimit: 10485760,
      allowedMimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    });

    if (updateError) {
      console.error('Error updating bucket settings:', {
        message: updateError.message,
        name: updateError.name
      });
      throw new Error(`Failed to update bucket settings: ${updateError.message}`);
    }

    // Verify bucket access
    console.log('Verifying bucket access...');
    const { error: accessError } = await supabase
      .storage
      .from(RESUMES_BUCKET)
      .list();

    if (accessError) {
      console.error('Error verifying bucket access:', {
        message: accessError.message,
        name: accessError.name
      });
      throw new Error(`Failed to verify bucket access: ${accessError.message}`);
    }

    console.log('Storage initialization completed successfully');
    return true;

  } catch (error) {
    console.error('Error in initStorage:', {
      error,
      errorType: error instanceof Error ? 'Error' : typeof error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
};

// Initialize storage on client creation
initStorage().catch(error => {
  console.error('Failed to initialize storage:', error);
});

// Get a client with the user's auth session
export const getSupabaseClient = async () => {
  try {
    console.log('Getting Supabase client with auth session...');
    
    // Check if environment variables are properly set
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase credentials in environment variables');
      throw new Error('Missing Supabase credentials. Please check your environment variables.');
    }
    
    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Error getting session:', sessionError);
      throw new Error(`Authentication error: ${sessionError.message}`);
    }
    
    console.log('Session retrieved:', session ? 'exists' : 'null');
    
    if (!session) {
      console.warn('No active session found. User is not authenticated.');
      // Return the regular client, but operations will be subject to RLS
      return supabase;
    }
    
    // Log the user ID for debugging
    console.log('Authenticated user ID:', session.user.id);
    console.log('User ID type:', typeof session.user.id);
    
    // Return the client with the session
    return supabase;
  } catch (error) {
    console.error('Error in getSupabaseClient:', error);
    throw error;
  }
};

export const createClient = () => {
  return createClientComponentClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}; 