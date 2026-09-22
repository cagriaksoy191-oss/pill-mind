/** @jest-environment jsdom */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CoverageClinicalView from '@/components/CoveragePanelSections/CoverageClinicalView';
import { getEvidenceLevelBadge } from '@/lib/utils/badges';
import { CheckResult } from '@/lib/interactions';

jest.mock('@/lib/utils/badges', () => ({
  getEvidenceLevelBadge: jest.fn(),
}));

describe('CoverageClinicalView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getEvidenceLevelBadge as jest.Mock).mockReturnValue({
      label: 'FDA Onaylı',
      style: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      desc: 'FDA Onaylı Prospektüs Verisi',
    });
  });

  it('renders section title', () => {
    render(<CoverageClinicalView interactions={[]} />);
    expect(screen.getByText(/Deterministik Klinik Kanıt Verileri/i)).toBeInTheDocument();
  });

  it('renders empty state message when interactions array is empty or undefined', () => {
    const { rerender } = render(<CoverageClinicalView interactions={[]} />);
    expect(
      screen.getByText('Kombinasyon içinde bilinen ikili klinik etkileşim kaydı bulunmamaktadır.')
    ).toBeInTheDocument();

    rerender(<CoverageClinicalView />);
    expect(
      screen.getByText('Kombinasyon içinde bilinen ikili klinik etkileşim kaydı bulunmamaktadır.')
    ).toBeInTheDocument();
  });

  it('renders interactions with evidence level badges and drug names', () => {
    const mockInteractions: CheckResult[] = [
      {
        drug1Name: 'Aspirin',
        drug2Name: 'Warfarin',
        interaction: {
          id: 'int-1',
          drug1: 'd1',
          drug2: 'd2',
          severity: 'high',
          summary: 'Increased risk of bleeding',
          evidenceLevel: 'FDA_APPROVED',
          clinicalDetail: 'Detailed clinical mechanism of Aspirin + Warfarin',
          source: 'FDA Label',
        },
      },
    ];

    render(<CoverageClinicalView interactions={mockInteractions} />);

    expect(screen.getByText('Aspirin & Warfarin')).toBeInTheDocument();
    expect(screen.getByText('FDA Onaylı')).toBeInTheDocument();
    expect(getEvidenceLevelBadge).toHaveBeenCalledWith('FDA_APPROVED');
    expect(screen.getByText('Detailed clinical mechanism of Aspirin + Warfarin')).toBeInTheDocument();
  });

  it('falls back to summary when clinicalDetail is not present', () => {
    const mockInteractions: CheckResult[] = [
      {
        drug1Name: 'Paracetamol',
        drug2Name: 'Alcohol',
        interaction: {
          id: 'int-2',
          drug1: 'd1',
          drug2: 'd2',
          severity: 'medium',
          summary: 'Hepatotoxicity risk',
          source: 'Clinical Guideline',
        },
      },
    ];

    render(<CoverageClinicalView interactions={mockInteractions} />);

    expect(screen.getByText('Paracetamol & Alcohol')).toBeInTheDocument();
    expect(screen.getByText('Hepatotoxicity risk')).toBeInTheDocument();
  });

  it('parses and renders references with PubMed and Google URLs, ignoring empty entries', () => {
    const mockInteractions: CheckResult[] = [
      {
        drug1Name: 'DrugA',
        drug2Name: 'DrugB',
        interaction: {
          id: 'int-3',
          drug1: 'da',
          drug2: 'db',
          severity: 'low',
          summary: 'Minor interaction',
          source: 'PubMed 123456; Medical Study 2023;  ; ',
        },
      },
    ];

    render(<CoverageClinicalView interactions={mockInteractions} />);

    expect(screen.getByText('Referanslar:')).toBeInTheDocument();

    const pubmedLink = screen.getByText('PubMed 123456') as HTMLAnchorElement;
    expect(pubmedLink).toBeInTheDocument();
    expect(pubmedLink.tagName).toBe('A');
    expect(pubmedLink.href).toBe('https://pubmed.ncbi.nlm.nih.gov/?term=PubMed%20123456');
    expect(pubmedLink.target).toBe('_blank');
    expect(pubmedLink.rel).toBe('noopener noreferrer');

    const googleLink = screen.getByText('Medical Study 2023') as HTMLAnchorElement;
    expect(googleLink).toBeInTheDocument();
    expect(googleLink.tagName).toBe('A');
    expect(googleLink.href).toBe('https://www.google.com/search?q=Medical%20Study%202023');
    expect(googleLink.target).toBe('_blank');

    const allLinks = screen.getAllByRole('link');
    expect(allLinks).toHaveLength(2);
  });
});
