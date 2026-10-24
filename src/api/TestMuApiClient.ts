import { APIRequestContext, APIResponse } from '@playwright/test';

export interface CreateTestRunPayload {
  name: string;
  suite: string;
  environment: string;
}

export interface UpdateTestRunPayload {
  name?: string;
  suite?: string;
  environment?: string;
  status?: 'passed' | 'failed' | 'running';
  durationSec?: number;
}

export class TestMuApiClient {
  private request: APIRequestContext;
  private baseUrl: string;

  constructor(request: APIRequestContext, baseUrl: string = 'http://localhost:4321') {
    this.request = request;
    this.baseUrl = baseUrl;
  }

  async login(credentials: { email: string; password: string }): Promise<APIResponse> {
    return this.request.post(`${this.baseUrl}/api/v1/auth/login`, {
      data: credentials,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async forgotPassword(payload: { email: string }): Promise<APIResponse> {
    return this.request.post(`${this.baseUrl}/api/v1/auth/forgot-password`, {
      data: payload,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async listTestRuns(token?: string, queryParams?: Record<string, string>): Promise<APIResponse> {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const query = queryParams ? '?' + new URLSearchParams(queryParams).toString() : '';
    return this.request.get(`${this.baseUrl}/api/v1/test-runs${query}`, { headers });
  }

  async createTestRun(payload: Partial<CreateTestRunPayload>, token?: string): Promise<APIResponse> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    return this.request.post(`${this.baseUrl}/api/v1/test-runs`, {
      data: payload,
      headers,
    });
  }

  async getTestRun(id: string, token?: string): Promise<APIResponse> {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    return this.request.get(`${this.baseUrl}/api/v1/test-runs/${id}`, { headers });
  }

  async updateTestRun(id: string, payload: UpdateTestRunPayload, token?: string): Promise<APIResponse> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    return this.request.put(`${this.baseUrl}/api/v1/test-runs/${id}`, {
      data: payload,
      headers,
    });
  }

  async deleteTestRun(id: string, token?: string): Promise<APIResponse> {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    return this.request.delete(`${this.baseUrl}/api/v1/test-runs/${id}`, { headers });
  }

  async triggerRateLimitCheck(): Promise<APIResponse> {
    return this.request.get(`${this.baseUrl}/api/v1/rate-limit-test`);
  }

  async triggerServerError(): Promise<APIResponse> {
    return this.request.get(`${this.baseUrl}/api/v1/chaos/server-error`);
  }

  async resetServerState(): Promise<APIResponse> {
    return this.request.post(`${this.baseUrl}/api/test/reset`);
  }
}
