/**
 * Security utilities for file path validation
 * Centralized security-critical functions to prevent path traversal attacks
 */

import * as path from 'path';

// ============================================================
// Path Validation
// ============================================================

/**
 * Validate that a target path is within the expected base directory
 * Prevents path traversal attacks by ensuring resolved paths stay within boundaries
 *
 * @param targetPath - The path to validate
 * @param basePath - The base directory that targetPath must be within
 * @returns true if targetPath is within or equal to basePath
 *
 * @example
 * isPathWithinDirectory('/app/data/user/file.txt', '/app/data') // true
 * isPathWithinDirectory('/app/data/../etc/passwd', '/app/data') // false
 */
export function isPathWithinDirectory(targetPath: string, basePath: string): boolean {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedBase = path.resolve(basePath);
  return resolvedTarget.startsWith(resolvedBase + path.sep) || resolvedTarget === resolvedBase;
}
