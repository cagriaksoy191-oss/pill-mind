/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LivePolypharmacy from '@/components/LiveReports/LivePolypharmacy';

describe('LivePolypharmacy Component', () => {
  it('renders null when polypharmacyReport prop is null', () => {
    const { container } = render(<LivePolypharmacy polypharmacyReport={null} />);
    expect(container.firstChild).toBeNull();
  });

  it.each([
    {
      description: 'score is 0 and beersWarnings is empty',
      report: { score: 0, level: 'low' as const, message: 'Düşük risk', beersWarnings: [] },
    },
    {
      description: 'score is 3 (< 4) and beersWarnings is empty',
      report: { score: 3, level: 'moderate' as const, message: 'Orta seviye ilaç kullanımı', beersWarnings: [] },
    },
  ])('renders null when $description', ({ report }) => {
    const { container } = render(<LivePolypharmacy polypharmacyReport={report} />);
    expect(container.firstChild).toBeNull();
  });

  it.each([
    {
      description: 'score is 4 (>= 4), high level, and beersWarnings is empty',
      report: {
        score: 4,
        level: 'high' as const,
        message: 'Yüksek polifarmasi riski tespit edildi.',
        beersWarnings: [],
      },
      expectedBadge: 'Yüksek Risk',
      expectedMessage: 'Yüksek polifarmasi riski tespit edildi.',
      expectedWarnings: [],
    },
    {
      description: 'score is 2 (< 4) but beersWarnings is non-empty with moderate level',
      report: {
        score: 2,
        level: 'moderate' as const,
        message: 'Beers uyarısı saptandı.',
        beersWarnings: ['Geriatrik hastada yüksek riskli ilaç kullanımı.'],
      },
      expectedBadge: 'Orta Risk',
      expectedMessage: 'Beers uyarısı saptandı.',
      expectedWarnings: ['Geriatrik hastada yüksek riskli ilaç kullanımı.'],
    },
    {
      description: 'score is 5 (>= 4), high level, and multiple beersWarnings are present',
      report: {
        score: 5,
        level: 'high' as const,
        message: 'Çoklu ilaç ve yaşlı hasta riski.',
        beersWarnings: [
          'Sedatif ilaç antikolinerjik yük oluşturur.',
          'NSAİİ GIS kanama riskini artırır.',
        ],
      },
      expectedBadge: 'Yüksek Risk',
      expectedMessage: 'Çoklu ilaç ve yaşlı hasta riski.',
      expectedWarnings: [
        'Sedatif ilaç antikolinerjik yük oluşturur.',
        'NSAİİ GIS kanama riskini artırır.',
      ],
    },
  ])(
    'renders correctly when $description',
    ({ report, expectedBadge, expectedMessage, expectedWarnings }) => {
      render(<LivePolypharmacy polypharmacyReport={report} />);

      expect(screen.getByText('Çoklu İlaç ve Beers Analizi')).toBeInTheDocument();
      expect(screen.getByText(expectedBadge)).toBeInTheDocument();
      expect(screen.getByText(expectedMessage)).toBeInTheDocument();

      expectedWarnings.forEach((warning) => {
        expect(screen.getByText(warning)).toBeInTheDocument();
      });
    }
  );
});
