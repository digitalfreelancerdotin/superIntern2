import Papa from 'papaparse';

export interface TaskImportData {
  title: string;
  description: string;
  points: number;
  deadline: string;
  required_skills: string[];
  max_applicants: number;
}

export const TASK_TEMPLATE_HEADERS = [
  'Title',
  'Description',
  'Points',
  'Deadline (YYYY-MM-DD)',
  'Required Skills (comma separated)',
  'Maximum Applicants'
];

export const SAMPLE_TASK_DATA = [
  'Frontend Development Task',
  'Create a responsive navigation menu using React and Tailwind CSS',
  '100',
  '2024-12-31',
  'React, TypeScript, Tailwind CSS',
  '3'
];

export function generateCSVContent(): string {
  return Papa.unparse({
    fields: TASK_TEMPLATE_HEADERS,
    data: [SAMPLE_TASK_DATA]
  });
}

export function parseCSVFile(file: File): Promise<TaskImportData[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<Record<string, string>>) => {
        try {
          const tasks = results.data.map((row) => ({
            title: row['Title'],
            description: row['Description'],
            points: parseInt(row['Points'], 10),
            deadline: row['Deadline (YYYY-MM-DD)'],
            required_skills: row['Required Skills (comma separated)']
              .split(',')
              .map((skill: string) => skill.trim()),
            max_applicants: parseInt(row['Maximum Applicants'], 10)
          }));
          resolve(tasks);
        } catch (error) {
          reject(new Error('Failed to parse CSV file. Please check the format.'));
        }
      },
      error: (error: Error) => {
        reject(error);
      }
    });
  });
}

export function validateTaskData(task: TaskImportData): string[] {
  const errors: string[] = [];

  if (!task.title) errors.push('Title is required');
  if (!task.description) errors.push('Description is required');
  if (isNaN(task.points) || task.points < 0) errors.push('Points must be a positive number');
  if (!task.deadline || !/^\d{4}-\d{2}-\d{2}$/.test(task.deadline)) {
    errors.push('Deadline must be in YYYY-MM-DD format');
  }
  if (!Array.isArray(task.required_skills) || task.required_skills.length === 0) {
    errors.push('At least one required skill must be specified');
  }
  if (isNaN(task.max_applicants) || task.max_applicants < 1) {
    errors.push('Maximum applicants must be at least 1');
  }

  return errors;
} 