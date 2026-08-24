/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PatientMode } from '../components/ExplanationDrawerModes/PatientMode';

describe('PatientMode', () => {
  const mockOnExplainRequested = jest.fn();
  const defaultProps = {
    interactionId: 'int-456',
    onExplainRequested: mockOnExplainRequested,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state when isExplanationLoading is true', () => {
    render(<PatientMode {...defaultProps} isExplanationLoading={true} />);
    expect(screen.getByText('Klinik Canlı AI Açıklaması Hazırlanıyor...')).toBeInTheDocument();
  });

  it('renders cached explanation when source is "cache"', () => {
    const explanationData = {
      source: 'cache',
      explanation: 'Önbellekten alınan klinik açıklama.',
      generatedAt: '12:34:56',
    };
    render(<PatientMode {...defaultProps} explanationData={explanationData} />);

    expect(screen.getByText('Klinik Güvenlik Katmanı')).toBeInTheDocument();
    expect(screen.getByText('Güvenli Önbellek Yanıtı')).toBeInTheDocument();
    expect(screen.getByText('12:34:56')).toBeInTheDocument();
    expect(screen.getByText('Önbellekten alınan klinik açıklama.')).toBeInTheDocument();
  });

  it('renders live AI explanation when source is "gemini_live"', () => {
    const explanationData = {
      source: 'gemini_live',
      explanation: 'Canlı AI tarafından oluşturulan açıklama.',
    };
    render(<PatientMode {...defaultProps} explanationData={explanationData} />);

    expect(screen.getByText('Canlı AI Açıklaması')).toBeInTheDocument();
    expect(screen.getByText('Canlı AI tarafından oluşturulan açıklama.')).toBeInTheDocument();
  });

  it.each([
    ['rate_limited', 'Canlı AI Şu Anda Kullanılamıyor'],
    ['timeout', 'Canlı AI Şu Anda Kullanılamıyor'],
    ['missing_api_key', 'Canlı AI Kapalı'],
    ['demo_mode', 'Canlı AI Kapalı'],
    ['unknown_reason', 'Canlı AI Açıklaması Alınamadı'],
    [undefined, 'Canlı AI Açıklaması Alınamadı'],
  ])('renders error status title for reason "%s"', (reason, expectedTitle) => {
    const explanationData = {
      source: 'error',
      reason,
      error: 'Bir hata oluştu.',
    };
    render(<PatientMode {...defaultProps} explanationData={explanationData} />);

    expect(screen.getByText(expectedTitle)).toBeInTheDocument();
    expect(screen.getByText('Bir hata oluştu.')).toBeInTheDocument();
  });

  it('renders default error message fallback when error is omitted', () => {
    const explanationData = {
      source: 'error',
    };
    render(<PatientMode {...defaultProps} explanationData={explanationData} />);

    expect(screen.getByText('Canlı AI açıklaması şu anda üretilemedi.')).toBeInTheDocument();
  });

  it('calls onExplainRequested with force=true when "Tekrar Dene" button is clicked', () => {
    const explanationData = {
      source: 'error',
      reason: 'rate_limited',
    };
    render(<PatientMode {...defaultProps} explanationData={explanationData} />);

    const button = screen.getByRole('button', { name: 'Tekrar Dene' });
    fireEvent.click(button);

    expect(mockOnExplainRequested).toHaveBeenCalledTimes(1);
    expect(mockOnExplainRequested).toHaveBeenCalledWith('int-456', true);
  });

  it('renders empty fallback state when explanationData is missing or source is unknown', () => {
    render(<PatientMode {...defaultProps} />);

    expect(
      screen.getByText('Canlı açıklama henüz alınmadı. Lütfen tekrar deneyin.')
    ).toBeInTheDocument();
  });
});
