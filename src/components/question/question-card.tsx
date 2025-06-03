
import Link from 'next/link';
import type { Question } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BookmarkButton, TagBadge, VoteButtons } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { MessageCircle, Eye, ArrowRight, Reply } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import QuestionActions from '@/components/question/question-actions';

interface QuestionCardProps {
  question: Question;
  showAuthorActions?: boolean;
  loggedInUserId?: string;
  currentUserBookmarkedQuestionIds?: string[];
}

export default function QuestionCard({
  question,
  showAuthorActions = false,
  loggedInUserId,
  currentUserBookmarkedQuestionIds,
}: QuestionCardProps) {
  const initials = question.author.name.split(' ').map(n => n[0]).join('').toUpperCase();
  const timeAgo = formatDistanceToNow(new Date(question.updatedAt), { addSuffix: true });
  const activityText = new Date(question.createdAt).getTime() === new Date(question.updatedAt).getTime()
    ? `asked ${formatDistanceToNow(new Date(question.createdAt), { addSuffix: true })}`
    : `modified ${timeAgo}`;

  const isBookmarked = loggedInUserId && currentUserBookmarkedQuestionIds
    ? currentUserBookmarkedQuestionIds.includes(question.id)
    : false;

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <div className="flex justify-between items-start space-x-2">
          <Link href={`/questions/${question.id}`} className="hover:text-primary transition-colors flex-1 min-w-0">
            <CardTitle className="text-xl md:text-2xl font-semibold mb-1 truncate" title={question.title}>{question.title}</CardTitle>
          </Link>
          <div className="flex items-center space-x-1 flex-shrink-0">
            {loggedInUserId && (
              <BookmarkButton
                questionId={question.id}
                isInitiallyBookmarked={isBookmarked}
              />
            )}
            {showAuthorActions && loggedInUserId === question.author.id && (
              <QuestionActions questionAuthorId={question.author.id} questionId={question.id} />
            )}
            <VoteButtons initialUpvotes={question.upvotes} initialDownvotes={question.downvotes} itemId={question.id} itemType="question" />
          </div>
        </div>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Avatar className="h-6 w-6">
            <AvatarImage src={question.author.avatarUrl} alt={question.author.name} data-ai-hint="user avatar"/>
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <span>{question.author.name}</span>
          <span>&bull;</span>
          <time dateTime={question.updatedAt}>{activityText}</time>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="line-clamp-3 text-foreground/80">
          {question.description}
        </CardDescription>
        <div className="mt-3 flex flex-wrap gap-2">
          {question.tags.map((tag) => (
            <TagBadge key={tag.id} tag={tag} />
          ))}
        </div>
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground flex flex-col sm:flex-row justify-between items-center gap-4 pt-4">
        <div className="flex items-center space-x-4">
          <span className="flex items-center">
            <MessageCircle size={16} className="mr-1" /> {question.answers.length} Answer{question.answers.length !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center">
            <Eye size={16} className="mr-1" /> {question.views} View{question.views !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Button asChild variant="default" size="sm">
            <Link href={`/questions/${question.id}#your-answer-section`}>
              <Reply className="mr-2 h-4 w-4" /> Answer
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/questions/${question.id}`}>
              View Question <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
