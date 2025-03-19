'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '@/app/context/auth-context';
import { Button } from '@/app/components/ui/button';
import { useToast } from '@/app/components/ui/use-toast';
import { Card } from '@/app/components/ui/card';
import { Twitter, Facebook, Linkedin, MessageCircle, Copy, Users } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";

interface ReferralStats {
  totalVisits: number;
  successfulJoins: number;
  pointsEarned: number;
}

interface ReferralCode {
  code: string;
  created_at: string;
}

interface ReferralData {
  id: string;
  status: string;
  created_at: string;
  points_awarded: boolean;
  completed_task_count: number;
  referred_user: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

interface ReferredUser {
  id: string;
  status: string;
  created_at: string;
  points_awarded: boolean;
  completed_task_count: number;
  intern: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export default function ReferralsPage() {
  const [referralCode, setReferralCode] = useState<ReferralCode | null>(null);
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([]);
  const [stats, setStats] = useState<ReferralStats>({
    totalVisits: 0,
    successfulJoins: 0,
    pointsEarned: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClientComponentClient();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
    loadReferralData();
    }
  }, [user]);

  const loadReferralData = async () => {
    if (!user) return;

    try {
      // Load referral code
      const { data: codeData, error: codeError } = await supabase
        .from('referral_codes')
        .select('code, created_at')
        .eq('user_id', user.id)
        .single();

      if (codeError && codeError.code !== 'PGRST116') {
        throw codeError;
      }

      setReferralCode(codeData);

      // Load referred users with their details
      const { data: referralsData, error: referralsError } = await supabase
        .from('referral_details')
        .select('*')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });

      if (referralsError) throw referralsError;
      
      // Transform the data to match the ReferredUser interface
      const transformedData: ReferredUser[] = (referralsData || []).map(data => ({
        id: data.id,
        status: data.status,
        created_at: data.created_at,
        points_awarded: data.points_awarded,
        completed_task_count: data.completed_task_count,
        intern: {
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          email: data.email || ''
        }
      }));

      setReferredUsers(transformedData);

      // Calculate stats
      const stats = {
        totalVisits: 0, // This would need a separate tracking system
        successfulJoins: (referralsData || []).filter(r => r.status === 'completed').length,
        pointsEarned: (referralsData || []).filter(r => r.points_awarded).length * Number(process.env.NEXT_PUBLIC_REFERRAL_POINTS || 10)
      };

      setStats(stats);
    } catch (error) {
      console.error('Error loading referral data:', error);
      toast({
        title: "Error",
        description: "Failed to load referral data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateReferralCode = async () => {
    if (!user) return;

    try {
      // Generate a random code
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();

      const { data, error } = await supabase
        .from('referral_codes')
        .insert([{ user_id: user.id, code }])
        .select('code, created_at')
        .single();

      if (error) throw error;
      
      setReferralCode(data);
      toast({
        title: "Success",
        description: "Referral code generated successfully!",
      });
    } catch (error) {
      console.error('Error generating referral code:', error);
      toast({
        title: "Error",
        description: "Failed to generate referral code. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getReferralLink = () => {
    if (!referralCode) return '';
    return `${window.location.origin}/auth/signup?ref=${referralCode.code}`;
  };

  const copyReferralLink = async () => {
    const link = getReferralLink();
    try {
      await navigator.clipboard.writeText(link);
      toast({
        title: "Success",
        description: "Referral link copied to clipboard!",
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast({
        title: "Error",
        description: "Failed to copy link. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Referrals Dashboard</h1>
        <div className="grid gap-6">
          <Card className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Referrals Dashboard</h1>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-blue-100 rounded-full">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalVisits}</p>
              <p className="text-sm text-gray-500">People who clicked your link</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-green-100 rounded-full">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.successfulJoins}</p>
              <p className="text-sm text-gray-500">People who signed up</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-purple-100 rounded-full">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pointsEarned}</p>
              <p className="text-sm text-gray-500">{Number(process.env.NEXT_PUBLIC_REFERRAL_POINTS || 10)} points per successful referral</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Share Your Link</h2>
          {referralCode ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={getReferralLink()}
                  readOnly
                  className="flex-1 p-2 border rounded bg-gray-50"
                />
                <Button onClick={copyReferralLink} variant="outline" size="icon">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent("Join me as an intern! Use my referral link:")}&url=${encodeURIComponent(getReferralLink())}`, '_blank')}
                >
                  <Twitter className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getReferralLink())}`, '_blank')}
                >
                  <Facebook className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getReferralLink())}`, '_blank')}
                >
                  <Linkedin className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Join me as an intern! Use my referral link: ${getReferralLink()}`)}`, '_blank')}
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-gray-500 mb-4">You don't have a referral code yet</p>
              <Button onClick={generateReferralCode}>Generate Referral Code</Button>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Your Referral Code</h2>
          {referralCode ? (
            <div className="text-center">
              <p className="text-3xl font-bold mb-2">{referralCode.code}</p>
              <p className="text-sm text-gray-500">Share this code with your friends</p>
            </div>
          ) : (
            <div className="text-center text-gray-500">
              Generate a referral code to start sharing
            </div>
          )}
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Referred Users</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tasks Completed</TableHead>
              <TableHead>Points Awarded</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {referredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                  No users referred yet
                </TableCell>
              </TableRow>
            ) : (
              referredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    {user.intern.first_name} {user.intern.last_name}
                  </TableCell>
                  <TableCell>{user.intern.email}</TableCell>
                  <TableCell>
                    <span className={`capitalize ${
                      user.status === 'completed' ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {user.status}
                    </span>
                  </TableCell>
                  <TableCell>{user.completed_task_count}</TableCell>
                  <TableCell>
                    {user.points_awarded ? (
                      <span className="text-green-600">Yes</span>
                    ) : (
                      <span className="text-yellow-600">Pending</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
} 