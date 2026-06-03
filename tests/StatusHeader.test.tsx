/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import StatusHeader from '../components/StatusHeader';

// Mock dependencies
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
  MockLink.displayName = 'MockLink';
  return MockLink;
});

jest.mock('../components/UserPanel', () => {
  const MockUserPanel = () => <div data-testid="user-panel">User Panel</div>;
  MockUserPanel.displayName = 'MockUserPanel';
  return MockUserPanel;
});

describe('StatusHeader Component', () => {
  const mockOnLoadPillbox = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders "İlaç Bekleniyor" when 0 drugs are selected', () => {
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

  it('renders "İkinci İlaç Bekleniyor" when 1 drug is selected', () => {
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

  it('renders "Taranıyor..." when checking', () => {
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
    const interactions = [
      { interaction: { id: '1', severity: 'high' } } as unknown as Record<string, unknown>
    ];
    render(
      <StatusHeader
        selectedDrugIds={['drug1', 'drug2']}
        isChecking={false}
        interactions={interactions as any}
        onLoadPillbox={mockOnLoadPillbox}
      />
    );
    expect(screen.getByText('Potansiyel Ciddi Etkileşim!')).toBeInTheDocument();
  });

  it('renders "Klinik Etkileşim Tespit Edildi" when there are non-high severity interactions', () => {
    const interactions = [
      { interaction: { id: '1', severity: 'moderate' } } as unknown as Record<string, unknown>
    ];
    render(
      <StatusHeader
        selectedDrugIds={['drug1', 'drug2']}
        isChecking={false}
        interactions={interactions as any}
        onLoadPillbox={mockOnLoadPillbox}
      />
    );
    expect(screen.getByText('Klinik Etkileşim Tespit Edildi')).toBeInTheDocument();
  });

  it('renders "Temiz Rapor (Etkileşim Saptanmadı)" when there are no interactions and >= 2 drugs', () => {
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

  it('renders offline mode indicator when isOffline is true', () => {
    render(
      <StatusHeader
        selectedDrugIds={[]}
        isChecking={false}
        interactions={[]}
        onLoadPillbox={mockOnLoadPillbox}
        isOffline={true}
      />
    );
    expect(screen.getByText('Çevrimdışı Mod (Yerel Koruma)')).toBeInTheDocument();
  });

  it('does not render offline mode indicator when isOffline is false', () => {
    render(
      <StatusHeader
        selectedDrugIds={[]}
        isChecking={false}
        interactions={[]}
        onLoadPillbox={mockOnLoadPillbox}
        isOffline={false}
      />
    );
    expect(screen.queryByText('Çevrimdışı Mod (Yerel Koruma)')).not.toBeInTheDocument();
  });
});
