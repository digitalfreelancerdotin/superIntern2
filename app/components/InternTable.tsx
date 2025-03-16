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
    loadInterns();
  }, []);

  const loadInterns = async () => {
    try {
      console.log('Starting to load interns...');
      
      // Simplified query to match our schema
      const { data: internProfiles, error: profileError } = await supabase
        .from('intern_profiles')
        .select('*')
        .eq('is_admin', false)
        .order('total_points', { ascending: false });

      if (profileError) {
        console.error('Error fetching intern profiles:', profileError);
        setInterns([]);
        return;
      }

      if (!internProfiles) {
        console.log('No intern profiles found');
        setInterns([]);
        return;
      }

      console.log('Fetched intern profiles:', internProfiles);
      setInterns(internProfiles);
    } catch (error) {
      console.error('Error in loadInterns:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      setInterns([]);
    } finally {
      setLoading(false);
    }
  };

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
