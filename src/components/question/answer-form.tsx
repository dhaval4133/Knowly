
'use client';

import { useState, type FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogIn } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface AnswerFormProps {
  questionId: string;
}

interface CurrentUser {
  userId: string;
  userName: string;
}

export default function AnswerForm({ questionId }: AnswerFormProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const fetchUserSession = async () => {
      setIsLoadingUser(true);
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            setCurrentUser(data.user);
          } else {
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
        }
      } catch (error) {
        console.error("Error fetching user session for AnswerForm:", error);
        setCurrentUser(null);
      } finally {
        setIsLoadingUser(false);
      }
    };

    fetchUserSession();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast({
        title: "Authentication Required",
        description: "Please log in to post an answer.",
        variant: "destructive",
      });
      router.push('/login');
      return;
    }

    if (!content.trim()) {
      toast({
        title: "Empty Answer",
        description: "Please write your answer before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/answers/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, content }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: "Answer Submitted!",
          description: data.message || "Your answer has been posted.",
        });
        setContent('');
        router.refresh(); // Revalidate data on the current page to show the new answer
      } else {
        toast({
          title: "Submission Failed",
          description: data.message || "Could not post your answer. Please log in if you haven't.",
          variant: "destructive",
        });
         if (response.status === 401 && !data.success) { // Unauthorized
            router.push('/login');
        }
      }
    } catch (error) {
      console.error("Error submitting answer:", error);
      toast({
        title: "Submission Error",
        description: "An unexpected error occurred while submitting your answer.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingUser) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <Skeleton className="h-6 w-1/3 mb-2" />
           <Skeleton className="h-4 w-2/3" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
        <CardFooter>
          <Skeleton className="h-10 w-36" />
        </CardFooter>
      </Card>
    );
  }

  if (!currentUser) {
    return (
      <Card className="shadow-md text-center">
        <CardHeader>
          <CardTitle className="text-xl">Want to share your knowledge?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Please log in to post your answer and help the community.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button asChild size="lg">
            <Link href="/login">
              <LogIn className="mr-2 h-5 w-5" /> Log In to Answer
            </Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <form onSubmit={handleSubmit}>
         <CardHeader>
          <Label htmlFor="answer-content" className="text-xl font-semibold">Your Answer</Label>
          <p className="text-sm text-muted-foreground">
            Share your knowledge. Use Markdown for formatting if needed.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Textarea
              id="answer-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your detailed answer here..."
              required
              rows={6}
              className="text-base"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" size="lg" disabled={isSubmitting || !content.trim()}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? 'Submitting...' : 'Post Your Answer'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
