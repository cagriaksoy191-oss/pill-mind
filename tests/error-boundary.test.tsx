/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '../app/error';
import * as Sentry from '@sentry/nextjs';

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}));

describe('Global Error Boundary', () => {
  let originalConsoleError: typeof console.error;

  beforeAll(() => {
    // Suppress console.error during tests
    originalConsoleError = console.error;
    console.error = jest.fn();
  });

  afterAll(() => {
    // Restore console.error
    console.error = originalConsoleError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the error message and reports to Sentry', () => {
    const mockError = new Error('Test error message') as Error & { digest?: string };
    mockError.digest = 'test-digest-123';
    const mockReset = jest.fn();

    render(<ErrorBoundary error={mockError} reset={mockReset} />);

    // Verify Sentry was called with the error
    expect(Sentry.captureException).toHaveBeenCalledWith(mockError);

    // Verify the UI elements
    expect(screen.getByText('Klinik Sistem')).toBeInTheDocument();
    expect(screen.getByText('Bağlantı Uyuşmazlığı')).toBeInTheDocument();
    expect(screen.getByText(/test-digest-123/)).toBeInTheDocument();
    expect(screen.getByText(/Test error message/)).toBeInTheDocument();
  });

  it('calls reset when the retry button is clicked', () => {
    const mockError = new Error('Test error') as Error & { digest?: string };
    const mockReset = jest.fn();

    render(<ErrorBoundary error={mockError} reset={mockReset} />);

    const retryButton = screen.getByText('🔄 Yeniden Dene');
    fireEvent.click(retryButton);

    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it('redirects to home when the return to home button is clicked', () => {
      const mockError = new Error('Test error') as Error & { digest?: string };
      const mockReset = jest.fn();

      // Mock window.location.href
      const originalWindowLocation = window.location;
      delete (window as any).location;
      window.location = { href: 'http://localhost/' } as any;

      render(<ErrorBoundary error={mockError} reset={mockReset} />);

      const homeButton = screen.getByText('Ana Sayfaya Dön');
      fireEvent.click(homeButton);

      expect(window.location.href).toBe(originalWindowLocation.origin + '/');

      // Restore window.location
      window.location = originalWindowLocation;
  });

  it('handles errors without a digest or message gracefully', () => {
      const mockError = new Error() as Error & { digest?: string };
      delete (mockError as any).message; // Force no message
      const mockReset = jest.fn();

      render(<ErrorBoundary error={mockError} reset={mockReset} />);

      expect(screen.getByText(/Bilinmeyen Kayıt/)).toBeInTheDocument();
      expect(screen.getByText(/Çalışma zamanı uyuşmazlığı\./)).toBeInTheDocument();
  });
});
