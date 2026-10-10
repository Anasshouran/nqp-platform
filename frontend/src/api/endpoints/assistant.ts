import apiClient from '../client';
import type { ApiResponse } from '../../types/api';

export type AssistantConfidence = 'LOW' | 'MEDIUM' | 'HIGH';

export type AssistantAnswerType = 'INFO' | 'ACTION' | 'ALERT' | 'SOURCE' | 'NOT_FOUND';

export interface AssistantAction {
  label?: string;
  route?: string;
  requires_auth?: boolean;
  identity_provider?: string;
}

export interface AssistantSource {
  type: string;
  id?: string;
  title?: string;
  source_url?: string;
  source_updated_at?: string;
}

export interface AssistantAnswer {
  answer: string;
  answer_type?: AssistantAnswerType;
  action?: AssistantAction | null;
  sources: AssistantSource[];
  confidence: AssistantConfidence;
  language?: string;
  disclaimer?: string | null;
  conversation_id?: string | null;
  engine?: string;
}

export interface AssistantTopic {
  group: string;
  title: string;
  count: number;
}

export interface AssistantChatPayload {
  message: string;
  language?: string;
  context?: { country?: string };
}

export const chatAssistant = (payload: AssistantChatPayload) =>
  apiClient.post<ApiResponse<AssistantAnswer>>('/public/assistant/chat/', payload);

export const getAssistantSuggestions = () =>
  apiClient.get<ApiResponse<string[]>>('/public/assistant/suggestions/');

export const getAssistantTopics = () =>
  apiClient.get<ApiResponse<AssistantTopic[]>>('/public/assistant/topics/');

export interface AssistantFeedbackPayload {
  conversation_id?: string | null;
  rating: 1 | -1;
  intent?: string;
  answer_type?: string;
  engine?: string;
}

export const submitAssistantFeedback = (payload: AssistantFeedbackPayload) =>
  apiClient.post<ApiResponse<{ ok: boolean }>>("/public/assistant/feedback/", payload);
