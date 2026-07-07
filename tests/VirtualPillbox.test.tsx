/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import VirtualPillbox from '../components/VirtualPillbox';

const mockDrugs = [
  { id: '1', name: 'Aspirin', activeIngredient: 'ASA', category: 'Analgesic' },
  { id: '2', name: 'Parol', activeIngredient: 'Paracetamol', category: 'Analgesic' }
];

describe('VirtualPillbox', () => {
  const mockOnRemove = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders empty state when no drugs are selected', () => {
    render(<VirtualPillbox selectedDrugs={[]} onRemove={mockOnRemove} />);

    expect(screen.getByText(/Sanal İlaç Kutusu/i)).toBeInTheDocument();
    expect(screen.getByText('0 Aktif İlaç')).toBeInTheDocument();
    expect(screen.getByText(/Kutunuz şu an boş/i)).toBeInTheDocument();
    expect(screen.queryByText('Klinik Tarama Aktif')).not.toBeInTheDocument();
  });

  it('renders list of drugs when selectedDrugs is populated', () => {
    render(<VirtualPillbox selectedDrugs={mockDrugs} onRemove={mockOnRemove} />);

    expect(screen.getByText('2 Aktif İlaç')).toBeInTheDocument();
    expect(screen.getByText('Klinik Tarama Aktif')).toBeInTheDocument();

    expect(screen.getByText('Aspirin')).toBeInTheDocument();
    expect(screen.getByText('ASA')).toBeInTheDocument();
    expect(screen.getByText('Parol')).toBeInTheDocument();
    expect(screen.getByText('Paracetamol')).toBeInTheDocument();
  });

  it('calls onRemove with the correct id when remove button is clicked', () => {
    render(<VirtualPillbox selectedDrugs={mockDrugs} onRemove={mockOnRemove} />);

    const removeButtons = screen.getAllByRole('button', { name: /ilacını kutudan çıkar/i });
    expect(removeButtons).toHaveLength(2);

    fireEvent.click(removeButtons[0]); // Removing Aspirin
    expect(mockOnRemove).toHaveBeenCalledWith('1');

    fireEvent.click(removeButtons[1]); // Removing Parol
    expect(mockOnRemove).toHaveBeenCalledWith('2');
  });

  it('handles 3D tilt effects on mouse move and leave', () => {
    render(<VirtualPillbox selectedDrugs={mockDrugs} onRemove={mockOnRemove} />);

    const container = screen.getByText(/Sanal İlaç Kutusu/i).closest('.pillbox-3d');
    expect(container).toBeInTheDocument();

    // Test Mouse Enter
    fireEvent.mouseEnter(container!);
    expect(container).toHaveStyle('transform: rotateX(0deg) rotateY(0deg) scale3d(1.01, 1.01, 1.01)');

    // Mock getBoundingClientRect for tilt calculations
    if (container) {
      container.getBoundingClientRect = jest.fn(() => ({
        width: 400,
        height: 200,
        top: 0,
        left: 0,
        bottom: 200,
        right: 400,
        x: 0,
        y: 0,
        toJSON: () => {}
      }));
    }

    // Test Mouse Move
    fireEvent.mouseMove(container!, { clientX: 300, clientY: 50 });
    // Expected logic:
    // centerX = 200, centerY = 100
    // x = 300, y = 50
    // rotateX = ((100 - 50) / 100) * 12 = 6
    // rotateY = ((300 - 200) / 200) * 12 = 6
    expect(container).toHaveStyle('transform: rotateX(6deg) rotateY(6deg) scale3d(1.01, 1.01, 1.01)');

    // Test Mouse Leave
    fireEvent.mouseLeave(container!);
    expect(container).toHaveStyle('transform: rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
  });

});
