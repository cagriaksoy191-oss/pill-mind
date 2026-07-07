/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DrugList from '../components/DrugList';
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
    name: 'Tylenol',
    activeIngredient: 'Acetaminophen',
    category: 'Analgesic',
  },
];

describe('DrugList Component', () => {
  it('renders a list of drugs when filtered array has items', () => {
    const onAddDrugMock = jest.fn();
    render(
      <DrugList
        filtered={mockDrugs}
        query="As"
        activeIndex={0}
        onAddDrug={onAddDrugMock}
      />
    );

    expect(screen.getByText('Aspirin')).toBeInTheDocument();
    expect(screen.getByText('Tylenol')).toBeInTheDocument();
    expect(screen.getByText('Acetylsalicylic acid')).toBeInTheDocument();
    expect(screen.getByText('Acetaminophen')).toBeInTheDocument();
  });

  it('highlights the correct item based on activeIndex', () => {
    const onAddDrugMock = jest.fn();
    render(
      <DrugList
        filtered={mockDrugs}
        query="As"
        activeIndex={1}
        onAddDrug={onAddDrugMock}
      />
    );

    const buttons = screen.getAllByRole('option');
    expect(buttons[0]).toHaveAttribute('aria-selected', 'false');
    expect(buttons[1]).toHaveAttribute('aria-selected', 'true');
    expect(buttons[1]).toHaveClass('border-l-4 border-indigo-500');
  });

  it('renders "no drugs found" message when query is present but filtered is empty', () => {
    const onAddDrugMock = jest.fn();
    render(
      <DrugList
        filtered={[]}
        query="NonexistentDrug"
        activeIndex={0}
        onAddDrug={onAddDrugMock}
      />
    );

    expect(screen.getByText('Eşleşen herhangi bir ilaç bulunamadı')).toBeInTheDocument();
  });

  it('renders "all drugs added" message when query is empty and filtered is empty', () => {
    const onAddDrugMock = jest.fn();
    render(
      <DrugList
        filtered={[]}
        query=""
        activeIndex={0}
        onAddDrug={onAddDrugMock}
      />
    );

    expect(screen.getByText('Tüm ilaçlar kutuya eklendi')).toBeInTheDocument();
  });

  it('calls onAddDrug callback with correct id when a drug is clicked', () => {
    const onAddDrugMock = jest.fn();
    render(
      <DrugList
        filtered={mockDrugs}
        query="As"
        activeIndex={0}
        onAddDrug={onAddDrugMock}
      />
    );

    const aspirinButton = screen.getAllByRole('option')[0];
    fireEvent.click(aspirinButton);

    expect(onAddDrugMock).toHaveBeenCalledTimes(1);
    expect(onAddDrugMock).toHaveBeenCalledWith('1');
  });
});
