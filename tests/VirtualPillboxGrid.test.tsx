/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VirtualPillboxGrid } from '../components/VirtualPillboxGrid';

const mockDrugs = [
  { id: '1', name: 'Aspirin', activeIngredient: 'ASA', category: 'Analgesic' },
  { id: '2', name: 'Parol', activeIngredient: 'Paracetamol', category: 'Analgesic' }
];

describe('VirtualPillboxGrid', () => {
  const mockOnRemove = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders drug cards correctly', () => {
    render(
      <VirtualPillboxGrid
        selectedDrugs={mockDrugs}
        newlyAddedId="1"
        interactions={[]}
        onRemove={mockOnRemove}
      />
    );

    expect(screen.getByText('Aspirin')).toBeInTheDocument();
    expect(screen.getByText('ASA')).toBeInTheDocument();
    expect(screen.getByText('Parol')).toBeInTheDocument();
    expect(screen.getByText('Paracetamol')).toBeInTheDocument();
  });

  it('triggers onRemove callback when remove button is clicked', () => {
    render(
      <VirtualPillboxGrid
        selectedDrugs={mockDrugs}
        newlyAddedId={null}
        interactions={[]}
        onRemove={mockOnRemove}
      />
    );

    const removeButtons = screen.getAllByRole('button', { name: /ilacını kutudan çıkar/i });
    fireEvent.click(removeButtons[0]);
    expect(mockOnRemove).toHaveBeenCalledWith('1');
  });
});
