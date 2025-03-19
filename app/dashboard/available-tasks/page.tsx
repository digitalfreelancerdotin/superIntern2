'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../context/auth-context';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useToast } from '../../components/ui/use-toast';
import { Loader2, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip";

interface Task {
  id: string;
  title: string;
  description: string;
  points: number;
  is_paid: boolean;
  payment_amount: number | null;
  status: string;
  created_at: string;
  updated_at: string;
  assigned_to: string | null;
  created_by: string;
  application_status?: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string | null;
}

export default function AvailableTasksPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingToTask, setApplyingToTask] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadAvailableTasks();
    }
  }, [user]);

  const loadAvailableTasks = async () => {
    if (!user) return;

    const supabase = createClientComponentClient();
    try {
      // First, get all available tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .is('assigned_to', null)
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      // Then, get all applications by the current user
      const { data: applications, error: applicationsError } = await supabase
        .from('task_applications')
        .select('task_id, status, notes')
        .eq('applicant_id', user.id);

      if (applicationsError) throw applicationsError;

      // Create a map of task applications
      const applicationMap = new Map(
        applications?.map(app => [
          app.task_id,
          { status: app.status, notes: app.notes }
        ]) || []
      );

      // Mark tasks with application status and rejection reason
      const tasksWithApplicationStatus = tasksData?.map(task => ({
        ...task,
        application_status: applicationMap.get(task.id)?.status,
        rejection_reason: applicationMap.get(task.id)?.notes
      })) || [];

      setTasks(tasksWithApplicationStatus);
    } catch (error: any) {
      console.error('Error loading available tasks:', error);
      toast({
        title: "Error loading tasks",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applyForTask = async (taskId: string) => {
    if (!user) return;

    setApplyingToTask(taskId);
    const supabase = createClientComponentClient();

    try {
      // Check if already applied
      const { data: existingApplication, error: checkError } = await supabase
        .from('task_applications')
        .select('id, status')
        .eq('task_id', taskId)
        .eq('applicant_id', user.id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingApplication) {
        toast({
          title: "Already applied",
          description: "You have already applied for this task.",
          variant: "default",
        });
        return;
      }

      // Create a task application
      const { error: applicationError } = await supabase
        .from('task_applications')
        .insert({
          task_id: taskId,
          applicant_id: user.id,
          status: 'pending'
        });

      if (applicationError) throw applicationError;

      toast({
        title: "Application submitted",
        description: "Your application has been submitted successfully.",
      });

      // Refresh the task list
      await loadAvailableTasks();
    } catch (error: any) {
      console.error('Error applying for task:', error);
      toast({
        title: "Error applying for task",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setApplyingToTask(null);
    }
  };

  const getApplicationStatus = (task: Task) => {
    if (!task.application_status) return null;

    switch (task.application_status) {
      case 'pending':
        return {
          text: 'Applied',
          variant: 'secondary' as const,
          showReason: false
        };
      case 'approved':
        return {
          text: 'Approved',
          variant: 'default' as const,
          showReason: false
        };
      case 'rejected':
        return {
          text: 'Rejected',
          variant: 'destructive' as const,
          showReason: true
        };
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Available Tasks</h1>
      </div>

      <div className="grid gap-6">
        {tasks.length === 0 ? (
          <Card className="p-6">
            <p className="text-center text-muted-foreground">No available tasks at the moment.</p>
          </Card>
        ) : (
          tasks.map((task) => {
            const applicationStatus = getApplicationStatus(task);
            return (
              <Card key={task.id} className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">{task.title}</h3>
                    <p className="text-muted-foreground">{task.description}</p>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium">Points: {task.points}</span>
                      {task.is_paid && (
                        <span className="text-sm font-medium text-green-600">
                          Payment: ${task.payment_amount}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {applicationStatus?.showReason && task.rejection_reason && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Reason: {task.rejection_reason}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    <Button
                      onClick={() => applyForTask(task.id)}
                      disabled={applyingToTask === task.id || !!applicationStatus}
                      variant={applicationStatus?.variant || "default"}
                    >
                      {applyingToTask === task.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Applying...
                        </>
                      ) : applicationStatus?.text || 'Apply'}
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </div>
    </div>
  );
} 