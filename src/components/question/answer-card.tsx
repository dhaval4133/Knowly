import type { Answer } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import VoteButtons from '@/components/shared/vote-buttons';
import { formatDistanceToNow } from 'date-fns';

interface AnswerCardProps {
  answer: Answer;
}

export default function AnswerCard({ answer }: AnswerCardProps) {
  const authorInitials = answer.author.name.split(' ').map(n => n[0]).join('').toUpperCase();
  const timeAgo = formatDistanceToNow(new Date(answer.createdAt), { addSuffix: true });

  return (
    <Card className="bg-background/50 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={answer.author.avatarUrl} alt={answer.author.name} data-ai-hint="user avatar" />
            <AvatarFallback>{authorInitials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-foreground">{answer.author.name}</p>
            <p className="text-xs text-muted-foreground">
              Answered <time dateTime={answer.createdAt}>{timeAgo}</time>
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* In a real app, render Markdown here */}
        <div className="prose dark:prose-invert max-w-none text-foreground/90 whitespace-pre-wrap text-base">
          {answer.content}
        </div>
      </CardContent>
      <CardFooter className="flex justify-start pt-3">
        <VoteButtons initialUpvotes={answer.upvotes} initialDownvotes={answer.downvotes} itemId={answer.id} itemType="answer" />
      </CardFooter>
    </Card>
  );
}
