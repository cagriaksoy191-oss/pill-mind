/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DrugSelector from '../components/DrugSelector';
import { fuzzySearchDrugs } from '../lib/fuzzySearch';

jest.mock('../lib/fuzzySearch', () => ({
  fuzzySearchDrugs: jest.fn()
}));

const mockDrugs = [
  { id: '1', name: 'Aspirin', activeIngredient: 'ASA', category: 'Analgesic' },
  { id: '2', name: 'Parol', activeIngredient: 'Paracetamol', category: 'Analgesic' },
  { id: '3', name: 'Ibuprofen', activeIngredient: 'Ibuprofen', category: 'NSAID' },
];

describe('DrugSelector', () => {
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders input field correctly', () => {
    render(<DrugSelector drugs={mockDrugs} selected={[]} onSelect={mockOnSelect} />);
    expect(screen.getByPlaceholderText(/İlaç adı, etken madde veya marka yazın/i)).toBeInTheDocument();
  });

  it('renders already selected drugs', () => {
    render(<DrugSelector drugs={mockDrugs} selected={['1']} onSelect={mockOnSelect} />);
    expect(screen.getByText('Aspirin')).toBeInTheDocument();
    expect(screen.queryByText('Parol')).not.toBeInTheDocument();
  });

  it('searches and displays results', () => {
    (fuzzySearchDrugs as jest.Mock).mockReturnValue([
      { item: mockDrugs[1], score: 1 },
    ]);

    render(<DrugSelector drugs={mockDrugs} selected={[]} onSelect={mockOnSelect} />);
    const input = screen.getByPlaceholderText(/İlaç adı, etken madde veya marka yazın/i);

    fireEvent.change(input, { target: { value: 'par' } });

    expect(fuzzySearchDrugs).toHaveBeenCalledWith('par', mockDrugs);
    expect(screen.getByText('Parol')).toBeInTheDocument();
  });

  it('adds a drug on clicking a search result', () => {
    (fuzzySearchDrugs as jest.Mock).mockReturnValue([
      { item: mockDrugs[1], score: 1 },
    ]);

    render(<DrugSelector drugs={mockDrugs} selected={[]} onSelect={mockOnSelect} />);
    const input = screen.getByPlaceholderText(/İlaç adı, etken madde veya marka yazın/i);

    fireEvent.change(input, { target: { value: 'par' } });
    const resultButton = screen.getByText('Parol').closest('button');
    fireEvent.click(resultButton!);

    expect(mockOnSelect).toHaveBeenCalledWith(['2']);
  });

  it('removes a selected drug', () => {
    render(<DrugSelector drugs={mockDrugs} selected={['1', '2']} onSelect={mockOnSelect} />);

    const removeButtons = screen.getAllByRole('button', { name: /ilacını arama kutusundan kaldır/i });
    // Assuming 1st one is Aspirin
    fireEvent.click(removeButtons[0]);

    expect(mockOnSelect).toHaveBeenCalledWith(['2']);
  });

  it('supports keyboard navigation', () => {
    (fuzzySearchDrugs as jest.Mock).mockReturnValue([
      { item: mockDrugs[0], score: 1 },
      { item: mockDrugs[1], score: 1 },
    ]);

    render(<DrugSelector drugs={mockDrugs} selected={[]} onSelect={mockOnSelect} />);
    const input = screen.getByPlaceholderText(/İlaç adı, etken madde veya marka yazın/i);

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'a' } }); // isOpen is true now

    // Arrow down -> selects 1st item (index 0)
    fireEvent.keyDown(input, { key: 'ArrowDown' });

    // Arrow down -> selects 2nd item (index 1)
    fireEvent.keyDown(input, { key: 'ArrowDown' });

    // Enter to add selected item (index 1 -> Parol)
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mockOnSelect).toHaveBeenCalledWith(['2']);
  });

  it('closes dropdown on click outside', () => {
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <DrugSelector drugs={mockDrugs} selected={[]} onSelect={mockOnSelect} />
      </div>
    );
    const input = screen.getByPlaceholderText(/İlaç adı, etken madde veya marka yazın/i);
    fireEvent.focus(input); // Opens dropdown
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
