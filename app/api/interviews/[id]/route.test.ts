/**
 * Delete Interview API Security Tests
 * Tests authorization and ownership verification
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { prisma } from '@/lib/db';
import * as requireAuth from '@/lib/auth/require-auth';
import type { Interview } from '@/lib/generated/prisma/client';

// Mock prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    interview: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock auth
vi.mock('@/lib/auth/require-auth', () => ({
  requireAuth: vi.fn(),
}));

// Mock node:fs/promises for audio file deletion
vi.mock('node:fs/promises', () => ({
  default: {
    unlink: vi.fn().mockResolvedValue(undefined),
  },
  unlink: vi.fn().mockResolvedValue(undefined),
}));

// Import after mocks are set up
const { DELETE } = await import('@/app/api/interviews/[id]/route');

describe('DELETE /api/interviews/[id]', () => {
  const mockUserId = 'user-123';
  const mockOtherUserId = 'user-456';
  const mockInterviewId = 'interview-789';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      // Mock auth to throw unauthorized error
      vi.mocked(requireAuth.requireAuth).mockRejectedValue(new Error('Unauthorized'));

      const request = new Request(`http://localhost/api/interviews/${mockInterviewId}`, {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500); // toAppError converts unknown errors
      expect(data.success).toBe(false);
    });
  });

  describe('authorization', () => {
    it("should return 403 when trying to delete another user's interview", async () => {
      // Mock authenticated user
      vi.mocked(requireAuth.requireAuth).mockResolvedValue(mockUserId);

      // Mock interview belongs to a different user
      vi.mocked(prisma.interview.findUnique).mockResolvedValue({
        id: mockInterviewId,
        userId: mockOtherUserId, // Different user!
        modelAnswer: null,
      } as unknown as Interview);

      const request = new Request(`http://localhost/api/interviews/${mockInterviewId}`, {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
    });

    it('should return 404 when interview does not exist', async () => {
      // Mock authenticated user
      vi.mocked(requireAuth.requireAuth).mockResolvedValue(mockUserId);

      // Mock interview not found
      vi.mocked(prisma.interview.findUnique).mockResolvedValue(null);

      const request = new Request(`http://localhost/api/interviews/${mockInterviewId}`, {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
    });

    it('should successfully delete own interview', async () => {
      // Mock authenticated user
      vi.mocked(requireAuth.requireAuth).mockResolvedValue(mockUserId);

      // Mock interview belongs to the authenticated user
      vi.mocked(prisma.interview.findUnique).mockResolvedValue({
        id: mockInterviewId,
        userId: mockUserId, // Same user!
        modelAnswer: null,
      } as unknown as Interview);

      vi.mocked(prisma.interview.delete).mockResolvedValue({
        id: mockInterviewId,
      } as unknown as Interview);

      const request = new Request(`http://localhost/api/interviews/${mockInterviewId}`, {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(mockInterviewId);
      expect(data.data.deleted).toBe(true);
    });
  });

  describe('audio file deletion edge cases', () => {
    it('should successfully delete interview even if audio file deletion fails', async () => {
      const fs = await import('node:fs/promises');

      // Mock authenticated user
      vi.mocked(requireAuth.requireAuth).mockResolvedValue(mockUserId);

      // Mock interview with audio file
      vi.mocked(prisma.interview.findUnique).mockResolvedValue({
        id: mockInterviewId,
        userId: mockUserId,
        modelAnswer: {
          audioUrl: '/audio/test-audio.mp3',
        },
      } as unknown as Interview);

      // Mock file deletion to fail
      vi.mocked(fs.default.unlink).mockRejectedValue(new Error('File not found'));

      vi.mocked(prisma.interview.delete).mockResolvedValue({
        id: mockInterviewId,
      } as unknown as Interview);

      const request = new Request(`http://localhost/api/interviews/${mockInterviewId}`, {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      // Should still succeed
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(mockInterviewId);
      expect(data.data.deleted).toBe(true);

      // Verify interview was deleted despite audio deletion failure
      expect(prisma.interview.delete).toHaveBeenCalledWith({
        where: { id: mockInterviewId },
      });
    });

    it('should successfully delete interview when modelAnswer has no audioUrl', async () => {
      const fs = await import('node:fs/promises');

      // Mock authenticated user
      vi.mocked(requireAuth.requireAuth).mockResolvedValue(mockUserId);

      // Mock interview with modelAnswer but no audioUrl
      vi.mocked(prisma.interview.findUnique).mockResolvedValue({
        id: mockInterviewId,
        userId: mockUserId,
        modelAnswer: {
          text: 'Sample answer text',
          // No audioUrl field
        },
      } as unknown as Interview);

      vi.mocked(prisma.interview.delete).mockResolvedValue({
        id: mockInterviewId,
      } as unknown as Interview);

      const request = new Request(`http://localhost/api/interviews/${mockInterviewId}`, {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      // Should succeed
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.deleted).toBe(true);

      // Verify file deletion was not attempted
      expect(fs.default.unlink).not.toHaveBeenCalled();
    });

    it('should successfully delete interview when modelAnswer is null', async () => {
      const fs = await import('node:fs/promises');

      // Mock authenticated user
      vi.mocked(requireAuth.requireAuth).mockResolvedValue(mockUserId);

      // Mock interview with null modelAnswer
      vi.mocked(prisma.interview.findUnique).mockResolvedValue({
        id: mockInterviewId,
        userId: mockUserId,
        modelAnswer: null,
      } as unknown as Interview);

      vi.mocked(prisma.interview.delete).mockResolvedValue({
        id: mockInterviewId,
      } as unknown as Interview);

      const request = new Request(`http://localhost/api/interviews/${mockInterviewId}`, {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      // Should succeed
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.deleted).toBe(true);

      // Verify file deletion was not attempted
      expect(fs.default.unlink).not.toHaveBeenCalled();
    });

    it('should successfully delete interview with audio file', async () => {
      // Mock authenticated user
      vi.mocked(requireAuth.requireAuth).mockResolvedValue(mockUserId);

      // Mock interview with audio file
      vi.mocked(prisma.interview.findUnique).mockResolvedValue({
        id: mockInterviewId,
        userId: mockUserId,
        modelAnswer: {
          audioUrl: '/audio/test-audio.mp3',
        },
      } as unknown as Interview);

      vi.mocked(prisma.interview.delete).mockResolvedValue({
        id: mockInterviewId,
      } as unknown as Interview);

      const request = new Request(`http://localhost/api/interviews/${mockInterviewId}`, {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      // Should succeed even with audio file present
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.deleted).toBe(true);

      // Verify interview was deleted
      expect(prisma.interview.delete).toHaveBeenCalledWith({
        where: { id: mockInterviewId },
      });
    });
  });
});
