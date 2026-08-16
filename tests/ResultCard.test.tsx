/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResultCard from '../components/ResultCard';

// Mock getSeverityLabel
jest.mock('@/lib/interactions', () => ({
  getSeverityLabel: (severity: string) => {
    switch (severity) {
      case 'high': return 'Yüksek Risk';
      case 'medium': return 'Orta Risk';
      case 'low': return 'Düşük Risk';
      default: return 'Bilinmeyen Risk';
    }
  }
}));

describe('ResultCard', () => {
  const mockOnExplainRequested = jest.fn();

  const defaultProps = {
    result: {
      drug1Name: 'Aspirin',
      drug2Name: 'Ibuprofen',
      interaction: {
        id: 'int-123',
        drug1: 'aspirin',
        drug2: 'ibuprofen',
        severity: 'high' as const,
        summary: 'Increased risk of bleeding.',
        source: 'TestSource',
      }
    },
    onExplainRequested: mockOnExplainRequested,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with given props', () => {
    render(<ResultCard {...defaultProps} />);

    expect(screen.getByText('Aspirin')).toBeInTheDocument();
    expect(screen.getByText('Ibuprofen')).toBeInTheDocument();
    expect(screen.getByText('Increased risk of bleeding.')).toBeInTheDocument();
    expect(screen.getByText('Yüksek Risk')).toBeInTheDocument();
  });

  it('toggles explanation detail when button is clicked', () => {
    render(<ResultCard {...defaultProps} />);

    // Initially not open
    expect(screen.queryByText('Klinik Güvenlik Katmanı')).not.toBeInTheDocument();

    const button = screen.getByRole('button', { name: /Klinik Canlı AI Açıklamasını Gör/i });
    fireEvent.click(button);

    // After click
    expect(mockOnExplainRequested).toHaveBeenCalledWith('int-123', true);
    expect(button).toHaveTextContent('Açıklama Detayını Gizle');
  });

  it('does not call onExplainRequested if already open or loading', () => {
    render(<ResultCard {...defaultProps} isExplanationLoading={true} />);

    const button = screen.getByRole('button', { name: /Klinik Canlı AI Açıklamasını Gör/i });
    fireEvent.click(button);

    // Still opens UI but should not trigger request because isExplanationLoading=true
    expect(screen.getByText('Klinik Canlı AI Açıklaması Hazırlanıyor...')).toBeInTheDocument();
    expect(mockOnExplainRequested).not.toHaveBeenCalled();
  });

  it('shows loading state correctly', () => {
    render(<ResultCard {...defaultProps} isExplanationLoading={true} />);

    const button = screen.getByRole('button', { name: /Klinik Canlı AI Açıklamasını Gör|Açıklama Detayını Gizle/i });
    fireEvent.click(button);

    expect(screen.getByText('Klinik Canlı AI Açıklaması Hazırlanıyor...')).toBeInTheDocument();
  });

  it('shows cached explanation data', () => {
    const propsWithCache = {
      ...defaultProps,
      explanationData: {
        explanation: 'This is a cached explanation.',
        source: 'cache',
        generatedAt: '2023-01-01',
      }
    };
    render(<ResultCard {...propsWithCache} />);

    const button = screen.getByRole('button', { name: /Klinik Canlı AI Açıklamasını Gör|Açıklama Detayını Gizle/i });
    fireEvent.click(button);

    expect(screen.getByText('Güvenli Önbellek Yanıtı')).toBeInTheDocument();
    expect(screen.getByText('This is a cached explanation.')).toBeInTheDocument();
    expect(screen.getByText('2023-01-01')).toBeInTheDocument();
  });

  it('shows live gemini explanation data', () => {
    const propsWithLive = {
      ...defaultProps,
      explanationData: {
        explanation: 'This is a live explanation.',
        source: 'gemini_live',
        generatedAt: '2023-01-02',
      }
    };
    render(<ResultCard {...propsWithLive} />);

    const button = screen.getByRole('button', { name: /Klinik Canlı AI Açıklamasını Gör|Açıklama Detayını Gizle/i });
    fireEvent.click(button);

    expect(screen.getByText('Canlı AI Açıklaması')).toBeInTheDocument();
    expect(screen.getByText('This is a live explanation.')).toBeInTheDocument();
  });

  it('shows error state when explanation fails', () => {
    const propsWithError = {
      ...defaultProps,
      explanationData: {
        source: 'error',
        reason: 'rate_limited',
        error: 'Too many requests'
      }
    };
    render(<ResultCard {...propsWithError} />);

    const button = screen.getByRole('button', { name: /Klinik Canlı AI Açıklamasını Gör|Açıklama Detayını Gizle/i });
    fireEvent.click(button);

    expect(screen.getByText('Canlı AI Şu Anda Kullanılamıyor')).toBeInTheDocument();
    expect(screen.getByText('Too many requests')).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: /Tekrar Dene/i });
    fireEvent.click(retryButton);
    expect(mockOnExplainRequested).toHaveBeenCalledWith('int-123', true);
  });

  it('displays deterministic verification badge', () => {
    const propsWithVerification = {
      ...defaultProps,
      result: {
        ...defaultProps.result,
        interaction: {
          ...defaultProps.result.interaction,
          verificationStatus: "verified"
        }
      }
    };
    render(<ResultCard {...propsWithVerification} />);

    const button = screen.getByRole('button', { name: /Klinik Canlı AI Açıklamasını Gör|Açıklama Detayını Gizle/i });
    fireEvent.click(button);

    expect(screen.getByText('Deterministik Klinik Kanıtı')).toBeInTheDocument();
  });

  it('displays source label when provided', () => {
    const propsWithSource = {
      ...defaultProps,
      result: {
        ...defaultProps.result,
        interaction: {
          ...defaultProps.result.interaction,
          sourceLabel: "Drugs.com",
          source: "https://drugs.com"
        }
      }
    };
    render(<ResultCard {...propsWithSource} />);

    const button = screen.getByRole('button', { name: /Klinik Canlı AI Açıklamasını Gör|Açıklama Detayını Gizle/i });
    fireEvent.click(button);

    expect(screen.getByText('📖 Kaynak: Drugs.com')).toBeInTheDocument();
    expect(screen.getByTitle('https://drugs.com')).toBeInTheDocument();
  });
});
