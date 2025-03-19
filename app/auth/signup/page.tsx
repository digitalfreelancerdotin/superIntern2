"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
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

export default function SignUpPage() {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleGoogleSignUp = async () => {
    try {
      setIsGoogleLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          redirectTo: `${window.location.origin}/auth/callback?isEmployer=false`,
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error("Google sign up error:", error);
      toast({
        title: "Error",
        description: "Failed to sign up with Google.",
        variant: "destructive",
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="container flex items-center justify-center min-h-screen py-12">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Candidate Sign Up</CardTitle>
          <CardDescription>
            Create your candidate account with Google
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button
              onClick={handleGoogleSignUp}
              className="w-full"
              disabled={isGoogleLoading}
            >
              {isGoogleLoading ? "Signing up..." : "Sign up with Google"}
            </Button>
            <div className="text-center text-sm">
              Already have an account?{" "}
              <a href="/auth/login" className="text-primary hover:underline">
                Sign in
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}