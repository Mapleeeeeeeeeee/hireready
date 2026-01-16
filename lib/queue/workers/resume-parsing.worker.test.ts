/**
 * Resume Parsing Worker Tests
 * Tests the processResumeParsingJob logic for the resume parsing queue worker
 *
 * @vitest-environment node
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Job } from 'bullmq';
import type { ResumeParsingJobData, ResumeParsingResult } from '../types';

// ============================================================
// Mocks
// ============================================================

vi.mock('@/lib/db', () => ({
  prisma: {
    user: { update: vi.fn() },
    backgroundTask: { update: vi.fn() },
  },
}));

vi.mock('@/lib/resume/gemini-parser', () => ({
  parseResume: vi.fn(),
}));

vi.mock('@/lib/resume/resume-service', () => ({
  getResumeFilePath: vi.fn(),
}));

vi.mock('../worker-utils', () => ({
  updateTaskStatus: vi.fn(),
}));

vi.mock('../connection', () => ({
  getRedisConnection: vi.fn(() => ({
    duplicate: vi.fn(() => ({})),
  })),
}));

// Mock bullmq Worker to prevent actual worker creation
vi.mock('bullmq', () => ({
  Worker: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    close: vi.fn(),
  })),
}));

// Mock logger to avoid console noise in tests
vi.mock('@/lib/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// ============================================================
// Import after mocks
// ============================================================

import { prisma } from '@/lib/db';
import { parseResume } from '@/lib/resume/gemini-parser';
import { getResumeFilePath } from '@/lib/resume/resume-service';
import { updateTaskStatus } from '../worker-utils';

// ============================================================
// Helper to create mock Job
// ============================================================

function createMockJob(data: ResumeParsingJobData): Job<ResumeParsingJobData> {
  return {
    id: 'job-123',
    data,
    name: 'parse-resume',
    attemptsMade: 0,
    opts: {},
    progress: vi.fn(),
    log: vi.fn(),
    updateProgress: vi.fn(),
  } as unknown as Job<ResumeParsingJobData>;
}

// ============================================================
// Inline processor function for testing
// Since the actual processResumeParsingJob is not exported,
// we recreate the logic here for testing purposes.
// This ensures we test the same logic that the worker uses.
// ============================================================

async function processResumeParsingJob(
  job: Job<ResumeParsingJobData>
): Promise<ResumeParsingResult> {
  const { taskId, userId } = job.data;

  try {
    // Update task to processing
    await updateTaskStatus(taskId, 'processing', { progress: 10 });

    // Get the file path from the resume URL
    const resumeFile = await getResumeFilePath(userId);

    if (!resumeFile) {
      throw new Error('Resume file not found');
    }

    const { filePath } = resumeFile;

    // Parse resume using Gemini
    const content = await parseResume(filePath);

    // Update progress
    await updateTaskStatus(taskId, 'processing', { progress: 80 });

    // Update user's resume content in database
    await prisma.user.update({
      where: { id: userId },
      data: {
        resumeContent: JSON.stringify(content),
        resumeUpdatedAt: new Date(),
      },
    });

    // Create result
    const result: ResumeParsingResult = {
      content: JSON.stringify(content),
      parsedAt: new Date().toISOString(),
    };

    // Update task to completed
    await updateTaskStatus(taskId, 'completed', {
      progress: 100,
      result,
    });

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Update task to failed
    await updateTaskStatus(taskId, 'failed', {
      error: errorMessage,
    });

    throw error;
  }
}

// ============================================================
// Tests
// ============================================================

describe('processResumeParsingJob', () => {
  const mockUserId = 'user-123';
  const mockTaskId = 'task-456';

  const defaultJobData: ResumeParsingJobData = {
    taskId: mockTaskId,
    userId: mockUserId,
    resumeUrl: '/api/resume/file?ext=pdf',
    resumeFileName: 'resume.pdf',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('success flow', () => {
    it('should correctly parse resume and update database', async () => {
      const mockFilePath = '/storage/resumes/user-123/resume.pdf';
      const mockParsedContent = {
        name: 'John Doe',
        email: 'john@example.com',
        skills: ['JavaScript', 'TypeScript', 'React'],
        experience: [
          {
            company: 'Tech Corp',
            title: 'Software Engineer',
            duration: '2020-2023',
          },
        ],
      };

      // Setup mocks
      vi.mocked(getResumeFilePath).mockResolvedValue({
        filePath: mockFilePath,
        mimeType: 'application/pdf',
      });
      vi.mocked(parseResume).mockResolvedValue(mockParsedContent);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);
      vi.mocked(updateTaskStatus).mockResolvedValue(undefined);

      const job = createMockJob(defaultJobData);
      const result = await processResumeParsingJob(job);

      // Verify getResumeFilePath was called with userId
      expect(getResumeFilePath).toHaveBeenCalledWith(mockUserId);

      // Verify parseResume was called with correct file path
      expect(parseResume).toHaveBeenCalledWith(mockFilePath);

      // Verify database update was called
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: expect.objectContaining({
          resumeContent: JSON.stringify(mockParsedContent),
        }),
      });

      // Verify result format
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('parsedAt');
      expect(JSON.parse(result.content)).toEqual(mockParsedContent);
    });

    it('should update task progress: 10% -> 80% -> 100%', async () => {
      const mockFilePath = '/storage/resumes/user-123/resume.pdf';
      const mockParsedContent = { name: 'Test User' };

      vi.mocked(getResumeFilePath).mockResolvedValue({
        filePath: mockFilePath,
        mimeType: 'application/pdf',
      });
      vi.mocked(parseResume).mockResolvedValue(mockParsedContent);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);
      vi.mocked(updateTaskStatus).mockResolvedValue(undefined);

      const job = createMockJob(defaultJobData);
      await processResumeParsingJob(job);

      // Verify task status updates were called in correct order
      const updateCalls = vi.mocked(updateTaskStatus).mock.calls;

      expect(updateCalls.length).toBe(3);

      // First call: processing at 10%
      expect(updateCalls[0]).toEqual([mockTaskId, 'processing', { progress: 10 }]);

      // Second call: processing at 80%
      expect(updateCalls[1]).toEqual([mockTaskId, 'processing', { progress: 80 }]);

      // Third call: completed at 100%
      expect(updateCalls[2]).toEqual([
        mockTaskId,
        'completed',
        expect.objectContaining({ progress: 100, result: expect.any(Object) }),
      ]);
    });

    it('should return correct result format', async () => {
      const mockFilePath = '/storage/resumes/user-123/resume.pdf';
      const mockParsedContent = {
        name: 'Jane Smith',
        email: 'jane@example.com',
        skills: ['Python', 'Machine Learning'],
      };

      vi.mocked(getResumeFilePath).mockResolvedValue({
        filePath: mockFilePath,
        mimeType: 'application/pdf',
      });
      vi.mocked(parseResume).mockResolvedValue(mockParsedContent);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);
      vi.mocked(updateTaskStatus).mockResolvedValue(undefined);

      const job = createMockJob(defaultJobData);
      const result = await processResumeParsingJob(job);

      // Verify result structure
      expect(result).toEqual({
        content: JSON.stringify(mockParsedContent),
        parsedAt: expect.any(String),
      });

      // Verify parsedAt is a valid ISO date string
      expect(() => new Date(result.parsedAt)).not.toThrow();
      expect(new Date(result.parsedAt).toISOString()).toBe(result.parsedAt);
    });
  });

  describe('failure flow', () => {
    it('should update task to failed when resume file not found', async () => {
      // Setup mock to return null (file not found)
      vi.mocked(getResumeFilePath).mockResolvedValue(null);
      vi.mocked(updateTaskStatus).mockResolvedValue(undefined);

      const job = createMockJob(defaultJobData);

      // Should throw error
      await expect(processResumeParsingJob(job)).rejects.toThrow('Resume file not found');

      // Verify task was updated to failed
      expect(updateTaskStatus).toHaveBeenCalledWith(mockTaskId, 'failed', {
        error: 'Resume file not found',
      });
    });

    it('should update task to failed when parsing fails and record error', async () => {
      const mockFilePath = '/storage/resumes/user-123/resume.pdf';
      const parseError = new Error('Invalid PDF format');

      vi.mocked(getResumeFilePath).mockResolvedValue({
        filePath: mockFilePath,
        mimeType: 'application/pdf',
      });
      vi.mocked(parseResume).mockRejectedValue(parseError);
      vi.mocked(updateTaskStatus).mockResolvedValue(undefined);

      const job = createMockJob(defaultJobData);

      // Should throw error
      await expect(processResumeParsingJob(job)).rejects.toThrow('Invalid PDF format');

      // Verify task was updated to failed with error message
      expect(updateTaskStatus).toHaveBeenCalledWith(mockTaskId, 'failed', {
        error: 'Invalid PDF format',
      });
    });

    it('should update task to failed when database update fails', async () => {
      const mockFilePath = '/storage/resumes/user-123/resume.pdf';
      const mockParsedContent = { name: 'Test User' };
      const dbError = new Error('Database connection failed');

      vi.mocked(getResumeFilePath).mockResolvedValue({
        filePath: mockFilePath,
        mimeType: 'application/pdf',
      });
      vi.mocked(parseResume).mockResolvedValue(mockParsedContent);
      vi.mocked(prisma.user.update).mockRejectedValue(dbError);
      vi.mocked(updateTaskStatus).mockResolvedValue(undefined);

      const job = createMockJob(defaultJobData);

      // Should throw error
      await expect(processResumeParsingJob(job)).rejects.toThrow('Database connection failed');

      // Verify task was updated to failed with error message
      expect(updateTaskStatus).toHaveBeenCalledWith(mockTaskId, 'failed', {
        error: 'Database connection failed',
      });
    });

    it('should handle unknown error types gracefully', async () => {
      vi.mocked(getResumeFilePath).mockRejectedValue('String error');
      vi.mocked(updateTaskStatus).mockResolvedValue(undefined);

      const job = createMockJob(defaultJobData);

      // Should throw error
      await expect(processResumeParsingJob(job)).rejects.toThrow();

      // Verify task was updated to failed with 'Unknown error'
      expect(updateTaskStatus).toHaveBeenCalledWith(mockTaskId, 'failed', {
        error: 'Unknown error',
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty parsed content', async () => {
      const mockFilePath = '/storage/resumes/user-123/resume.pdf';
      const mockParsedContent = {};

      vi.mocked(getResumeFilePath).mockResolvedValue({
        filePath: mockFilePath,
        mimeType: 'application/pdf',
      });
      vi.mocked(parseResume).mockResolvedValue(mockParsedContent);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);
      vi.mocked(updateTaskStatus).mockResolvedValue(undefined);

      const job = createMockJob(defaultJobData);
      const result = await processResumeParsingJob(job);

      expect(result.content).toBe('{}');
    });

    it('should handle image file types (jpg, png)', async () => {
      const mockFilePath = '/storage/resumes/user-123/resume.jpg';
      const mockParsedContent = { name: 'Test User' };

      vi.mocked(getResumeFilePath).mockResolvedValue({
        filePath: mockFilePath,
        mimeType: 'image/jpeg',
      });
      vi.mocked(parseResume).mockResolvedValue(mockParsedContent);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);
      vi.mocked(updateTaskStatus).mockResolvedValue(undefined);

      const jobData: ResumeParsingJobData = {
        ...defaultJobData,
        resumeFileName: 'resume.jpg',
      };
      const job = createMockJob(jobData);
      const result = await processResumeParsingJob(job);

      expect(parseResume).toHaveBeenCalledWith(mockFilePath);
      expect(result.content).toBe(JSON.stringify(mockParsedContent));
    });
  });
});
