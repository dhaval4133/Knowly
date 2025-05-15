
export interface User {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface Tag {
  id: string; // Can be the same as name for simplicity if tags are just strings
  name: string;
}

// This represents an Answer as it might be stored/retrieved with authorId
export interface AnswerData {
  _id: string; // or ObjectId if using MongoDB directly in this type
  content: string;
  authorId: string; // or ObjectId
  createdAt: string; // ISO string date
  upvotes: number;
  downvotes: number;
}

// This represents an Answer with its author populated
export interface Answer extends Omit<AnswerData, 'authorId' | '_id'> {
  id: string;
  author: User;
}

// This represents a Question as it might be stored/retrieved with authorId
export interface QuestionData {
  _id: string; // or ObjectId
  title: string;
  description: string;
  tags: string[]; // Storing tags as an array of strings in DB
  authorId: string; // or ObjectId
  createdAt: string; // ISO string date
  upvotes: number;
  downvotes: number;
  answers: AnswerData[]; // Or Answer[] if answers are fully embedded with populated authors
}

// This represents a Question with its author and tags (as Tag objects) populated
export interface Question {
  id: string;
  title: string;
  description: string;
  tags: Tag[]; // Tags as Tag objects for display components
  author: User;
  createdAt: string; // ISO string date
  upvotes: number;
  downvotes: number;
  answers: Answer[]; // Answers with populated authors
}
