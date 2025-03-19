"use client";

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { AuthButton } from "@/app/components/auth/auth-button"
import { useAuth } from '../context/auth-context';
import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter, usePathname } from "next/navigation";
import { Award, Sun, Moon, UserCircle } from "lucide-react";
import { useTheme } from "next-themes";
import { ThemeToggle } from "@/app/components/ui/theme-toggle"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { useToast } from "@/app/components/ui/use-toast"

export function Navbar({ className }: { className?: string }) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [points, setPoints] = useState<number | null>(null);
  const supabase = createClientComponentClient();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  // Check if we're in the dashboard section
  const isDashboard = pathname?.startsWith('/dashboard');

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    async function checkAdminStatus() {
      if (user) {
        const { data, error } = await supabase
          .from('intern_profiles')
          .select('is_admin')
          .eq('user_id', user.id)
          .single();
        
        if (data && !error) {
          setIsAdmin(data.is_admin);
        }
      }
    }
    checkAdminStatus();
  }, [user]);

  useEffect(() => {
    if (user) {
      loadPoints();
    } else {
      setPoints(null);
    }
  }, [user]);

  const loadPoints = async () => {
    if (!user) {
      setPoints(null);
      return;
    }

    try {
      // First check if session is valid
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        setPoints(null);
        return;
      }

      if (!session) {
        console.log('No active session');
        setPoints(null);
        return;
      }

      // Try to get the user profile
      const { data: profile, error: profileError } = await supabase
        .from('intern_profiles')
        .select('total_points')
        .eq('user_id', user.id)
        .maybeSingle();

      // If profile doesn't exist, create it
      if (!profile && user.email) {
        const { error: insertError } = await supabase
          .from('intern_profiles')
          .insert({
            user_id: user.id,
            email: user.email,
            first_name: user.email.split('@')[0], // Temporary name from email
            last_name: '',
            total_points: 0,
            is_admin: false,
            is_active: true
          });

        if (insertError) {
          console.error('Error creating profile:', insertError);
          setPoints(0);
          return;
        }

        setPoints(0);
        return;
      }

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error loading points:', profileError);
        setPoints(null);
        return;
      }

      setPoints(profile?.total_points ?? 0);
    } catch (error) {
      console.error('Error in loadPoints:', error);
      setPoints(null);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Signed out successfully",
        description: "You have been signed out of your account.",
      });
      
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Error",
        description: "There was a problem signing out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <header className={cn("border-b bg-background h-16", className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <Link href="/">
              <div className="flex items-center gap-2">
                <span className="text-blue-500 text-2xl">⬇️</span>
                <span className="text-xl font-bold">SuperInterns</span>
              </div>
            </Link>
          </div>
          
          {/* Only show navigation items if not in dashboard */}
          {!isDashboard && (
            <div className="hidden md:flex items-center space-x-8">
              <button 
                onClick={() => scrollToSection('hero')}
                className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium"
              >
                Home
              </button>
              <button 
                onClick={() => scrollToSection('features')}
                className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium"
              >
                How does it work
              </button>
              <button 
                onClick={() => scrollToSection('leaderboard')}
                className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium"
              >
                Leaderboard
              </button>
              <button 
                onClick={() => scrollToSection('tasks')}
                className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium"
              >
                Internships
              </button>
              <button 
                onClick={() => scrollToSection('stats')}
                className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium"
              >
                Hire a Super Intern
              </button>
            </div>
          )}
          
          <div className="flex items-center gap-4">
            {isDashboard && <ThemeToggle />}
            {user && points !== null && (
              <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-full text-sm font-medium">
                <Award className="h-4 w-4 text-yellow-600" />
                <span>{points} points</span>
              </div>
            )}
            {!user && (
              <div className="flex items-center space-x-4">
                <Button variant="outline" onClick={() => router.push("/auth/login")}>
                  Sign In
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button>Sign Up</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => router.push("/auth/signup")}>
                      Candidate Sign Up
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/auth/employer/signup")}>
                      Employer Sign Up
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <UserCircle className="h-6 w-6" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
} 