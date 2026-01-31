
export type Status = 'Live' | 'In Progress' | 'Pending' | 'Review' | 'Archive';
export type Priority = 'High' | 'Medium' | 'Low' | 'Urgent';

export interface WorkflowRequest {
  id: string;
  name: string;
  status: Status;
  priority: Priority;
  date: string;
  description: string;
  client: string;
  assignedAdmin?: string;
  webhookUrl?: string;
}

export interface Conversation {
  id: string;
  user: string;
  lastMessage: string;
  time: string;
  platform: 'Instagram' | 'Messenger';
  avatar: string;
}

export interface KnowledgeBase {
  id: string;
  name: string;
  type: 'Chatbot' | 'Comments';
  status: 'Active' | 'Draft';
  wordCount: number;
  workflowCount: number;
}

export interface Addon {
  id: string;
  name: string;
  price: number;
  description: string;
  icon: string;
  selected: boolean;
}
