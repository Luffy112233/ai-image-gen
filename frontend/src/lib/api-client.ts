/**
 * API Client for AI Image Gen Backend
 */

const API_BASE = '/api';

export interface GenerationRequest {
  prompt: string;
  model?: string;
  size?: string;
  n?: number;
  negative_prompt?: string;
  image_url?: string;
  provider?: string;
}

export interface GenerationResult {
  task_id: string;
  status: string;
  images: Array<{ url?: string; b64_json?: string }>;
  error?: string;
  progress: number;
}

export async function generateImage(data: GenerationRequest): Promise<GenerationResult> {
  const response = await fetch(`${API_BASE}/api/v1/generation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Generation failed: ${error}`);
  }
  
  return response.json();
}

export async function batchGenerate(tasks: GenerationRequest[]): Promise<GenerationResult[]> {
  const response = await fetch(`${API_BASE}/api/v1/generation/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tasks }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Batch generation failed: ${error}`);
  }
  
  return response.json();
}

export async function listModels(): Promise<any[]> {
  const response = await fetch(`${API_BASE}/api/v1/generation/models`);
  if (!response.ok) return [];
  const data = await response.json();
  return data.models || [];
}

export async function uploadImage(file: File): Promise<{ file_id: string; url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${API_BASE}/api/v1/upload/image`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error('Upload failed');
  }
  
  return response.json();
}

export async function uploadMultipleImages(files: File[]): Promise<Array<{ file_id: string; url: string }>> {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }
  
  const response = await fetch(`${API_BASE}/api/v1/upload/images`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error('Batch upload failed');
  }
  
  return response.json();
}

export async function getTaskStatus(taskId: string): Promise<any> {
  const response = await fetch(`${API_BASE}/api/v1/generation/status/${taskId}`);
  if (!response.ok) throw new Error('Task not found');
  return response.json();
}

export async function getHistory(): Promise<any[]> {
  const response = await fetch(`${API_BASE}/api/v1/generation/history`);
  if (!response.ok) return [];
  const data = await response.json();
  return data.history || [];
}

export async function deleteTask(taskId: string): Promise<void> {
  await fetch(`${API_BASE}/api/v1/generation/history/${taskId}`, { method: 'DELETE' });
}
