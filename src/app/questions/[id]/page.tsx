import { getQuestionById, getAnswersForQuestion } from '@/lib/mock-data';
import type { Question, Answer } from '@/lib/types';
import { notFound } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import TagBadge from '@/components/shared/tag-badge';
import VoteButtons from '@/components/shared/vote-buttons';
import AnswerCard from '@/components/question/answer-card';
import AnswerForm from '@/components/question/answer-form';
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow } from 'date-fns';

interface QuestionPageProps {
  params: { id: string };
}

export default function QuestionPage({ params }: QuestionPageProps) {
  const question: Question | undefined = getQuestionById(params.id);

  if (!question) {
    notFound();
  }

  const answers: Answer[] = getAnswersForQuestion(params.id);
  const questionAuthorInitials = question.author.name.split(' ').map(n => n[0]).join('').toUpperCase();
  const questionTimeAgo = formatDistanceToNow(new Date(question.createdAt), { addSuffix: true });

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-2xl md:text-3xl font-bold">{question.title}</CardTitle>
            <VoteButtons initialUpvotes={question.upvotes} initialDownvotes={question.downvotes} itemId={question.id} itemType="question" />
          </div>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground mt-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={question.author.avatarUrl} alt={question.author.name} data-ai-hint="user avatar" />
              <AvatarFallback>{questionAuthorInitials}</AvatarFallback>
            </Avatar>
            <span>Asked by {question.author.name}</span>
            <span>&bull;</span>
            <time dateTime={question.createdAt}>{questionTimeAgo}</time>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {question.tags.map((tag) => (
              <TagBadge key={tag.id} tag={tag} />
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {/* In a real app, render Markdown here */}
          <div className="prose dark:prose-invert max-w-none text-foreground/90 whitespace-pre-wrap text-base">
            {question.description}
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">
          {answers.length} Answer{answers.length !== 1 ? 's' : ''}
        </h2>
        {answers.length > 0 ? (
          answers.map((answer) => (
            <AnswerCard key={answer.id} answer={answer} />
          ))
        ) : (
          <p className="text-muted-foreground">No answers yet. Be the first to provide a solution!</p>
        )}
      </div>

      <Separator />

      <div>
        <h2 className="text-2xl font-semibold mb-4">Your Answer</h2>
        <AnswerForm questionId={question.id} />
      </div>
    </div>
  );
}
