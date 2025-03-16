'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { useToast } from '@/app/components/ui/use-toast';
import { Card } from '@/app/components/ui/card';
import { useAuth } from '@/app/context/auth-context';

interface Profile {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  github_url: string | null;
  resume_url: string | null;
  location: string | null;
  university: string | null;
  major: string | null;
  graduation_year: string | null;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClientComponentClient();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    try {
      if (!user) return;

      const { data, error } = await supabase
        .from('intern_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error in loadProfile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('intern_profiles')
        .update({
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone_number: profile.phone_number,
          github_url: profile.github_url,
          location: profile.location,
          university: profile.university,
          major: profile.major,
          graduation_year: profile.graduation_year,
        })
        .eq('user_id', profile.user_id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: keyof Profile, value: string) => {
    if (profile) {
      setProfile({ ...profile, [field]: value });
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!profile) {
    return <div className="p-8">Profile not found</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="p-6">
        <h1 className="text-2xl font-bold mb-6">Profile Settings</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                disabled
                className="bg-muted text-muted-foreground"
              />
            </div>

            <div>
              <label htmlFor="firstName" className="block text-sm font-medium mb-1">
                First Name
              </label>
              <Input
                id="firstName"
                type="text"
                value={profile.first_name || ''}
                onChange={(e) => handleChange('first_name', e.target.value)}
                placeholder="Enter your first name"
              />
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium mb-1">
                Last Name
              </label>
              <Input
                id="lastName"
                type="text"
                value={profile.last_name || ''}
                onChange={(e) => handleChange('last_name', e.target.value)}
                placeholder="Enter your last name"
              />
            </div>

            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium mb-1">
                Phone Number
              </label>
              <Input
                id="phoneNumber"
                type="tel"
                value={profile.phone_number || ''}
                onChange={(e) => handleChange('phone_number', e.target.value)}
                placeholder="Enter your phone number"
              />
            </div>

            <div>
              <label htmlFor="githubUrl" className="block text-sm font-medium mb-1">
                GitHub URL
              </label>
              <Input
                id="githubUrl"
                type="url"
                value={profile.github_url || ''}
                onChange={(e) => handleChange('github_url', e.target.value)}
                placeholder="Enter your GitHub profile URL"
              />
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium mb-1">
                Location
              </label>
              <Input
                id="location"
                type="text"
                value={profile.location || ''}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="Enter your location"
              />
            </div>

            <div>
              <label htmlFor="university" className="block text-sm font-medium mb-1">
                University
              </label>
              <Input
                id="university"
                type="text"
                value={profile.university || ''}
                onChange={(e) => handleChange('university', e.target.value)}
                placeholder="Enter your university"
              />
            </div>

            <div>
              <label htmlFor="major" className="block text-sm font-medium mb-1">
                Major
              </label>
              <Input
                id="major"
                type="text"
                value={profile.major || ''}
                onChange={(e) => handleChange('major', e.target.value)}
                placeholder="Enter your major"
              />
            </div>

            <div>
              <label htmlFor="graduationYear" className="block text-sm font-medium mb-1">
                Graduation Year
              </label>
              <Input
                id="graduationYear"
                type="text"
                value={profile.graduation_year || ''}
                onChange={(e) => handleChange('graduation_year', e.target.value)}
                placeholder="Enter your graduation year"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
} 