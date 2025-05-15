
import QuestionForm from '@/components/question/question-form';

// This page no longer needs to be a client component for an initial auth check.
// The QuestionForm component itself is a client component and will handle
// the auth check upon submission.

export default function AskQuestionPage() {
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
