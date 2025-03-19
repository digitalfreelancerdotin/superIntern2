'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/context/auth-context';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card } from '@/app/components/ui/card';
import { useToast } from '@/app/components/ui/use-toast';
import { Switch } from '@/app/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/lib/utils";

interface User {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_admin: boolean;
  is_active: boolean;
  total_points: number;
}

interface ReactivationRequest {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  user_email: string;
  user_name: string;
  created_at: string;
}

export default function ManageUsersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [reactivationRequests, setReactivationRequests] = useState<ReactivationRequest[]>([]);

  useEffect(() => {
    if (user) {
      loadUsers();
      loadReactivationRequests();
    }
  }, [user]);

  const loadUsers = async () => {
    const supabase = createClientComponentClient();
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

      // Get all users
      const { data: users, error: usersError } = await supabase
        .from('intern_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;
      setUsers(users || []);
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadReactivationRequests = async () => {
    const supabase = createClientComponentClient();
    try {
      const { data: requests, error } = await supabase
        .from('reactivation_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReactivationRequests(requests || []);
    } catch (error: any) {
      console.error('Error loading reactivation requests:', error);
      toast({
        title: "Error",
        description: "Failed to load reactivation requests",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = (selectedUser: User) => {
    if (selectedUser.is_active) {
      // Show confirmation dialog before deactivating
      setSelectedUser(selectedUser);
      setShowDeactivateDialog(true);
    } else {
      // Reactivate without confirmation
      updateUserStatus(selectedUser, true);
    }
  };

  const updateUserStatus = async (selectedUser: User, newStatus: boolean) => {
    const supabase = createClientComponentClient();
    try {
      const { error } = await supabase
        .from('intern_profiles')
        .update({ is_active: newStatus })
        .eq('user_id', selectedUser.user_id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `User ${newStatus ? 'activated' : 'deactivated'} successfully`,
      });

      // Update local state
      setUsers(users.map(u => 
        u.user_id === selectedUser.user_id 
          ? { ...u, is_active: newStatus }
          : u
      ));

      // Close dialog if open
      setShowDeactivateDialog(false);
      setSelectedUser(null);
    } catch (error: any) {
      console.error('Error updating user status:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleReactivationRequest = async (requestId: string, approved: boolean) => {
    const supabase = createClientComponentClient();
    try {
      const request = reactivationRequests.find(r => r.id === requestId);
      if (!request) return;

      // Update request status
      const { error: requestError } = await supabase
        .from('reactivation_requests')
        .update({ 
          status: approved ? 'approved' : 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (requestError) throw requestError;

      // If approved, reactivate the user
      if (approved) {
        const { error: userError } = await supabase
          .from('intern_profiles')
          .update({ is_active: true })
          .eq('user_id', request.user_id);

        if (userError) throw userError;
      }

      toast({
        title: "Success",
        description: `Reactivation request ${approved ? 'approved' : 'rejected'}`,
      });

      // Reload data
      await Promise.all([loadUsers(), loadReactivationRequests()]);
    } catch (error: any) {
      console.error('Error handling reactivation request:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Manage Users</h1>
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
      <h1 className="text-2xl font-bold mb-6">Manage Users</h1>
      
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="requests">
            Reactivation Requests
            {reactivationRequests.filter(r => r.status === 'pending').length > 0 && (
              <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                {reactivationRequests.filter(r => r.status === 'pending').length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-medium">
                        {user.first_name} {user.last_name}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.total_points}</TableCell>
                      <TableCell>
                        <span className={user.is_admin ? 'text-blue-600' : ''}>
                          {user.is_admin ? 'Admin' : 'Intern'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={user.is_active ? 'text-green-600' : 'text-red-600'}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={user.is_active}
                          onCheckedChange={() => handleToggleActive(user)}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <Card className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reactivationRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      No reactivation requests found
                    </TableCell>
                  </TableRow>
                ) : (
                  reactivationRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        {request.user_name}
                        <br />
                        <span className="text-sm text-muted-foreground">
                          {request.user_email}
                        </span>
                      </TableCell>
                      <TableCell>{request.subject}</TableCell>
                      <TableCell className="max-w-md">
                        <div className="truncate">
                          {request.message}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "capitalize",
                          request.status === 'approved' && "text-green-600",
                          request.status === 'rejected' && "text-red-600",
                          request.status === 'pending' && "text-yellow-600"
                        )}>
                          {request.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(request.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {request.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleReactivationRequest(request.id, true)}
                              className="bg-green-600 hover:bg-green-700"
                              size="sm"
                            >
                              Approve
                            </Button>
                            <Button
                              onClick={() => handleReactivationRequest(request.id, false)}
                              variant="destructive"
                              size="sm"
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
        </TabsContent>
      </Tabs>

      <AlertDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate User Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate this user&apos;s account? They will not be able to access the system until reactivated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedUser && updateUserStatus(selectedUser, false)}
              className="bg-red-600 hover:bg-red-700"
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 