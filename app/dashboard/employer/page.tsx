"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { useToast } from "@/app/components/ui/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Textarea } from "@/app/components/ui/textarea";

interface Intern {
  id: string;
  email: string;
  resume_url?: string;
  skills?: string[];
  status?: string;
}

export default function EmployerDashboard() {
  const [jobDescription, setJobDescription] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<Intern[]>([]);
  const [customerType, setCustomerType] = useState<string>("freemium");
  const { toast } = useToast();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchCustomerType = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("intern_profiles")
          .select("customer_type")
          .eq("user_id", user.id)
          .single();
        
        if (profile) {
          setCustomerType(profile.customer_type);
        }
      }
    };

    fetchCustomerType();
  }, []);

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      // Store the search query
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      await supabase.from("job_searches").insert([
        {
          customer_id: user.id,
          search_query: jobDescription,
        },
      ]);

      // For now, we'll do a simple search (you'll implement OpenAI matching later)
      const { data: interns, error } = await supabase
        .from("intern_profiles")
        .select("*")
        .eq("is_customer", false)
        .limit(getSearchLimit());

      if (error) throw error;

      setResults(interns);
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Error",
        description: "Failed to search for interns. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const getSearchLimit = () => {
    switch (customerType) {
      case "premium_plus":
        return 10;
      case "premium":
        return 5;
      case "pro":
        return 3;
      default:
        return 1;
    }
  };

  const handleInternSelection = async (intern: Intern, status: 'selected' | 'rejected') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      await supabase.from("candidate_selections").insert([
        {
          customer_id: user.id,
          intern_id: intern.id,
          status,
          onboard_date: status === 'selected' ? new Date().toISOString() : null,
        },
      ]);

      toast({
        title: "Success",
        description: `Intern ${status} successfully.`,
      });

      // Refresh results
      setResults(results.filter(r => r.id !== intern.id));
    } catch (error) {
      console.error("Selection error:", error);
      toast({
        title: "Error",
        description: "Failed to update intern status. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Find Interns</CardTitle>
          <CardDescription>
            Enter a job description to find matching interns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Textarea
              placeholder="Enter job description and requirements..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="min-h-[100px]"
            />
            <Button
              onClick={handleSearch}
              disabled={isSearching || !jobDescription.trim()}
            >
              {isSearching ? "Searching..." : "Find Interns"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {results.map((intern) => (
            <Card key={intern.id}>
              <CardHeader>
                <CardTitle>{intern.email}</CardTitle>
                <CardDescription>
                  {intern.skills?.join(", ") || "No skills listed"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-2">
                  {intern.resume_url && (
                    <Button
                      variant="outline"
                      onClick={() => window.open(intern.resume_url, "_blank")}
                    >
                      View Resume
                    </Button>
                  )}
                  <Button
                    variant="default"
                    onClick={() => handleInternSelection(intern, "selected")}
                  >
                    Select
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleInternSelection(intern, "rejected")}
                  >
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No results found. Try adjusting your search criteria.
          </CardContent>
        </Card>
      )}
    </div>
  );
} 