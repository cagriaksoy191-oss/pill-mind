/** @jest-environment jsdom */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CoveragePanel from '../components/CoveragePanel';

describe('CoveragePanel', () => {
  const defaultProps = {
    showCoveragePanel: true,
    setShowCoveragePanel: jest.fn(),
    isCoverageLoading: false,
    coverageExplanation: null,
    handleRequestCoverageExplanation: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render when showCoveragePanel is false', () => {
    const { container } = render(<CoveragePanel {...defaultProps} showCoveragePanel={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('calls setShowCoveragePanel(false) when close button is clicked', () => {
    render(<CoveragePanel {...defaultProps} />);
    const closeBtn = screen.getByText('✕');
    fireEvent.click(closeBtn);
    expect(defaultProps.setShowCoveragePanel).toHaveBeenCalledWith(false);
  });

  it('renders loading state when isCoverageLoading is true', () => {
    render(<CoveragePanel {...defaultProps} isCoverageLoading={true} />);
    expect(screen.getByText(/Tüm Kombinasyon Canlı Yapay Zekayla Analiz Ediliyor/i)).toBeInTheDocument();
  });

  it('renders live explanation when source is gemini_live', () => {
    const coverageExplanation = {
      source: 'gemini_live',
      explanation: 'Live analysis explanation',
      generatedAt: '12:00',
    };
    render(<CoveragePanel {...defaultProps} coverageExplanation={coverageExplanation} />);
    expect(screen.getByText('Canlı Analiz')).toBeInTheDocument();
    expect(screen.getByText('12:00')).toBeInTheDocument();
    expect(screen.getByText('Live analysis explanation')).toBeInTheDocument();
    expect(screen.getByText(/Klinik Uyarı:/i)).toBeInTheDocument();
  });

  it('renders cache explanation when source is cache', () => {
    const coverageExplanation = {
      source: 'cache',
      explanation: 'Cache analysis explanation',
      generatedAt: '12:00',
    };
    render(<CoveragePanel {...defaultProps} coverageExplanation={coverageExplanation} />);
    expect(screen.getByText('Önbellek Yanıtı')).toBeInTheDocument();
    expect(screen.getByText('12:00')).toBeInTheDocument();
    expect(screen.getByText('Cache analysis explanation')).toBeInTheDocument();
    expect(screen.getByText(/Klinik Uyarı:/i)).toBeInTheDocument();
  });

  it('renders error state and retry button when source is error', () => {
    const coverageExplanation = {
      source: 'error',
      error: 'An error occurred during analysis',
    };
    render(<CoveragePanel {...defaultProps} coverageExplanation={coverageExplanation} />);
    expect(screen.getByText('Analiz Tamamlanamadı')).toBeInTheDocument();
    expect(screen.getByText('An error occurred during analysis')).toBeInTheDocument();

    const retryBtn = screen.getByText('Yeniden Dene');
    fireEvent.click(retryBtn);
    expect(defaultProps.handleRequestCoverageExplanation).toHaveBeenCalledTimes(1);
  });

  it('renders default error message when source is error and no error text provided', () => {
    const coverageExplanation = {
      source: 'error',
    };
    render(<CoveragePanel {...defaultProps} coverageExplanation={coverageExplanation} />);
    expect(screen.getByText('Canlı kombinasyon açıklaması şu anda sunulamıyor.')).toBeInTheDocument();
  });
});
