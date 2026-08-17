/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VirtualPillboxWarnings } from '../components/VirtualPillboxWarnings';
import { AccumulationWarning } from '../lib/interactions';

describe('VirtualPillboxWarnings', () => {
  it('renders nothing (null) when accumulationWarnings is an empty array', () => {
    const { container } = render(<VirtualPillboxWarnings accumulationWarnings={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing (null) when accumulationWarnings is undefined', () => {
    // @ts-expect-forbidden-type-check-bypass
    const { container } = render(
      <VirtualPillboxWarnings accumulationWarnings={undefined as unknown as AccumulationWarning[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders a single accumulation warning correctly', () => {
    const mockWarnings: AccumulationWarning[] = [
      {
        type: 'cns_depression',
        drugs: ['Drug A', 'Drug B'],
        message: 'Birden fazla CNS baskılayıcı ilaç kullanımı tespit edildi.',
      },
    ];

    render(<VirtualPillboxWarnings accumulationWarnings={mockWarnings} />);

    expect(
      screen.getByText('Birden fazla CNS baskılayıcı ilaç kullanımı tespit edildi.')
    ).toBeInTheDocument();
    expect(screen.getByText('🚨')).toBeInTheDocument();
  });

  it('renders multiple accumulation warnings correctly', () => {
    const mockWarnings: AccumulationWarning[] = [
      {
        type: 'cns_depression',
        drugs: ['Drug A', 'Drug B'],
        message: 'Birden fazla CNS baskılayıcı ilaç kullanımı tespit edildi.',
      },
      {
        type: 'serotonin_syndrome',
        drugs: ['Drug C', 'Drug D'],
        message: 'Serotonin sendromu riski artıran kombinasyon.',
      },
    ];

    render(<VirtualPillboxWarnings accumulationWarnings={mockWarnings} />);

    expect(
      screen.getByText('Birden fazla CNS baskılayıcı ilaç kullanımı tespit edildi.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Serotonin sendromu riski artıran kombinasyon.')
    ).toBeInTheDocument();
    expect(screen.getAllByText('🚨')).toHaveLength(2);
  });
});
