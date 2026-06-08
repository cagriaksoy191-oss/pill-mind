/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ExplanationDrawer from '../components/ExplanationDrawer';

describe('ExplanationDrawer', () => {
  const mockOnExplainRequested = jest.fn();

  const defaultProps = {
    isOpen: true,
    interactionId: 'int-123',
    onExplainRequested: mockOnExplainRequested,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when isOpen is false', () => {
    const { container } = render(<ExplanationDrawer {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('displays a loading spinner when isExplanationLoading is true', () => {
    render(<ExplanationDrawer {...defaultProps} isExplanationLoading={true} />);
    expect(screen.getByText('Klinik Canlı AI Açıklaması Hazırlanıyor...')).toBeInTheDocument();
  });

  it('renders a cached explanation when source is cache', () => {
    const explanationData = {
      source: 'cache',
      explanation: 'This is a cached explanation.',
      generatedAt: '2023-01-01',
    };
    render(<ExplanationDrawer {...defaultProps} explanationData={explanationData} />);
    expect(screen.getByText('Güvenli Önbellek Yanıtı')).toBeInTheDocument();
    expect(screen.getByText('This is a cached explanation.')).toBeInTheDocument();
    expect(screen.getByText('2023-01-01')).toBeInTheDocument();
  });

  it('renders a live AI explanation when source is gemini_live', () => {
    const explanationData = {
      source: 'gemini_live',
      explanation: 'This is a live AI explanation.',
    };
    render(<ExplanationDrawer {...defaultProps} explanationData={explanationData} />);
    expect(screen.getByText('Canlı AI Açıklaması')).toBeInTheDocument();
    expect(screen.getByText('This is a live AI explanation.')).toBeInTheDocument();
  });

  it('renders an error state and correctly triggers onExplainRequested when Tekrar Dene is clicked', () => {
    const explanationData = {
      source: 'error',
      reason: 'rate_limited',
      error: 'API limit exceeded',
    };
    render(<ExplanationDrawer {...defaultProps} explanationData={explanationData} />);
    expect(screen.getByText('Canlı AI Şu Anda Kullanılamıyor')).toBeInTheDocument();
    expect(screen.getByText('API limit exceeded')).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: 'Tekrar Dene' });
    fireEvent.click(retryButton);
    expect(mockOnExplainRequested).toHaveBeenCalledWith('int-123', true);
  });

  it('displays the deterministic badge when verificationStatus is verified', () => {
    render(<ExplanationDrawer {...defaultProps} verificationStatus="verified" />);
    expect(screen.getByText('Deterministik Klinik Kanıtı')).toBeInTheDocument();
  });

  it('displays the source label and link when provided', () => {
    render(<ExplanationDrawer {...defaultProps} sourceLabel="Drugs.com" source="https://drugs.com" />);
    expect(screen.getByText('📖 Kaynak: Drugs.com')).toBeInTheDocument();
    expect(screen.getByTitle('https://drugs.com')).toBeInTheDocument();
  });

  it('displays a default message when explanationData is missing', () => {
    render(<ExplanationDrawer {...defaultProps} />);
    expect(screen.getByText('Canlı açıklama henüz alınmadı. Lütfen tekrar deneyin.')).toBeInTheDocument();
  });
});
