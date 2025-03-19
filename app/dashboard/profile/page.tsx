'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/context/auth-context';
import { getInternProfile, createOrUpdateInternProfile, uploadResume } from '@/app/lib/user-profile';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { useToast } from '@/app/components/ui/use-toast';
import { Card } from '@/app/components/ui/card';
import { Loader2 } from 'lucide-react';
import SkillsSection from '@/app/components/skills/SkillsSection';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import VideoProfile from '@/app/components/video-profile/VideoProfile';

interface InternProfile {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
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

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<InternProfile | null>(null);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const data = await getInternProfile(user.id);
      if (data) {
        // Ensure required fields have default values
        const profileData: InternProfile = {
          user_id: data.user_id,
          email: data.email,
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          phone_number: data.phone_number || '',
          github_url: data.github_url,
          resume_url: data.resume_url,
          location: data.location,
          university: data.university,
          major: data.major,
          graduation_year: data.graduation_year,
          is_admin: data.is_admin,
          is_active: data.is_active,
          total_points: data.total_points,
          bio: data.bio,
          skills: data.skills,
          dream_role: data.dream_role,
        };
        setProfile(profileData);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !user) return;

    // Validate required fields
    if (!profile.first_name.trim() || !profile.last_name.trim() || !profile.phone_number.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields: First Name, Last Name, and Phone Number.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await createOrUpdateInternProfile({
        ...profile,
        user_id: user.id,
      });
      
      toast({
        title: "Success",
        description: "Profile updated successfully.",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    const allowedTypes = ['.pdf', '.doc', '.docx'];
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(fileExt)) {
      toast({
        title: "Error",
        description: "Please upload a PDF, DOC, or DOCX file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      toast({
        title: "Error",
        description: "File size must be less than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const resumeUrl = await uploadResume(user.id, file);
      setProfile(prev => prev ? { ...prev, resume_url: resumeUrl } : null);
      toast({
        title: "Success",
        description: "Resume uploaded successfully.",
      });
    } catch (error) {
      console.error('Error uploading resume:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload resume. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset the file input
      e.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto py-8">
        <Card className="p-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Profile Not Found</h2>
            <p className="text-gray-600 mb-4">We couldn't load your profile. Please try refreshing the page.</p>
            <Button onClick={loadProfile}>
              Retry Loading Profile
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl py-6">
      <h1 className="text-3xl font-bold mb-8">Profile Settings</h1>
      <Tabs defaultValue="general">
        <TabsList className="mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="video">Video Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="text-sm text-muted-foreground mb-4">Fields marked with * are required</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="first_name" className="flex items-center gap-1">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="first_name"
                    value={profile.first_name || ''}
                    onChange={e => setProfile(prev => prev ? { ...prev, first_name: e.target.value } : null)}
                    placeholder="Enter your first name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="last_name" className="flex items-center gap-1">
                    Last Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="last_name"
                    value={profile.last_name || ''}
                    onChange={e => setProfile(prev => prev ? { ...prev, last_name: e.target.value } : null)}
                    placeholder="Enter your last name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="flex items-center gap-1">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    value={profile.email || ''}
                    disabled
                    type="email"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone_number" className="flex items-center gap-1">
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phone_number"
                    value={profile.phone_number || ''}
                    onChange={e => setProfile(prev => prev ? { ...prev, phone_number: e.target.value } : null)}
                    placeholder="Enter your phone number"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="github_url">GitHub URL</Label>
                  <Input
                    id="github_url"
                    value={profile.github_url || ''}
                    onChange={e => setProfile(prev => prev ? { ...prev, github_url: e.target.value } : null)}
                    placeholder="Enter your GitHub profile URL"
                    type="url"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={profile.location || ''}
                    onChange={e => setProfile(prev => prev ? { ...prev, location: e.target.value } : null)}
                    placeholder="Enter your location"
                  />
                </div>
                <div>
                  <Label htmlFor="university">University</Label>
                  <Input
                    id="university"
                    value={profile.university || ''}
                    onChange={e => setProfile(prev => prev ? { ...prev, university: e.target.value } : null)}
                    placeholder="Enter your university"
                  />
                </div>
                <div>
                  <Label htmlFor="major">Major</Label>
                  <Input
                    id="major"
                    value={profile.major || ''}
                    onChange={e => setProfile(prev => prev ? { ...prev, major: e.target.value } : null)}
                    placeholder="Enter your major"
                  />
                </div>
                <div>
                  <Label htmlFor="graduation_year">Graduation Year</Label>
                  <Input
                    id="graduation_year"
                    value={profile.graduation_year || ''}
                    onChange={e => setProfile(prev => prev ? { ...prev, graduation_year: e.target.value } : null)}
                    placeholder="Enter your graduation year"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="dream_role">Dream Role</Label>
                  <Input
                    id="dream_role"
                    value={profile.dream_role || ''}
                    onChange={e => setProfile(prev => prev ? { ...prev, dream_role: e.target.value } : null)}
                    placeholder="Ex: React developer with AWS exposure"
                  />
                  <span className="text-sm text-muted-foreground mt-1">Describe your dream role in one or two lines</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="resume">Resume (PDF, DOC, or DOCX, max 5MB)</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="resume"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleResumeUpload}
                      disabled={uploading}
                    />
                    {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                  </div>
                  {profile.resume_url && (
                    <a
                      href={profile.resume_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-500 hover:underline mt-2 inline-block"
                    >
                      View Current Resume
                    </a>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="skills">
          <Card className="p-6">
            {user && <SkillsSection userId={user.id} />}
          </Card>
        </TabsContent>

        <TabsContent value="video">
          <Card className="p-6">
            {user && <VideoProfile userId={user.id} />}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 