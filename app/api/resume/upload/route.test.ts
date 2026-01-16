/**
 * Resume Upload API Tests
 * Tests POST /api/resume/upload endpoint
 *
 * @vitest-environment node
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

// ============================================================
// Mocks - Define mock functions first
// ============================================================

const mockSaveResumeFile = vi.fn();
const mockIsAllowedResumeType = vi.fn();
const mockValidateFileSignature = vi.fn();
const mockRequireAuth = vi.fn();
const mockUserUpdate = vi.fn();
const mockBackgroundTaskCreate = vi.fn();
const mockGetResumeParsingQueue = vi.fn();
const mockIsRedisAvailable = vi.fn();

vi.mock('@/lib/db', () => ({
  prisma: {
    user: { update: mockUserUpdate },
    backgroundTask: { create: mockBackgroundTaskCreate },
  },
}));

vi.mock('@/lib/auth/require-auth', () => ({
  requireAuth: mockRequireAuth,
}));

vi.mock('@/lib/resume', () => ({
  saveResumeFile: mockSaveResumeFile,
  isAllowedResumeType: mockIsAllowedResumeType,
  validateFileSignature: mockValidateFileSignature,
  RESUME_CONSTRAINTS: { maxFileSize: 10 * 1024 * 1024 },
}));

vi.mock('@/lib/queue/queues', () => ({
  getResumeParsingQueue: mockGetResumeParsingQueue,
}));

vi.mock('@/lib/queue/connection', () => ({
  isRedisAvailable: mockIsRedisAvailable,
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

// Import route handler after mocks
const { POST } = await import('@/app/api/resume/upload/route');

// ============================================================
// Test Helpers
// ============================================================

/**
 * Create a mock File with specified options
 */
function createMockFile(options: {
  name?: string;
  type?: string;
  size?: number;
  content?: string;
}): File {
  const { name = 'resume.pdf', type = 'application/pdf', size, content = 'mock content' } = options;

  // If size is specified and larger than content, pad with zeros
  let fileContent = content;
  if (size && size > content.length) {
    fileContent = content + '\0'.repeat(size - content.length);
  }

  const blob = new Blob([fileContent], { type });
  return new File([blob], name, { type });
}

/**
 * Create a mock PDF file with proper magic number
 */
function createMockPdfFile(name = 'resume.pdf', size?: number): File {
  // PDF magic number: %PDF
  const pdfContent = '%PDF-1.4 mock pdf content';
  return createMockFile({ name, type: 'application/pdf', size, content: pdfContent });
}

/**
 * Create a mock Request with file upload
 */
function createUploadRequest(file: File): Request {
  const formData = new FormData();
  formData.append('file', file);
  return new Request('http://localhost/api/resume/upload', {
    method: 'POST',
    body: formData,
  });
}

/**
 * Create a mock Request without file
 */
function createEmptyUploadRequest(): Request {
  const formData = new FormData();
  return new Request('http://localhost/api/resume/upload', {
    method: 'POST',
    body: formData,
  });
}

// ============================================================
// Tests
// ============================================================

describe('POST /api/resume/upload', () => {
  const mockUserId = 'user-123';
  const mockTaskId = 'task-456';

  beforeEach(() => {
    vi.clearAllMocks();

    // Default: user is authenticated
    mockRequireAuth.mockResolvedValue(mockUserId);

    // Default: file type is allowed
    mockIsAllowedResumeType.mockReturnValue(true);

    // Default: file signature is valid
    mockValidateFileSignature.mockReturnValue(true);

    // Default: Redis is available
    mockIsRedisAvailable.mockReturnValue(true);
  });

  describe('authentication', () => {
    it('should return error when user is not authenticated', async () => {
      mockRequireAuth.mockRejectedValue(new Error('Unauthorized'));

      const file = createMockPdfFile();
      const request = createUploadRequest(file);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe('validation', () => {
    it('should return error when no file is provided', async () => {
      const request = createEmptyUploadRequest();

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.field).toBe('file');
    });

    it('should return error when file type is not allowed', async () => {
      mockIsAllowedResumeType.mockReturnValue(false);

      const file = createMockFile({ name: 'document.txt', type: 'text/plain' });
      const request = createUploadRequest(file);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Invalid file type');
    });

    it('should return error when file is too large', async () => {
      // Create a file larger than 10MB
      const largeContent = 'x'.repeat(11 * 1024 * 1024);
      const file = createMockFile({
        name: 'large-resume.pdf',
        type: 'application/pdf',
        content: largeContent,
      });
      const request = createUploadRequest(file);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('File too large');
    });

    it('should return error when file name contains path traversal characters (..)', async () => {
      const file = createMockFile({ name: '../../../etc/passwd', type: 'application/pdf' });
      const request = createUploadRequest(file);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Invalid file name');
    });

    it('should return error when file name contains forward slash', async () => {
      const file = createMockFile({ name: 'path/to/resume.pdf', type: 'application/pdf' });
      const request = createUploadRequest(file);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Invalid file name');
    });

    it('should return error when file name contains backslash', async () => {
      const file = createMockFile({ name: 'path\\to\\resume.pdf', type: 'application/pdf' });
      const request = createUploadRequest(file);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Invalid file name');
    });

    it('should return error when file signature does not match declared type', async () => {
      mockValidateFileSignature.mockReturnValue(false);

      const file = createMockFile({ name: 'fake.pdf', type: 'application/pdf', content: 'GIF89a' });
      const request = createUploadRequest(file);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('File content does not match declared file type');
    });
  });

  describe('success flow', () => {
    const mockResumeUrl = '/api/resume/file?ext=pdf';

    beforeEach(() => {
      // Setup successful save
      mockSaveResumeFile.mockResolvedValue({
        url: mockResumeUrl,
        filePath: '/storage/resumes/user-123/resume.pdf',
        fileName: 'resume.pdf',
      });

      // Setup database update
      mockUserUpdate.mockResolvedValue({});

      // Setup background task creation
      mockBackgroundTaskCreate.mockResolvedValue({
        id: mockTaskId,
        userId: mockUserId,
        type: 'resume_parsing',
        status: 'pending',
        progress: 0,
      });

      // Setup queue
      const mockQueue = {
        add: vi.fn().mockResolvedValue({ id: mockTaskId }),
      };
      mockGetResumeParsingQueue.mockReturnValue(mockQueue);
    });

    it('should return correct response on successful upload', async () => {
      const file = createMockPdfFile();
      const request = createUploadRequest(file);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('url', mockResumeUrl);
      expect(data.data).toHaveProperty('fileName', 'resume.pdf');
      expect(data.data).toHaveProperty('content', null);
      expect(data.data).toHaveProperty('taskId', mockTaskId);
      expect(data.data).toHaveProperty('updatedAt');
    });

    it('should save file to disk via saveResumeFile', async () => {
      const file = createMockPdfFile('my-resume.pdf');
      const request = createUploadRequest(file);

      await POST(request);

      expect(mockSaveResumeFile).toHaveBeenCalledWith(
        mockUserId,
        expect.any(Buffer),
        'application/pdf',
        'my-resume.pdf'
      );
    });

    it('should update database with file info', async () => {
      const file = createMockPdfFile();
      const request = createUploadRequest(file);

      await POST(request);

      expect(mockUserUpdate).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: expect.objectContaining({
          resumeUrl: mockResumeUrl,
          resumeFileName: 'resume.pdf',
          resumeContent: null,
          resumeUpdatedAt: expect.any(Date),
        }),
      });
    });

    it('should create background task when Redis is available', async () => {
      const file = createMockPdfFile();
      const request = createUploadRequest(file);

      await POST(request);

      expect(mockBackgroundTaskCreate).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          type: 'resume_parsing',
          status: 'pending',
          progress: 0,
        },
      });
    });

    it('should add job to queue when Redis is available', async () => {
      const file = createMockPdfFile();
      const request = createUploadRequest(file);

      await POST(request);

      const mockQueue = mockGetResumeParsingQueue();
      expect(mockQueue.add).toHaveBeenCalledWith(
        'parse-resume',
        expect.objectContaining({
          taskId: mockTaskId,
          userId: mockUserId,
          resumeUrl: mockResumeUrl,
          resumeFileName: 'resume.pdf',
        }),
        expect.objectContaining({
          jobId: mockTaskId,
        })
      );
    });

    it('should handle JPG file upload', async () => {
      mockSaveResumeFile.mockResolvedValue({
        url: '/api/resume/file?ext=jpg',
        filePath: '/storage/resumes/user-123/resume.jpg',
        fileName: 'photo.jpg',
      });

      const file = createMockFile({ name: 'photo.jpg', type: 'image/jpeg' });
      const request = createUploadRequest(file);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockIsAllowedResumeType).toHaveBeenCalledWith('image/jpeg');
    });

    it('should handle PNG file upload', async () => {
      mockSaveResumeFile.mockResolvedValue({
        url: '/api/resume/file?ext=png',
        filePath: '/storage/resumes/user-123/resume.png',
        fileName: 'resume-image.png',
      });

      const file = createMockFile({ name: 'resume-image.png', type: 'image/png' });
      const request = createUploadRequest(file);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockIsAllowedResumeType).toHaveBeenCalledWith('image/png');
    });
  });

  describe('edge cases', () => {
    it('should skip queue when Redis is not available but still succeed', async () => {
      mockIsRedisAvailable.mockReturnValue(false);

      mockSaveResumeFile.mockResolvedValue({
        url: '/api/resume/file?ext=pdf',
        filePath: '/storage/resumes/user-123/resume.pdf',
        fileName: 'resume.pdf',
      });
      mockUserUpdate.mockResolvedValue({});

      const file = createMockPdfFile();
      const request = createUploadRequest(file);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.taskId).toBeNull(); // No background task created

      // Background task should NOT be created
      expect(mockBackgroundTaskCreate).not.toHaveBeenCalled();

      // Queue should NOT be accessed
      expect(mockGetResumeParsingQueue).not.toHaveBeenCalled();
    });

    it('should handle saveResumeFile failure gracefully', async () => {
      mockSaveResumeFile.mockRejectedValue(new Error('Disk write failed'));

      const file = createMockPdfFile();
      const request = createUploadRequest(file);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should handle database update failure gracefully', async () => {
      mockSaveResumeFile.mockResolvedValue({
        url: '/api/resume/file?ext=pdf',
        filePath: '/storage/resumes/user-123/resume.pdf',
        fileName: 'resume.pdf',
      });
      mockUserUpdate.mockRejectedValue(new Error('Database error'));

      const file = createMockPdfFile();
      const request = createUploadRequest(file);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should handle invalid form data gracefully', async () => {
      // Create request with invalid body (not multipart/form-data)
      const request = new Request('http://localhost/api/resume/upload', {
        method: 'POST',
        body: 'invalid body',
        headers: {
          'Content-Type': 'text/plain',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('BAD_REQUEST');
    });

    it('should handle queue job add failure gracefully', async () => {
      mockSaveResumeFile.mockResolvedValue({
        url: '/api/resume/file?ext=pdf',
        filePath: '/storage/resumes/user-123/resume.pdf',
        fileName: 'resume.pdf',
      });
      mockUserUpdate.mockResolvedValue({});
      mockBackgroundTaskCreate.mockResolvedValue({
        id: mockTaskId,
        userId: mockUserId,
        type: 'resume_parsing',
        status: 'pending',
        progress: 0,
      });

      const mockQueue = {
        add: vi.fn().mockRejectedValue(new Error('Queue error')),
      };
      mockGetResumeParsingQueue.mockReturnValue(mockQueue);

      const file = createMockPdfFile();
      const request = createUploadRequest(file);

      const response = await POST(request);
      const data = await response.json();

      // Should still fail because queue add failed
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe('file validation calls', () => {
    it('should call isAllowedResumeType with file MIME type', async () => {
      const file = createMockPdfFile();
      const request = createUploadRequest(file);

      mockIsAllowedResumeType.mockReturnValue(false);

      await POST(request);

      expect(mockIsAllowedResumeType).toHaveBeenCalledWith('application/pdf');
    });

    it('should call validateFileSignature with buffer and MIME type', async () => {
      mockSaveResumeFile.mockResolvedValue({
        url: '/api/resume/file?ext=pdf',
        filePath: '/storage/resumes/user-123/resume.pdf',
        fileName: 'resume.pdf',
      });
      mockUserUpdate.mockResolvedValue({});
      mockBackgroundTaskCreate.mockResolvedValue({
        id: mockTaskId,
        userId: mockUserId,
        type: 'resume_parsing',
        status: 'pending',
        progress: 0,
      });
      const mockQueue = {
        add: vi.fn().mockResolvedValue({ id: mockTaskId }),
      };
      mockGetResumeParsingQueue.mockReturnValue(mockQueue);

      const file = createMockPdfFile();
      const request = createUploadRequest(file);

      await POST(request);

      expect(mockValidateFileSignature).toHaveBeenCalledWith(expect.any(Buffer), 'application/pdf');
    });
  });
});
