"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useAuth } from "@/app/context/auth-context";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { useToast } from "@/app/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { Textarea } from "@/app/components/ui/textarea";

interface TaskApplication {
  id: string;
  task_id: string;
  applicant_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  notes: string | null;
  task: {
    title: string;
    points: number;
    payment_amount: number | null;
    is_paid: boolean;
  };
  applicant: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export default function TaskApplicationsPage() {
  const [applications, setApplications] = useState<TaskApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<{
    app: TaskApplication | null;
    action: 'approved' | 'rejected' | null;
  }>({ app: null, action: null });
  const [rejectionReason, setRejectionReason] = useState('');
  
  const { user } = useAuth();
  const { toast } = useToast();
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (user) {
      loadApplications();
    }
  }, [user]);

  const loadApplications = async () => {
    try {
      // First check if user is admin
      const { data: adminCheck, error: adminError } = await supabase
        .from('intern_profiles')
        .select('is_admin')
        .eq('user_id', user!.id)
        .single();

      if (adminError) throw adminError;
      if (!adminCheck?.is_admin) {
        throw new Error('Unauthorized: Admin access required');
      }

      // Get all applications with task and applicant details
      const { data: applications, error: applicationsError } = await supabase
        .from('task_applications')
        .select(`
          id,
          task_id,
          applicant_id,
          status,
          created_at,
          notes,
          task:tasks (
            title,
            points,
            payment_amount,
            is_paid
          ),
          applicant:intern_profiles (
            first_name,
            last_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (applicationsError) throw applicationsError;

      // Transform the data to match our interface
      const transformedApplications: TaskApplication[] = (applications || []).map(app => ({
        id: app.id as string,
        task_id: app.task_id as string,
        applicant_id: app.applicant_id as string,
        status: app.status as TaskApplication['status'],
        created_at: app.created_at as string,
        notes: app.notes as string | null,
        task: {
          title: (app.task as any)?.title || '',
          points: (app.task as any)?.points || 0,
          payment_amount: (app.task as any)?.payment_amount || null,
          is_paid: (app.task as any)?.is_paid || false
        },
        applicant: {
          first_name: (app.applicant as any)?.first_name || '',
          last_name: (app.applicant as any)?.last_name || '',
          email: (app.applicant as any)?.email || ''
        }
      }));

      setApplications(transformedApplications);
    } catch (error) {
      console.error('Error loading applications:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load applications",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplicationUpdate = async (applicationId: string, status: 'approved' | 'rejected', notes?: string) => {
    try {
      const { error } = await supabase
        .from('task_applications')
        .update({ 
          status,
          notes: notes || null
        })
        .eq('id', applicationId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Application ${status}`,
      });

      // Reset states
      setSelectedApp({ app: null, action: null });
      setRejectionReason('');

      // Reload applications to get updated data
      await loadApplications();
    } catch (error) {
      console.error('Error updating application:', error);
      toast({
        title: "Error",
        description: "Failed to update application",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Task Applications</h1>
        <Card className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Task Applications</h1>
      
      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Applicant</TableHead>
              <TableHead>Points</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Applied At</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4">
                  No task applications found
                </TableCell>
              </TableRow>
            ) : (
              applications.map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="font-medium">{app.task.title}</TableCell>
                  <TableCell>
                    {app.applicant.first_name} {app.applicant.last_name}
                    <br />
                    <span className="text-sm text-gray-500">{app.applicant.email}</span>
                  </TableCell>
                  <TableCell>{app.task.points}</TableCell>
                  <TableCell>
                    {app.task.is_paid ? `$${app.task.payment_amount}` : 'No payment'}
                  </TableCell>
                  <TableCell>
                    {new Date(app.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <span className={`capitalize ${
                      app.status === 'approved' ? 'text-green-600' :
                      app.status === 'rejected' ? 'text-red-600' :
                      'text-yellow-600'
                    }`}>
                      {app.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    {app.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setSelectedApp({ app, action: 'approved' })}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Approve
                        </Button>
                        <Button
                          onClick={() => setSelectedApp({ app, action: 'rejected' })}
                          variant="destructive"
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <AlertDialog 
        open={selectedApp.app !== null} 
        onOpenChange={() => setSelectedApp({ app: null, action: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedApp.action === 'approved' ? 'Approve Application' : 'Reject Application'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedApp.action === 'approved' 
                ? 'Are you sure you want to approve this application?' 
                : 'Please provide a reason for rejection:'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {selectedApp.action === 'rejected' && (
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="mt-4"
            />
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedApp.app && selectedApp.action) {
                  handleApplicationUpdate(
                    selectedApp.app.id,
                    selectedApp.action,
                    selectedApp.action === 'rejected' ? rejectionReason : undefined
                  );
                }
              }}
              className={selectedApp.action === 'approved' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {selectedApp.action === 'approved' ? 'Approve' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 