
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from '@/components/auth/login-form';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuthStatus = async () => {
      setIsLoading(true); // Set loading true at the start of the check
      try {
        const response = await fetch('/api/auth/me', { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user && data.user.userId) {
            // User is logged in, redirect to their profile
            router.replace(`/profile/${data.user.userId}`);
            // Don't set isLoading to false here, as we are redirecting.
            // The component will unmount.
            return;
          }
        }
      } catch (error) {
        console.error('Error checking auth status on login page:', error);
        // If error, proceed to show login form
      }
      setIsLoading(false); // Set to false only if not redirecting (i.e., user needs to login)
    };

    checkAuthStatus();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20rem)]">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <Skeleton className="h-10 w-3/4 mx-auto mb-2" />
            <Skeleton className="h-6 w-1/2 mx-auto" />
          </div>
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20rem)]">
      <div className="w-full max-w-md">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">Login to Knowly</h1>
          <p className="text-muted-foreground mt-2">
            Access your account to ask, answer, and learn.
          </p>
        </header>
        <LoginForm />
      </div>
    </div>
  );
}
