'use client'

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Database } from "@/lib/database.types"

interface InternProfile {
  id: string
  first_name: string
  last_name: string
  total_points: number
  tasks_completed: number
  created_at: string
}

export function InternTable() {
  const [interns, setInterns] = useState<InternProfile[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    checkAuthAndLoadInterns();
  }, []);

  const checkAuthAndLoadInterns = async () => {
    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError) {
        console.error('Auth error:', authError);
        return;
      }

      console.log('Auth state:', session ? 'Authenticated' : 'Not authenticated');
      
      if (!session) {
        console.log('No active session, loading public data only');
      }

      await loadInterns();
    } catch (error) {
      console.error('Error checking auth state:', error);
      setLoading(false);
    }
  };

  const loadInterns = async () => {
    try {
      console.log('Starting to load interns...');
      
      // Get all intern profiles
      const { data: internProfiles, error: profileError } = await supabase
        .from('intern_profiles')
        .select(`
          id,
          first_name,
          last_name,
          total_points,
          created_at
        `)
        .eq('is_admin', false)
        .order('total_points', { ascending: false })
        .order('created_at', { ascending: true });

      if (profileError) {
        console.error('Error fetching intern profiles:', profileError);
        throw profileError;
      }

      console.log('Fetched intern profiles:', internProfiles);

      // Get completed tasks count for each intern
      if (internProfiles) {
        const internsWithTasks = await Promise.all(
          internProfiles.map(async (profile) => {
            try {
              const { count, error: taskError } = await supabase
                .from('task_applications')
                .select('*', { count: 'exact', head: true })
                .eq('intern_id', profile.id)
                .eq('status', 'completed');

              if (taskError) {
                console.error(`Error fetching tasks for intern ${profile.id}:`, taskError);
                return {
                  id: profile.id,
                  first_name: profile.first_name,
                  last_name: profile.last_name,
                  total_points: profile.total_points || 0,
                  tasks_completed: 0,
                  created_at: profile.created_at
                };
              }

              return {
                id: profile.id,
                first_name: profile.first_name,
                last_name: profile.last_name,
                total_points: profile.total_points || 0,
                tasks_completed: count || 0,
                created_at: profile.created_at
              };
            } catch (err) {
              console.error(`Error processing intern ${profile.id}:`, err);
              return {
                id: profile.id,
                first_name: profile.first_name,
                last_name: profile.last_name,
                total_points: profile.total_points || 0,
                tasks_completed: 0,
                created_at: profile.created_at
              };
            }
          })
        );
        console.log('Processed interns with tasks:', internsWithTasks);
        setInterns(internsWithTasks);
      } else {
        console.log('No intern profiles found');
        setInterns([]);
      }
    } catch (error) {
      console.error('Error in loadInterns:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      setInterns([]);
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      <Card>
        <CardContent className="p-6">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left pb-4">Name</th>
                <th className="text-left pb-4">Tasks Completed</th>
                <th className="text-left pb-4">Total Points</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    </div>
                  </td>
                </tr>
              ) : interns.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-gray-500">
                    No interns found
                  </td>
                </tr>
              ) : (
                interns.map((intern) => (
                  <tr key={intern.id} className="border-b">
                    <td className="py-4">{`${intern.first_name} ${intern.last_name}`}</td>
                    <td className="py-4">{intern.tasks_completed}</td>
                    <td className="py-4">{intern.total_points}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
