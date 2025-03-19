"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '../context/auth-context';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { LayoutDashboard, ListPlus, CheckSquare, Users, ClipboardList, UserCog, FileText, ListTodo, User } from 'lucide-react';
import { useToast } from '@/app/components/ui/use-toast';

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function checkUserStatus() {
      if (!user) {
        setIsAdmin(false);
        setIsActive(true);
        return;
      }

      const supabase = createClientComponentClient();
      try {
        // First check if session is valid
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          return;
        }

        if (!session) {
          console.log('No active session');
          return;
        }

        // Try to get the user profile
        const { data: profile, error: profileError } = await supabase
          .from('intern_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        // If profile doesn't exist, create it
        if ((!profile || profileError?.code === 'PGRST116') && user.email) {
          try {
            const { data: newProfile, error: insertError } = await supabase
              .from('intern_profiles')
              .insert({
                user_id: user.id,
                email: user.email,
                first_name: user.email.split('@')[0], // Temporary name from email
                last_name: '',
                is_admin: false,
                is_active: true,
                total_points: 0,
                bio: '',
                skills: []
              })
              .select()
              .single();

            if (insertError) {
              console.error('Error creating profile:', insertError);
              toast({
                title: "Error",
                description: "Failed to create your profile. Please try again.",
                variant: "destructive",
              });
              return;
            }

            if (newProfile) {
              setIsAdmin(newProfile.is_admin || false);
              setIsActive(newProfile.is_active ?? true);
              return;
            }
          } catch (error) {
            console.error('Error in profile creation:', error);
            toast({
              title: "Error",
              description: "Failed to set up your profile. Please refresh the page.",
              variant: "destructive",
            });
            return;
          }
        }

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error checking user status:', profileError);
          return;
        }

        if (profile) {
          setIsAdmin(profile.is_admin || false);
          setIsActive(profile.is_active ?? true);

          // If user is inactive and not on the suspended page, redirect them
          if (!profile.is_active && pathname !== '/dashboard/suspended') {
            router.push('/dashboard/suspended');
          }
        }
      } catch (error) {
        console.error('Error in checkUserStatus:', error);
        // Set safe defaults if there's an error
        setIsAdmin(false);
        setIsActive(true);
      }
    }

    checkUserStatus();
  }, [user, pathname, router, toast]);

  // Base navigation items (visible to active users)
  const baseNavigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      current: pathname === "/dashboard",
    },
    {
      name: "Profile",
      href: "/dashboard/profile",
      icon: User,
      current: pathname === "/dashboard/profile",
    },
    {
      name: "Available Tasks",
      href: "/dashboard/available-tasks",
      icon: ListPlus,
      current: pathname === "/dashboard/available-tasks",
    },
    {
      name: "My Tasks",
      href: "/dashboard/tasks",
      icon: CheckSquare,
      current: pathname === "/dashboard/tasks",
    },
    {
      name: "Referrals",
      href: "/dashboard/referrals",
      icon: Users,
      current: pathname === "/dashboard/referrals",
    },
  ];

  // Admin-only navigation items
  const adminNavigation = [
    {
      name: "Manage Tasks",
      href: "/dashboard/admin/tasks",
      icon: ListTodo,
      current: pathname === "/dashboard/admin/tasks",
    },
    {
      name: "Manage Users",
      href: "/dashboard/admin/users",
      icon: UserCog,
      current: pathname === "/dashboard/admin/users",
    },
    {
      name: "Corporate Requests",
      href: "/dashboard/internship-requests",
      icon: FileText,
      current: pathname === "/dashboard/internship-requests",
    },
    {
      name: "Task Applications",
      href: "/dashboard/task-applications",
      icon: ClipboardList,
      current: pathname === "/dashboard/task-applications",
    }
  ];

  // If user is inactive, only show dashboard that redirects to suspended page
  if (!isActive) {
    return (
      <div className="h-full bg-background">
        <div className="space-y-4 py-4">
          <div className="px-3 py-2">
            <div className="space-y-1">
              <Link
                href="/dashboard/suspended"
                className={cn(
                  'flex items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-slate-100 gap-3',
                  pathname === '/dashboard/suspended' ? 'bg-slate-100' : 'transparent'
                )}
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Combine navigation items based on user role for active users
  const navigation = [...baseNavigation, ...(isAdmin ? adminNavigation : [])];

  return (
    <div className={cn("border-r bg-background overflow-y-auto", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-xl font-semibold tracking-tight">
            Dashboard
          </h2>
          <nav className="space-y-1">
            {navigation.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center px-4 py-2 text-sm font-medium rounded-lg hover:bg-accent hover:text-accent-foreground",
                  pathname === link.href ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.icon && <link.icon className="mr-2 h-4 w-4" />}
                {link.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
} 