'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Navbar } from "@/app/components/Navbar";
import { Sidebar } from "../components/Sidebar";
import { useAuth } from '../context/auth-context';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  useEffect(() => {
    async function checkUserStatus() {
      if (!user) return;

      // Don't check if already on suspended page
      if (pathname === '/dashboard/suspended') return;

      const supabase = createClientComponentClient();
      try {
        const { data: profile, error } = await supabase
          .from('intern_profiles')
          .select('is_active')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error checking user status:', error);
          return;
        }

        // If user is not active and not already on suspended page, redirect to suspended page
        if (profile && !profile.is_active) {
          router.push('/dashboard/suspended');
        }
      } catch (error) {
        console.error('Error in checkUserStatus:', error);
      }
    }

    checkUserStatus();
  }, [user, pathname, router]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar className="fixed top-0 left-0 right-0 z-50" />
      <div className="flex pt-16">
        <Sidebar className="w-64 fixed left-0 top-16 bottom-0" />
        <div className="pl-64 w-full">
          <main className="container mx-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
} 