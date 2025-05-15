
import type { User, Tag } from './types'; // Question and Answer types are now more DB-aligned

export const mockUsers: User[] = [
  { id: 'user1', name: 'Alice Wonderland', avatarUrl: 'https://placehold.co/100x100.png' },
  { id: 'user2', name: 'Bob The Builder', avatarUrl: 'https://placehold.co/100x100.png' },
  { id: 'user3', name: 'Charlie Brown', avatarUrl: 'https://placehold.co/100x100.png' },
];

export const mockTags: Tag[] = [
  { id: 'javascript', name: 'JavaScript' }, // id matching string tag name
  { id: 'react', name: 'React' },
  { id: 'next.js', name: 'Next.js' },
  { id: 'typescript', name: 'TypeScript' },
  { id: 'ai', name: 'AI' },
];

// The following mock data for questions and answers is now superseded by database fetching.
// It's kept here for reference or if needed for other isolated testing, but not used by
// the main pages (homepage, question detail, profile).

/*
export const mockAnswers: Answer[] = [
  {
    id: 'ans1',
    content: 'You can use `useEffect` for side effects in React components. Make sure to include a dependency array!',
    author: mockUsers[1],
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    upvotes: 15,
    downvotes: 1,
  },
  {
    id: 'ans2',
    content: 'For Next.js, server components are great for performance. Client components should be used sparingly where interactivity is needed.',
    author: mockUsers[2],
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
    upvotes: 22,
    downvotes: 0,
  },
];

export const mockQuestions: Question[] = [
  {
    id: 'q1',
    title: 'How to manage state in large React applications?',
    description: 'I am building a complex React application and finding it hard to manage global state. What are the best practices and libraries to consider? I have looked into Redux, Zustand, and Context API but am unsure which to pick.',
    tags: [mockTags[0], mockTags[1]],
    author: mockUsers[0],
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    upvotes: 10,
    downvotes: 2,
    answers: [mockAnswers[0]],
  },
  {
    id: 'q2',
    title: 'Best way to fetch data in Next.js 14 App Router?',
    description: 'With the new App Router in Next.js, what is the recommended approach for data fetching? Should I use Server Components, Route Handlers, or something else for different scenarios like static data, dynamic data, and mutations?',
    tags: [mockTags[2], mockTags[3]],
    author: mockUsers[1],
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    upvotes: 25,
    downvotes: 1,
    answers: [mockAnswers[1]],
  },
  {
    id: 'q3',
    title: 'Understanding Generative AI Tool Usage',
    description: 'How do Large Language Models (LLMs) decide when and how to use external tools? What are the mechanisms behind tool invocation and response integration in AI systems like those using Genkit?',
    tags: [mockTags[4]],
    author: mockUsers[2],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    upvotes: 18,
    downvotes: 0,
    answers: [],
  },
];

export const getQuestionById = (id: string): Question | undefined => {
  return mockQuestions.find(q => q.id === id);
};

export const getAnswersForQuestion = (questionId: string): Answer[] => {
  const question = getQuestionById(questionId);
  return question ? question.answers : [];
};
*/
