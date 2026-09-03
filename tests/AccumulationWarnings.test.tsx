/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AccumulationWarnings from '@/components/MedicalReportSections/AccumulationWarnings';
import { AccumulationWarning } from '@/lib/interactions';

describe('AccumulationWarnings Component', () => {
  it('renders null when warnings array is empty', () => {
    const { container } = render(<AccumulationWarnings accumulationWarnings={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders correctly when a single warning is provided', () => {
    const warnings: AccumulationWarning[] = [
      {
        type: 'active_ingredient',
        severity: 'high',
        message: 'Aşırı Doz Riski: Parasetamol içeren birden fazla ilaç bulundu.',
        triggerDrugs: ['Parol 500 mg', 'Aferin Forte']
      }
    ];

    render(<AccumulationWarnings accumulationWarnings={warnings} />);

    expect(screen.getByText('🚨 Aşırı Doz / Farmakolojik Grup Çakışmaları')).toBeInTheDocument();
    expect(
      screen.getByText('Aşırı Doz Riski: Parasetamol içeren birden fazla ilaç bulundu.')
    ).toBeInTheDocument();
  });

  it.each([
    {
      description: 'multiple accumulation warnings',
      warnings: [
        {
          type: 'active_ingredient' as const,
          severity: 'high' as const,
          message: 'Parasetamol birikim uyarısı',
          triggerDrugs: ['Drug A', 'Drug B']
        },
        {
          type: 'pharmacological_group' as const,
          severity: 'medium' as const,
          message: 'NSAİİ grubu çakışma uyarısı',
          triggerDrugs: ['Drug C', 'Drug D']
        }
      ],
      expectedMessages: ['Parasetamol birikim uyarısı', 'NSAİİ grubu çakışma uyarısı']
    },
    {
      description: 'warnings containing special characters and numbers',
      warnings: [
        {
          type: 'active_ingredient' as const,
          severity: 'high' as const,
          message: 'İbuprofen > 1200mg/gün günlük doz aşımı (%100 risk!)',
          triggerDrugs: ['Ibuprofen 600mg', 'Advil 400mg']
        }
      ],
      expectedMessages: ['İbuprofen > 1200mg/gün günlük doz aşımı (%100 risk!)']
    }
  ])('renders correctly for $description', ({ warnings, expectedMessages }) => {
    render(<AccumulationWarnings accumulationWarnings={warnings} />);

    expect(screen.getByText('🚨 Aşırı Doz / Farmakolojik Grup Çakışmaları')).toBeInTheDocument();
    expectedMessages.forEach((msg) => {
      expect(screen.getByText(msg)).toBeInTheDocument();
    });
  });
});
