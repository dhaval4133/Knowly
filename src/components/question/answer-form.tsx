'use client';

import { useState, type FormEvent } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface AnswerFormProps {
  questionId: string;
}

export default function AnswerForm({ questionId }: AnswerFormProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

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
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log({ questionId, content });
    toast({
      title: "Answer Submitted!",
      description: "Your answer has been posted (mock submission).",
    });
    setContent('');
    setIsSubmitting(false);
    // Here you would typically revalidate data or redirect
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
            {isSubmitting ? 'Submitting...' : 'Post Your Answer'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
