/**
 * Toast notification utility
 * Provides convenient wrapper functions for displaying toast messages
 */

import { addToast } from '@heroui/react';

/**
 * Toast message options
 */
export interface ToastOptions {
  /** Toast title */
  title: string;
  /** Optional description */
  description?: string;
  /** Duration before auto-dismiss (in milliseconds). Default: 5000 */
  timeout?: number;
}

/**
 * Shows a success toast notification
 *
 * @param options - Toast configuration options
 *
 * @example
 * showSuccessToast({ title: 'Success!', description: 'Your changes have been saved.' });
 */
export function showSuccessToast(options: ToastOptions): void {
  addToast({
    ...options,
    color: 'success',
    timeout: options.timeout ?? 5000,
  });
}

/**
 * Shows an error toast notification
 *
 * @param options - Toast configuration options
 *
 * @example
 * showErrorToast({ title: 'Error', description: 'Failed to save changes.' });
 */
export function showErrorToast(options: ToastOptions): void {
  addToast({
    ...options,
    color: 'danger',
    timeout: options.timeout ?? 5000,
  });
}

/**
 * Shows an info toast notification
 *
 * @param options - Toast configuration options
 *
 * @example
 * showInfoToast({ title: 'Info', description: 'Processing your request.' });
 */
export function showInfoToast(options: ToastOptions): void {
  addToast({
    ...options,
    color: 'primary',
    timeout: options.timeout ?? 5000,
  });
}

/**
 * Shows a warning toast notification
 *
 * @param options - Toast configuration options
 *
 * @example
 * showWarningToast({ title: 'Warning', description: 'Please check your input.' });
 */
export function showWarningToast(options: ToastOptions): void {
  addToast({
    ...options,
    color: 'warning',
    timeout: options.timeout ?? 5000,
  });
}
