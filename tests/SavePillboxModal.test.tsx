/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SavePillboxModal from '../components/SavePillboxModal';

// Mock global fetch
global.fetch = jest.fn();

describe('SavePillboxModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();
  const mockDrugIds = ['drug-1', 'drug-2'];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders correctly', () => {
    render(<SavePillboxModal selectedDrugIds={mockDrugIds} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    expect(screen.getByText('İlaç Kutunuzu Kaydedin')).toBeTruthy();
    expect(screen.getByText(/2 ilacı daha sonra kolayca yüklemek için/)).toBeTruthy();
  });

  it('calls onClose when close button is clicked', () => {
    render(<SavePillboxModal selectedDrugIds={mockDrugIds} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    const closeBtn = screen.getByLabelText('Kapat');
    fireEvent.click(closeBtn);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('does not submit if the input is empty or only whitespace', async () => {
    render(<SavePillboxModal selectedDrugIds={mockDrugIds} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    // Default is empty
    const submitBtn = screen.getByText('Buluta Kaydet');
    fireEvent.click(submitBtn);

    expect(global.fetch).not.toHaveBeenCalled();

    // Type spaces
    const input = screen.getByPlaceholderText('Örn: Sabah İlaçlarım, Tansiyon Tedavim');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(submitBtn);

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('submits successfully and calls onSuccess', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    render(<SavePillboxModal selectedDrugIds={mockDrugIds} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    const input = screen.getByPlaceholderText('Örn: Sabah İlaçlarım, Tansiyon Tedavim');
    fireEvent.change(input, { target: { value: 'My Pillbox' } });

    const submitBtn = screen.getByText('Buluta Kaydet');
    fireEvent.click(submitBtn);

    expect(global.fetch).toHaveBeenCalledWith('/api/pillbox/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'My Pillbox', drugIds: mockDrugIds }),
    });

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it('handles error from API response and alerts user', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Kutu zaten var.' })
    });

    render(<SavePillboxModal selectedDrugIds={mockDrugIds} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    const input = screen.getByPlaceholderText('Örn: Sabah İlaçlarım, Tansiyon Tedavim');
    fireEvent.change(input, { target: { value: 'My Pillbox' } });

    const submitBtn = screen.getByText('Buluta Kaydet');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Kutu zaten var.');
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
  });


  it('handles error from API response without specific error message and alerts user', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({})
    });

    render(<SavePillboxModal selectedDrugIds={mockDrugIds} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    const input = screen.getByPlaceholderText('Örn: Sabah İlaçlarım, Tansiyon Tedavim');
    fireEvent.change(input, { target: { value: 'My Pillbox' } });

    const submitBtn = screen.getByText('Buluta Kaydet');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Kaydedilemedi.');
    });
  });

  it('handles non-Error objects thrown and alerts user with default message', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce('Some string error');

    render(<SavePillboxModal selectedDrugIds={mockDrugIds} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    const input = screen.getByPlaceholderText('Örn: Sabah İlaçlarım, Tansiyon Tedavim');
    fireEvent.change(input, { target: { value: 'My Pillbox' } });

    const submitBtn = screen.getByText('Buluta Kaydet');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Kutu kaydedilirken bir hata oluştu.');
    });
  });

  it('handles network error and alerts user', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<SavePillboxModal selectedDrugIds={mockDrugIds} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    const input = screen.getByPlaceholderText('Örn: Sabah İlaçlarım, Tansiyon Tedavim');
    fireEvent.change(input, { target: { value: 'My Pillbox' } });

    const submitBtn = screen.getByText('Buluta Kaydet');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Network error');
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
  });
});
