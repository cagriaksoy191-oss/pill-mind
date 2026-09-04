/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PolypharmacyReport from '@/components/MedicalReportSections/PolypharmacyReport';

describe('PolypharmacyReport Component', () => {
  it('renders null when polypharmacyReport prop is null', () => {
    const { container } = render(<PolypharmacyReport polypharmacyReport={null} />);
    expect(container.firstChild).toBeNull();
  });

  it.each([
    {
      description: 'score is 0 and beersWarnings is empty',
      report: { score: 0, message: 'No risk', beersWarnings: [] }
    },
    {
      description: 'score is 3 (< 4) and beersWarnings is empty',
      report: { score: 3, message: 'Moderate number of drugs', beersWarnings: [] }
    }
  ])('renders null when $description', ({ report }) => {
    const { container } = render(<PolypharmacyReport polypharmacyReport={report} />);
    expect(container.firstChild).toBeNull();
  });

  it.each([
    {
      description: 'score is 4 (>= 4) and beersWarnings is empty',
      report: { score: 4, message: 'Polifarmasi riski: 4+ aktif ilaç kullanımı saptandı.', beersWarnings: [] },
      expectedHeader: '📊 Polifarmasi & Beers Yaşlı Hasta Analizi',
      expectedMessage: 'Polifarmasi riski: 4+ aktif ilaç kullanımı saptandı.',
      expectedWarnings: []
    },
    {
      description: 'score is 2 (< 4) but beersWarnings is non-empty',
      report: {
        score: 2,
        message: 'Beers kriteri uyarısı mevcut.',
        beersWarnings: ['65 yaş üstü hastalarda anticholinergic yükü uyarısı.']
      },
      expectedHeader: '📊 Polifarmasi & Beers Yaşlı Hasta Analizi',
      expectedMessage: 'Beers kriteri uyarısı mevcut.',
      expectedWarnings: ['65 yaş üstü hastalarda anticholinergic yükü uyarısı.']
    },
    {
      description: 'score is 5 (>= 4) and multiple beersWarnings are present',
      report: {
        score: 5,
        message: 'Yüksek polifarmasi riski ve yaşlı hasta ilaç kullanımı.',
        beersWarnings: [
          'Uyarı 1: Sedatif ilaç kullanımı düşme riskini artırır.',
          'Uyarı 2: NSAİİ kullanımı GIS kanama riskini artırır.'
        ]
      },
      expectedHeader: '📊 Polifarmasi & Beers Yaşlı Hasta Analizi',
      expectedMessage: 'Yüksek polifarmasi riski ve yaşlı hasta ilaç kullanımı.',
      expectedWarnings: [
        'Uyarı 1: Sedatif ilaç kullanımı düşme riskini artırır.',
        'Uyarı 2: NSAİİ kullanımı GIS kanama riskini artırır.'
      ]
    }
  ])('renders correctly when $description', ({ report, expectedHeader, expectedMessage, expectedWarnings }) => {
    render(<PolypharmacyReport polypharmacyReport={report} />);

    expect(screen.getByText(expectedHeader)).toBeInTheDocument();
    expect(screen.getByText(expectedMessage)).toBeInTheDocument();

    if (expectedWarnings.length > 0) {
      expectedWarnings.forEach((warning) => {
        expect(screen.getByText(warning)).toBeInTheDocument();
      });
    } else {
      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    }
  });
});
