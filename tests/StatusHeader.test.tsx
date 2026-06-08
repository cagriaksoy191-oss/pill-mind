/** @jest-environment jsdom */
import { CheckResult } from "@/lib/interactions";
/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from '@testing-library/react';
import StatusHeader from '../components/StatusHeader';

// Mock UserPanel since it's not the subject of this test
jest.mock('../components/UserPanel', () => {
  return function MockUserPanel() {
    return <div data-testid="user-panel">UserPanel</div>;
  };
});

describe('StatusHeader Component', () => {
  const mockOnLoadPillbox = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders "İlaç Bekleniyor" when zero drugs selected', () => {
    render(
      <StatusHeader
        selectedDrugIds={[]}
        isChecking={false}
        interactions={[]}
        onLoadPillbox={mockOnLoadPillbox}
      />
    );
    expect(screen.getByText('İlaç Bekleniyor')).toBeInTheDocument();
  });

  it('renders "İkinci İlaç Bekleniyor" when one drug selected', () => {
    render(
      <StatusHeader
        selectedDrugIds={['drug1']}
        isChecking={false}
        interactions={[]}
        onLoadPillbox={mockOnLoadPillbox}
      />
    );
    expect(screen.getByText('İkinci İlaç Bekleniyor')).toBeInTheDocument();
  });

  it('renders "Taranıyor..." when isChecking is true', () => {
    render(
      <StatusHeader
        selectedDrugIds={['drug1', 'drug2']}
        isChecking={true}
        interactions={[]}
        onLoadPillbox={mockOnLoadPillbox}
      />
    );
    expect(screen.getByText('Taranıyor...')).toBeInTheDocument();
  });

  it('renders "Potansiyel Ciddi Etkileşim!" when there are high severity interactions', () => {
    const highSeverityInteraction = {
      interaction: { severity: 'high' }
    } as unknown as CheckResult;

    render(
      <StatusHeader
        selectedDrugIds={['drug1', 'drug2']}
        isChecking={false}
        interactions={[highSeverityInteraction]}
        onLoadPillbox={mockOnLoadPillbox}
      />
    );
    expect(screen.getByText('Potansiyel Ciddi Etkileşim!')).toBeInTheDocument();
  });

  it('renders "Klinik Etkileşim Tespit Edildi" when there are low/moderate severity interactions', () => {
    const moderateSeverityInteraction = {
      interaction: { severity: 'moderate' }
    } as unknown as CheckResult;

    render(
      <StatusHeader
        selectedDrugIds={['drug1', 'drug2']}
        isChecking={false}
        interactions={[moderateSeverityInteraction]}
        onLoadPillbox={mockOnLoadPillbox}
      />
    );
    expect(screen.getByText('Klinik Etkileşim Tespit Edildi')).toBeInTheDocument();
  });

  it('renders "Temiz Rapor (Etkileşim Saptanmadı)" when no interactions and at least 2 drugs selected', () => {
    render(
      <StatusHeader
        selectedDrugIds={['drug1', 'drug2']}
        isChecking={false}
        interactions={[]}
        onLoadPillbox={mockOnLoadPillbox}
      />
    );
    expect(screen.getByText('Temiz Rapor (Etkileşim Saptanmadı)')).toBeInTheDocument();
  });

  it('renders "Çevrimdışı Mod (Yerel Koruma)" when isOffline is true', () => {
    render(
      <StatusHeader
        selectedDrugIds={['drug1', 'drug2']}
        isChecking={false}
        interactions={[]}
        onLoadPillbox={mockOnLoadPillbox}
        isOffline={true}
      />
    );
    expect(screen.getByText('Çevrimdışı Mod (Yerel Koruma)')).toBeInTheDocument();
  });
});
