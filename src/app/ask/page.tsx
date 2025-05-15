
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import QuestionForm from '@/components/question/question-form';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state
import { useToast } from '@/hooks/use-toast';

export default function AskQuestionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user && data.user.userId) {
            setIsAuthenticated(true);
          } else {
            // Not authenticated or error in response, redirect to login
            toast({
              title: 'Authentication Required',
              description: 'Please log in to ask a question.',
              variant: 'default', // Changed from 'destructive'
            });
            router.replace('/login');
            return; // Stop further execution in this path
          }
        } else {
           // Network error or non-200 response, assume not authenticated
          toast({
            title: 'Authentication Failed',
            description: 'Could not verify your session. Please log in.',
            variant: 'destructive',
          });
          router.replace('/login');
          return;
        }
      } catch (error) {
        console.error('Error checking auth status on ask page:', error);
        toast({
          title: 'Authentication Error',
          description: 'An error occurred. Please try logging in again.',
          variant: 'destructive',
        });
        router.replace('/login');
        return;
      }
      setIsLoading(false); // Only set to false if authenticated and not redirecting
    };

    checkAuthStatus();
  }, [router, toast]);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto">
        <header className="mb-8">
          <Skeleton className="h-10 w-3/4 mb-2" />
          <Skeleton className="h-6 w-1/2" />
        </header>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // This case should ideally not be reached if redirects work,
    // but as a fallback, don't render the form.
    // The redirect should happen in useEffect.
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-primary">Ask a Public Question</h1>
        <p className="text-muted-foreground mt-2">
          Share your challenge with the community. Be specific and imagine you’re asking a question to another person.
        </p>
      </header>
      <QuestionForm />
    </div>
  );
}
