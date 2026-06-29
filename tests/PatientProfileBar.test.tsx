/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import PatientProfileBar, { PatientContext } from '../components/PatientProfileBar';

describe('PatientProfileBar', () => {
  const defaultContext: PatientContext = {
    isPregnant: false,
    isBreastfeeding: false,
    ageGroup: "adult",
    renalRisk: false,
    hepaticRisk: false,
    diseases: [],
  };

  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    cleanup();
  });

  const setup = (contextOverrides: Partial<PatientContext> = {}) => {
    const context = { ...defaultContext, ...contextOverrides };
    return render(<PatientProfileBar context={context} onChange={mockOnChange} />);
  };

  it('renders correctly', () => {
    setup();
    expect(screen.getByText('Hasta Risk Faktörleri Modülü')).toBeInTheDocument();
  });

  it('toggles the panel open and close', () => {
    setup();
    // Initially closed, so we shouldn't see inner elements
    expect(screen.queryByText('Gebelik Durumu')).not.toBeInTheDocument();

    // Click header to open
    const headerBtn = screen.getAllByText(/Hasta Risk Faktörleri Modülü/i)[0].closest('button');
    fireEvent.click(headerBtn!);

    // Now it should be open
    expect(screen.getByText('Gebelik Durumu')).toBeInTheDocument();

    // Click toggle button to close
    const closeBtn = screen.getByText('✕');
    fireEvent.click(closeBtn);

    // Should be closed again
    expect(screen.queryByText('Gebelik Durumu')).not.toBeInTheDocument();
  });

  it('calls onChange with toggled pregnancy state', () => {
    setup();
    const headerBtn = screen.getAllByText(/Hasta Risk Faktörleri Modülü/i)[0].closest('button');
    fireEvent.click(headerBtn!);

    const pregnantBtn = screen.getByText('Gebelik Durumu').closest('button');
    fireEvent.click(pregnantBtn!);

    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultContext,
      isPregnant: true,
    });
  });

  it('calls onChange with toggled breastfeeding state', () => {
    setup();
    const headerBtn = screen.getAllByText(/Hasta Risk Faktörleri Modülü/i)[0].closest('button');
    fireEvent.click(headerBtn!);

    const breastfeedingBtn = screen.getByText('Emzirme Durumu').closest('button');
    fireEvent.click(breastfeedingBtn!);

    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultContext,
      isBreastfeeding: true,
    });
  });

  it('calls onChange with correct ageGroup', () => {
    setup();
    const headerBtn = screen.getAllByText(/Hasta Risk Faktörleri Modülü/i)[0].closest('button');
    fireEvent.click(headerBtn!);

    const elderlyBtn = screen.getByText('65 Yaş Üstü');
    fireEvent.click(elderlyBtn);

    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultContext,
      ageGroup: 'elderly',
    });

    const adultBtn = screen.getByText('Yetişkin');
    fireEvent.click(adultBtn);

    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultContext,
      ageGroup: 'adult',
    });
  });

  it('calls onChange with toggled renal and hepatic risks', () => {
    setup();
    const headerBtn = screen.getAllByText(/Hasta Risk Faktörleri Modülü/i)[0].closest('button');
    fireEvent.click(headerBtn!);

    const renalBtn = screen.getByText('Böbrek Yetmezliği').closest('button');
    fireEvent.click(renalBtn!);

    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultContext,
      renalRisk: true,
    });

    const hepaticBtn = screen.getByText('Karaciğer Yetmezliği').closest('button');
    fireEvent.click(hepaticBtn!);

    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultContext,
      hepaticRisk: true,
    });
  });

  it('adds and removes a disease from the list', () => {
    // Initial state: no diseases
    setup();
    const headerBtn = screen.getAllByText(/Hasta Risk Faktörleri Modülü/i)[0].closest('button');
    fireEvent.click(headerBtn!);

    const pepticUlcerBtn = screen.getByText('Peptik Ülser').closest('button');
    fireEvent.click(pepticUlcerBtn!);

    // Should add K25
    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultContext,
      diseases: ['K25'],
    });

    // Clean up completely
    cleanup();
    jest.clearAllMocks();

    // Re-render with K25 already present
    setup({ diseases: ['K25', 'I10'] });

    // Have to open it again for the new setup
    const newHeaderBtn = screen.getAllByText(/Hasta Risk Faktörleri Modülü/i)[0].closest('button');
    fireEvent.click(newHeaderBtn!);

    const pepticUlcerBtnAgain = screen.getByText('Peptik Ülser').closest('button');
    fireEvent.click(pepticUlcerBtnAgain!);

    // Should remove K25
    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultContext,
      diseases: ['I10'], // Only I10 remains
    });
  });


  it('renders "Profil Aktif" badge when filters are active', () => {
    const { unmount } = setup({ isPregnant: true });
    expect(screen.getByText('Profil Aktif')).toBeInTheDocument();
    unmount();

    setup({ diseases: ['K25'] });
    expect(screen.getByText('Profil Aktif')).toBeInTheDocument();
  });

  it('does not render "Profil Aktif" badge when no filters are active', () => {
    setup();
    expect(screen.queryByText('Profil Aktif')).not.toBeInTheDocument();
  });
});
