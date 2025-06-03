
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
  _id: string; // string representation of ObjectId
  content?: string; // Made optional
  authorId: string; // string representation of ObjectId
  createdAt: Date; // Store as Date in DB object, convert to ISO string for PopulatedAnswer
  upvotes: number;
  downvotes: number;
}

// This represents an Answer with its author populated
export interface Answer extends Omit<AnswerData, 'authorId' | '_id'> {
  id: string;
  content?: string; // Made optional
  author: User;
}

// This represents a Question as it might be stored/retrieved with authorId
export interface QuestionData {
  _id: string; // or ObjectId
  title: string;
  description: string;
  tags: string[]; // Storing tags as an array of strings in DB
  authorId: string; // or ObjectId
  createdAt: Date;
  updatedAt: Date; // For sorting by recent activity
  upvotes: number;
  downvotes: number;
  views: number; // For actual view count
  answers: AnswerData[];
}

// This represents a Question with its author and tags (as Tag objects) populated
export interface Question {
  id: string;
  title: string;
  description: string;
  tags: Tag[]; // Tags as Tag objects for display components
  author: User;
  createdAt: string; // ISO string date for display
  updatedAt: string; // ISO string date for display
  upvotes: number;
  downvotes: number;
  views: number;
  answers: Answer[]; // Answers with populated authors
}
