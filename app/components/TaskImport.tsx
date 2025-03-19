import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Download, Upload } from 'lucide-react';
import { generateCSVContent, parseCSVFile, validateTaskData } from '@/app/lib/csvUtils';
import { createBulkTasks } from '@/app/lib/tasks';
import { useAuth } from '@/app/context/auth-context';

export default function TaskImport() {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const downloadTemplate = () => {
    const csvContent = generateCSVContent();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'task_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'You must be logged in to import tasks',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      const tasks = await parseCSVFile(file);
      
      // Validate all tasks before uploading
      const allErrors: { task: number; errors: string[] }[] = [];
      tasks.forEach((task, index) => {
        const errors = validateTaskData(task);
        if (errors.length > 0) {
          allErrors.push({ task: index + 1, errors });
        }
      });

      if (allErrors.length > 0) {
        const errorMessage = allErrors
          .map(({ task, errors }) => `Task ${task}: ${errors.join(', ')}`)
          .join('\n');
        throw new Error(`Validation failed:\n${errorMessage}`);
      }

      // Upload tasks to Supabase
      const tasksWithCreator = tasks.map(task => ({
        ...task,
        created_by: user.id,
        status: 'open',
        is_paid: false // Default to unpaid tasks for bulk import
      }));

      const createdTasks = await createBulkTasks(tasksWithCreator);

      toast({
        title: 'Success',
        description: `Successfully imported ${createdTasks.length} tasks`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to import tasks',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      event.target.value = ''; // Reset file input
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Tasks</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Button
            onClick={downloadTemplate}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <Download className="mr-2 h-4 w-4" />
            Download Template
          </Button>
          <div className="relative w-full sm:w-auto">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
              id="task-import"
            />
            <Button
              asChild
              variant="default"
              className="w-full sm:w-auto"
              disabled={isUploading}
            >
              <label htmlFor="task-import" className="cursor-pointer">
                <Upload className="mr-2 h-4 w-4" />
                {isUploading ? 'Uploading...' : 'Upload Tasks'}
              </label>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
