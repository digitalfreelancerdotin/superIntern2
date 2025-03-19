'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminTaskApplicationsPage() {
  const router = useRouter();

  useEffect(() => {
    router.push('/dashboard/task-applications');
  }, []);

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    </div>
  );
} 