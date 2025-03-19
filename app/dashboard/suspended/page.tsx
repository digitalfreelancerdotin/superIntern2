'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/auth-context';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { useToast } from '@/app/components/ui/use-toast';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Loader2 } from 'lucide-react';

export default function SuspendedPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    message: ''
  });

  // If user is not logged in, redirect to login
  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
    }
  }, [user, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/auth/login');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    const supabase = createClientComponentClient();

    try {
      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('intern_profiles')
        .select('first_name, last_name, email')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      // Submit reactivation request
      const { error: requestError } = await supabase
        .from('reactivation_requests')
        .insert({
          user_id: user.id,
          subject: formData.subject,
          message: formData.message,
          status: 'pending',
          user_email: profile.email,
          user_name: `${profile.first_name} ${profile.last_name}`
        });

      if (requestError) throw requestError;

      toast({
        title: "Request Submitted",
        description: "Your reactivation request has been submitted successfully. We'll review it as soon as possible.",
      });

      // Clear form
      setFormData({ subject: '', message: '' });
    } catch (error: any) {
      console.error('Error submitting reactivation request:', error);
      toast({
        title: "Error",
        description: "Failed to submit reactivation request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container max-w-lg mx-auto py-16">
      <Card className="p-6 space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Account Suspended</h1>
          <p className="text-muted-foreground">
            Your account has been deactivated by the administrator. Please submit a reactivation request below.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="subject" className="text-sm font-medium">
              Subject
            </label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="Request for account reactivation"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="message" className="text-sm font-medium">
              Message
            </label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Please explain why your account should be reactivated..."
              required
              rows={4}
            />
          </div>

          <div className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Submit Reactivation Request
            </Button>
            
            <Button
              variant="ghost"
              className="w-full"
              onClick={handleSignOut}
              type="button"
            >
              Sign Out
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
} 