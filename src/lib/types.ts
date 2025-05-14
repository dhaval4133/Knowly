export interface User {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface Tag {
  id: string;
  name: string;
}

export interface Answer {
  id: string;
  content: string;
  author: User;
  createdAt: string;
  upvotes: number;
  downvotes: number;
}

export interface Question {
  id: string;
  title: string;
  description: string;
  tags: Tag[];
  author: User;
  createdAt: string;
  upvotes: number;
  downvotes: number;
  answers: Answer[];
}
