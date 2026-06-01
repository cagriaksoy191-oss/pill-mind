/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import InteractionList from '../components/InteractionList';

describe('InteractionList', () => {
  const mockOnExplainRequested = jest.fn();
  const mockHandleRequestCoverageExplanation = jest.fn();

  const mockInteractions = [
    {
      interaction: {
        id: 'int-1',
        drug1: 'd1',
        drug2: 'd2',
        severity: 'high' as const,
        summary: 'Major interaction',
        source: 'TestSource',
      },
      drug1Name: 'Aspirin',
      drug2Name: 'Ibuprofen',
    },
    {
      interaction: {
        id: 'int-2',
        drug1: 'd2',
        drug2: 'd3',
        severity: 'medium' as const,
        summary: 'Moderate interaction',
        source: 'TestSource',
      },
      drug1Name: 'Ibuprofen',
      drug2Name: 'Paracetamol',
    }
  ];

  const defaultProps = {
    interactions: mockInteractions,
    explanations: {},
    loadingExplanations: {},
    onExplainRequested: mockOnExplainRequested,
    handleRequestCoverageExplanation: mockHandleRequestCoverageExplanation,
    isCoverageLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a list of ResultCards', () => {
    render(<InteractionList {...defaultProps} />);

    // Check if both interactions are rendered (using some text from the ResultCards)
    expect(screen.getByText('Major interaction')).toBeInTheDocument();
    expect(screen.getByText('Moderate interaction')).toBeInTheDocument();
  });

  it('renders the coverage explanation section correctly when not loading', () => {
    render(<InteractionList {...defaultProps} />);

    // Use regular expression since text content might have split spans
    expect(screen.getByText(/Tüm Kombinasyonun Canlı AI Analizi/i)).toBeInTheDocument();

    const button = screen.getByRole('button', { name: 'Kapsamlı Canlı AI Analizi Yap' });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it('renders the coverage explanation section correctly when loading', () => {
    render(<InteractionList {...defaultProps} isCoverageLoading={true} />);

    const button = screen.getByRole('button', { name: /Yükleniyor.../i });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it('calls handleRequestCoverageExplanation when the button is clicked', () => {
    render(<InteractionList {...defaultProps} />);

    const button = screen.getByRole('button', { name: 'Kapsamlı Canlı AI Analizi Yap' });
    fireEvent.click(button);

    expect(mockHandleRequestCoverageExplanation).toHaveBeenCalledTimes(1);
  });
});
