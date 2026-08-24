/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ClinicalMode } from '../components/ExplanationDrawerModes/ClinicalMode';

describe('ClinicalMode', () => {
  const defaultEvidenceBadge = {
    label: 'YÜKSEK',
    desc: 'Yüksek Kanıt Seviyesi',
    style: 'bg-red-500/10 text-red-700 border-red-500/20',
  };

  it('renders evidence badge with style and description', () => {
    render(
      <ClinicalMode
        evidenceBadge={defaultEvidenceBadge}
        clinicalDetail="Sitochrom P450 inhibisyonu mekanizması."
      />
    );

    const badge = screen.getByText('YÜKSEK');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('title', 'Yüksek Kanıt Seviyesi');
    expect(badge).toHaveClass('bg-red-500/10');
  });

  it('renders clinical detail text when provided', () => {
    render(
      <ClinicalMode
        evidenceBadge={defaultEvidenceBadge}
        clinicalDetail="Aspirin ile Warfarin birlikte kullanımında kanama riski artar."
      />
    );

    expect(
      screen.getByText('Aspirin ile Warfarin birlikte kullanımında kanama riski artar.')
    ).toBeInTheDocument();
  });

  it('renders default fallback text when clinicalDetail is not provided', () => {
    render(<ClinicalMode evidenceBadge={defaultEvidenceBadge} />);

    expect(
      screen.getByText(
        'Bu etkileşim için özel klinik mekanizma kaydı bulunmamaktadır. Lütfen kaynakları inceleyin.'
      )
    ).toBeInTheDocument();
  });

  it('renders correctly parsed source literature links for PubMed and general search', () => {
    const sourceString = 'PubMed 123456; Stockley Drugs; ';
    render(
      <ClinicalMode
        evidenceBadge={defaultEvidenceBadge}
        clinicalDetail="Test detail"
        source={sourceString}
      />
    );

    const pubmedLink = screen.getByRole('link', { name: /PubMed 123456/i });
    expect(pubmedLink).toBeInTheDocument();
    expect(pubmedLink).toHaveAttribute(
      'href',
      'https://pubmed.ncbi.nlm.nih.gov/?term=PubMed%20123456'
    );
    expect(pubmedLink).toHaveAttribute('target', '_blank');

    const googleLink = screen.getByRole('link', { name: /Stockley Drugs/i });
    expect(googleLink).toBeInTheDocument();
    expect(googleLink).toHaveAttribute(
      'href',
      'https://www.google.com/search?q=Stockley%20Drugs'
    );
  });

  it('does not render literature section when source is omitted', () => {
    render(
      <ClinicalMode
        evidenceBadge={defaultEvidenceBadge}
        clinicalDetail="Test detail"
      />
    );

    expect(screen.queryByText('Klinik Literatür & Referans:')).not.toBeInTheDocument();
  });
});
