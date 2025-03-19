"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { useToast } from "@/app/components/ui/use-toast";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user }, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (user) {
        await handleUserRedirect(user.id);
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Error",
        description: "Invalid email or password.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error("Google sign in error:", error);
      toast({
        title: "Error",
        description: "Failed to sign in with Google.",
        variant: "destructive",
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleUserRedirect = async (userId: string) => {
    // Check if user is employer or candidate
    const { data: profile } = await supabase
      .from("intern_profiles")
      .select("is_customer")
      .eq("user_id", userId)
      .single();

    if (profile?.is_customer) {
      router.push("/dashboard/employer");
    } else {
      router.push("/dashboard/intern");
    }
  };

  return (
    <div className="container flex items-center justify-center min-h-screen py-12">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Welcome Back</CardTitle>
          <CardDescription>
            Sign in to your account using Google
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button
              onClick={handleGoogleSignIn}
              className="w-full"
              disabled={isGoogleLoading}
            >
              {isGoogleLoading ? "Signing in..." : "Sign in with Google"}
            </Button>
            <div className="text-center text-sm space-y-2">
              <p>
                Don't have an account?{" "}
                <a href="/auth/signup" className="text-primary hover:underline">
                  Sign up as Candidate
                </a>
              </p>
              <p>
                Want to hire interns?{" "}
                <a href="/auth/employer/signup" className="text-primary hover:underline">
                  Sign up as Employer
                </a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}