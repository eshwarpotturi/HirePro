import type { Task, CandidateWork, Simulation, TaskGroup } from '../types';

// Generic fetch handler for API calls with robust error handling
async function postApi<T>(endpoint: string, body: object, timeoutMs: number = 60000): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            let errorMessage = `Server error (${response.status})`;
            
            // Handle specific status codes
            if (response.status === 429) {
                errorMessage = "The AI service is currently busy (Rate Limit Exceeded). Please wait a moment and try again.";
            } else if (response.status === 503 || response.status === 504) {
                errorMessage = "The AI service is temporarily unavailable. Please try again in a few minutes.";
            } else if (response.status === 401 || response.status === 403) {
                errorMessage = "Authentication failed. Please check the server configuration.";
            }

            try {
                const errorBody = await response.json();
                if (errorBody && errorBody.error) {
                    errorMessage = errorBody.error;
                }
            } catch (e) {
                // Not a JSON error response, use the status-based message
            }
            
            throw new Error(errorMessage);
        }

        const data = await response.json();
        return data;

    } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof Error) {
            if (error.name === 'AbortError') {
                throw new Error('The request timed out. The AI service is taking longer than expected. Please try again.');
            }
            
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                throw new Error('Unable to connect to the server. Please check your internet connection.');
            }

            console.error(`API Error for ${endpoint}:`, error.message);
            throw error;
        }
        
        throw new Error('An unexpected error occurred while communicating with the server.');
    }
}


export const generateSimulationTasks = async (jobTitle: string, jobDescription: string): Promise<Task[]> => {
    const tasks = await postApi<Task[]>('/api/generate-tasks', { jobTitle, jobDescription });
    if (!tasks || tasks.length === 0) {
        throw new Error("The AI service returned an empty list of tasks. Please try refining your job description.");
    }
    return tasks;
};

export const modifySimulationTasks = async (
  jobTitle: string,
  jobDescription: string,
  currentTasks: Task[],
  modification: string
): Promise<Task[]> => {
    const tasks = await postApi<Task[]>('/api/modify-tasks', { jobTitle, jobDescription, currentTasks, modification });
    if (!tasks || tasks.length === 0) {
        // Don't throw, just return current tasks as a safe fallback
        return currentTasks;
    }
    return tasks;
};

export const regenerateOrModifySingleTask = async (
  jobTitle: string,
  jobDescription: string,
  allTasks: Task[],
  taskToChange: Task,
  instruction: string
): Promise<Omit<Task, 'id'>> => {
  return await postApi<Omit<Task, 'id'>>('/api/regenerate-single-task', { jobTitle, jobDescription, allTasks, taskToChange, instruction });
};

export const generateSingleTask = async (
  jobTitle: string,
  jobDescription: string,
  existingTasks: Task[]
): Promise<Omit<Task, 'id'>> => {
    return await postApi<Omit<Task, 'id'>>('/api/generate-single-task', { jobTitle, jobDescription, existingTasks });
};

export const groupTasks = async (tasks: Task[]): Promise<Omit<TaskGroup, 'id'>[]> => {
    return await postApi<Omit<TaskGroup, 'id'>[]>('/api/group-tasks', { tasks });
};

export const suggestEvaluationCriteria = async (taskTitle: string, taskDescription: string): Promise<string> => {
    const result = await postApi<{ text: string }>('/api/suggest-criteria', { taskTitle, taskDescription });
    return result.text;
};

export const analyzeCandidatePerformance = async (
  simulation: {jobTitle: string, jobDescription: string, tasks: Task[]},
  work: CandidateWork,
  behavioralData: { timeTakenSeconds: number, totalDurationSeconds: number, submissionReason: 'manual' | 'auto' }
): Promise<string> => {
    const report = await postApi<object>('/api/analyze-performance', { simulation, work, behavioralData });
    return JSON.stringify(report);
};

export const getChatResponse = async (
  simulation: { jobTitle: string; tasks: Task[] },
  chatHistory: { author: 'Candidate' | 'AI'; message: string }[]
): Promise<string> => {
  const result = await postApi<{ text: string }>('/api/chat-response', { simulation, chatHistory });
  return result.text;
};

export const getClientCallResponse = async (
  jobTitle: string,
  chatHistory: { author: 'Client' | 'You'; text: string }[]
): Promise<string> => {
    const result = await postApi<{ text: string }>('/api/client-call-response', { jobTitle, chatHistory });
    return result.text;
};

export const getSupportChatResponse = async (
  chatHistory: { author: 'user' | 'bot'; message: string }[]
): Promise<string> => {
  const result = await postApi<{ text: string }>('/api/support-chat-response', { chatHistory });
  return result.text;
};