/**
 * Task Polling API Tests
 * Tests authentication, authorization, and response format for GET /api/tasks/[taskId]
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { prisma } from '@/lib/db';
import * as requireAuth from '@/lib/auth/require-auth';
import type { BackgroundTask } from '@/lib/generated/prisma/client';

// Mock prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    backgroundTask: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock auth
vi.mock('@/lib/auth/require-auth', () => ({
  requireAuth: vi.fn(),
}));

// Import after mocks are set up
const { GET } = await import('@/app/api/tasks/[taskId]/route');

describe('GET /api/tasks/[taskId]', () => {
  const mockUserId = 'user-123';
  const mockOtherUserId = 'user-456';
  const mockTaskId = 'task-789';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authentication', () => {
    it('should return error when user is not authenticated', async () => {
      // Mock auth to throw unauthorized error
      vi.mocked(requireAuth.requireAuth).mockRejectedValue(new Error('Unauthorized'));

      const request = new Request(`http://localhost/api/tasks/${mockTaskId}`, {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500); // toAppError converts unknown errors
      expect(data.success).toBe(false);
    });
  });

  describe('authorization', () => {
    it('should return 404 when task does not exist', async () => {
      // Mock authenticated user
      vi.mocked(requireAuth.requireAuth).mockResolvedValue(mockUserId);

      // Mock task not found
      vi.mocked(prisma.backgroundTask.findUnique).mockResolvedValue(null);

      const request = new Request(`http://localhost/api/tasks/${mockTaskId}`, {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
    });

    it("should return 403 when trying to access another user's task", async () => {
      // Mock authenticated user
      vi.mocked(requireAuth.requireAuth).mockResolvedValue(mockUserId);

      // Mock task belongs to a different user
      vi.mocked(prisma.backgroundTask.findUnique).mockResolvedValue({
        id: mockTaskId,
        userId: mockOtherUserId, // Different user!
        type: 'resume_parsing',
        status: 'pending',
        progress: 0,
        resourceId: null,
        error: null,
        result: null,
      } as unknown as BackgroundTask);

      const request = new Request(`http://localhost/api/tasks/${mockTaskId}`, {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
    });

    it('should successfully get own task', async () => {
      // Mock authenticated user
      vi.mocked(requireAuth.requireAuth).mockResolvedValue(mockUserId);

      // Mock task belongs to the authenticated user
      vi.mocked(prisma.backgroundTask.findUnique).mockResolvedValue({
        id: mockTaskId,
        userId: mockUserId, // Same user!
        type: 'resume_parsing',
        status: 'completed',
        progress: 100,
        resourceId: 'resource-123',
        error: null,
        result: { content: 'parsed resume content' },
      } as unknown as BackgroundTask);

      const request = new Request(`http://localhost/api/tasks/${mockTaskId}`, {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(mockTaskId);
    });
  });

  describe('response format', () => {
    it('should return correct task data structure', async () => {
      // Mock authenticated user
      vi.mocked(requireAuth.requireAuth).mockResolvedValue(mockUserId);

      // Mock complete task
      vi.mocked(prisma.backgroundTask.findUnique).mockResolvedValue({
        id: mockTaskId,
        userId: mockUserId,
        type: 'interview_analysis',
        status: 'completed',
        progress: 100,
        resourceId: 'interview-123',
        error: null,
        result: {
          score: 85,
          strengths: ['Good communication'],
          improvements: ['Be more specific'],
          feedback: 'Overall good performance',
        },
      } as unknown as BackgroundTask);

      const request = new Request(`http://localhost/api/tasks/${mockTaskId}`, {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify all required fields are present
      const taskData = data.data;
      expect(taskData).toHaveProperty('id');
      expect(taskData).toHaveProperty('type');
      expect(taskData).toHaveProperty('status');
      expect(taskData).toHaveProperty('progress');
      expect(taskData).toHaveProperty('resourceId');
      expect(taskData).toHaveProperty('error');
      expect(taskData).toHaveProperty('result');

      // Verify field values
      expect(taskData.id).toBe(mockTaskId);
      expect(taskData.type).toBe('interview_analysis');
      expect(taskData.status).toBe('completed');
      expect(taskData.progress).toBe(100);
      expect(taskData.resourceId).toBe('interview-123');
      expect(taskData.error).toBeNull();
      expect(taskData.result).toEqual({
        score: 85,
        strengths: ['Good communication'],
        improvements: ['Be more specific'],
        feedback: 'Overall good performance',
      });
    });
  });

  describe('different task states', () => {
    it('should return pending task correctly', async () => {
      // Mock authenticated user
      vi.mocked(requireAuth.requireAuth).mockResolvedValue(mockUserId);

      // Mock pending task
      vi.mocked(prisma.backgroundTask.findUnique).mockResolvedValue({
        id: mockTaskId,
        userId: mockUserId,
        type: 'resume_parsing',
        status: 'pending',
        progress: 0,
        resourceId: null,
        error: null,
        result: null,
      } as unknown as BackgroundTask);

      const request = new Request(`http://localhost/api/tasks/${mockTaskId}`, {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('pending');
      expect(data.data.progress).toBe(0);
      expect(data.data.resourceId).toBeNull();
      expect(data.data.error).toBeNull();
      expect(data.data.result).toBeNull();
    });

    it('should return processing task correctly', async () => {
      // Mock authenticated user
      vi.mocked(requireAuth.requireAuth).mockResolvedValue(mockUserId);

      // Mock processing task with partial progress
      vi.mocked(prisma.backgroundTask.findUnique).mockResolvedValue({
        id: mockTaskId,
        userId: mockUserId,
        type: 'interview_analysis',
        status: 'processing',
        progress: 50,
        resourceId: 'interview-456',
        error: null,
        result: null,
      } as unknown as BackgroundTask);

      const request = new Request(`http://localhost/api/tasks/${mockTaskId}`, {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('processing');
      expect(data.data.progress).toBe(50);
      expect(data.data.resourceId).toBe('interview-456');
      expect(data.data.error).toBeNull();
      expect(data.data.result).toBeNull();
    });

    it('should return completed task with result', async () => {
      // Mock authenticated user
      vi.mocked(requireAuth.requireAuth).mockResolvedValue(mockUserId);

      const mockResult = {
        content: 'Parsed resume content here',
        parsedAt: '2026-01-16T10:00:00.000Z',
      };

      // Mock completed task with result
      vi.mocked(prisma.backgroundTask.findUnique).mockResolvedValue({
        id: mockTaskId,
        userId: mockUserId,
        type: 'resume_parsing',
        status: 'completed',
        progress: 100,
        resourceId: 'resume-789',
        error: null,
        result: mockResult,
      } as unknown as BackgroundTask);

      const request = new Request(`http://localhost/api/tasks/${mockTaskId}`, {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('completed');
      expect(data.data.progress).toBe(100);
      expect(data.data.resourceId).toBe('resume-789');
      expect(data.data.error).toBeNull();
      expect(data.data.result).toEqual(mockResult);
    });

    it('should return failed task with error', async () => {
      // Mock authenticated user
      vi.mocked(requireAuth.requireAuth).mockResolvedValue(mockUserId);

      const mockError = 'Failed to parse resume: Invalid file format';

      // Mock failed task with error
      vi.mocked(prisma.backgroundTask.findUnique).mockResolvedValue({
        id: mockTaskId,
        userId: mockUserId,
        type: 'resume_parsing',
        status: 'failed',
        progress: 25,
        resourceId: null,
        error: mockError,
        result: null,
      } as unknown as BackgroundTask);

      const request = new Request(`http://localhost/api/tasks/${mockTaskId}`, {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('failed');
      expect(data.data.progress).toBe(25);
      expect(data.data.resourceId).toBeNull();
      expect(data.data.error).toBe(mockError);
      expect(data.data.result).toBeNull();
    });
  });
});
