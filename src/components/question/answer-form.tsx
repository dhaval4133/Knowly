
'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface AnswerFormProps {
  questionId: string;
}

export default function AnswerForm({ questionId }: AnswerFormProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
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
          description: data.message || "Could not post your answer.",
          variant: "destructive",
        });
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

  return (
    <Card className="shadow-md">
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 pt-6">
          <div>
            <Label htmlFor="answer-content" className="text-lg font-medium">Your Answer</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Share your knowledge. Use Markdown for formatting if needed.
            </p>
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
