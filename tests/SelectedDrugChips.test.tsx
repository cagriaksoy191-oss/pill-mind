/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SelectedDrugChips from '../components/SelectedDrugChips';
import { Drug } from '../lib/interactions';

const mockDrugs: Drug[] = [
  {
    id: '1',
    name: 'Aspirin',
    activeIngredient: 'Acetylsalicylic acid',
    category: 'NSAID',
  },
  {
    id: '2',
    name: 'Paracetamol',
    activeIngredient: 'Acetaminophen',
    category: 'Analgesic',
  },
];

describe('SelectedDrugChips Component', () => {
  it('renders nothing (returns null) when selectedDrugs is empty', () => {
    const onRemoveMock = jest.fn();
    const { container } = render(
      <SelectedDrugChips selectedDrugs={[]} onRemove={onRemoveMock} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders a chip for each drug in selectedDrugs', () => {
    const onRemoveMock = jest.fn();
    render(
      <SelectedDrugChips selectedDrugs={mockDrugs} onRemove={onRemoveMock} />
    );

    expect(screen.getByText('Aspirin')).toBeInTheDocument();
    expect(screen.getByText('Paracetamol')).toBeInTheDocument();
  });

  it('calls onRemove with correct drug id when a remove button is clicked', () => {
    const onRemoveMock = jest.fn();
    render(
      <SelectedDrugChips selectedDrugs={mockDrugs} onRemove={onRemoveMock} />
    );

    const aspirinRemoveButton = screen.getByRole('button', {
      name: 'Aspirin ilacını arama kutusundan kaldır',
    });

    fireEvent.click(aspirinRemoveButton);

    expect(onRemoveMock).toHaveBeenCalledTimes(1);
    expect(onRemoveMock).toHaveBeenCalledWith('1');
  });
});
