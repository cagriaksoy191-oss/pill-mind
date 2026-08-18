/** @jest-environment jsdom */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import LiveAccumulationWarnings from '@/components/LiveReports/LiveAccumulationWarnings';
import LiveContraindications from '@/components/LiveReports/LiveContraindications';
import LiveFoodInteractions from '@/components/LiveReports/LiveFoodInteractions';
import LivePolypharmacy from '@/components/LiveReports/LivePolypharmacy';
import LiveSafeState from '@/components/LiveReports/LiveSafeState';
import LiveReportsPanel from '@/components/LiveReports/LiveReportsPanel';
import {
  AccumulationWarning,
  ContraindicationResult,
  FoodInteractionResult,
  PolypharmacyReport,
  Drug,
  CheckResult,
} from '@/lib/interactions';

describe('LiveAccumulationWarnings', () => {
  it('renders null when accumulationWarnings is empty', () => {
    const { container } = render(<LiveAccumulationWarnings accumulationWarnings={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders high risk and medium risk accumulation warnings correctly', () => {
    const warnings: AccumulationWarning[] = [
      {
        severity: 'high',
        message: 'High risk duplication detected',
        detail: 'Detailed info for high risk',
      },
      {
        severity: 'moderate',
        message: 'Moderate accumulation warning',
      },
    ];

    render(<LiveAccumulationWarnings accumulationWarnings={warnings} />);

    expect(screen.getByText('Aşırı Doz / Çift İlaç Çakışması')).toBeInTheDocument();
    expect(screen.getByText('Farmakolojik Sınıf Birikimi')).toBeInTheDocument();

    expect(screen.getByText('Yüksek Risk')).toBeInTheDocument();
    expect(screen.getByText('Orta Risk')).toBeInTheDocument();

    expect(screen.getByText('High risk duplication detected')).toBeInTheDocument();
    expect(screen.getByText('Detailed info for high risk')).toBeInTheDocument();
    expect(screen.getByText('Moderate accumulation warning')).toBeInTheDocument();
  });
});

describe('LiveContraindications', () => {
  it('renders null when contraindications is empty', () => {
    const { container } = render(<LiveContraindications contraindications={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders contraindications with diseaseName or fallback diseaseIcd/Klinik Profil', () => {
    const contraindications: ContraindicationResult[] = [
      {
        drugName: 'Aspirin',
        diseaseName: 'Peptik Ülser',
        message: 'Aspirin peptik ülserde kontrendikedir.',
      },
      {
        drugName: 'Ibuprofen',
        diseaseIcd: 'K70',
        message: 'Karaciğer yetmezliği uyarısı.',
      },
    ];

    render(<LiveContraindications contraindications={contraindications} />);

    expect(screen.getAllByText('Tıbbi Uyumsuzluk (Kontrendikasyon)')).toHaveLength(2);
    expect(screen.getByText('Aspirin & Peptik Ülser Uyuşmazlığı')).toBeInTheDocument();
    expect(screen.getByText('Aspirin peptik ülserde kontrendikedir.')).toBeInTheDocument();

    expect(screen.getByText('Ibuprofen & K70 Uyuşmazlığı')).toBeInTheDocument();
    expect(screen.getByText('Karaciğer yetmezliği uyarısı.')).toBeInTheDocument();
  });
});

describe('LiveFoodInteractions', () => {
  it('renders null when foodInteractions is empty', () => {
    const { container } = render(<LiveFoodInteractions foodInteractions={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders food interactions with badges and details', () => {
    const foodInteractions: FoodInteractionResult[] = [
      {
        drugName: 'Warfarin',
        substance: 'Greyfurt',
        severity: 'high',
        effect: 'Greyfurt suyu warfarin düzeyini artırabilir.',
      },
      {
        drugName: 'Levotiroksin',
        substance: 'Kalsiyum / Süt',
        severity: 'moderate',
        effect: 'Süt levotiroksin emilimini azaltır.',
      },
    ];

    render(<LiveFoodInteractions foodInteractions={foodInteractions} />);

    expect(screen.getByText('2 Uyarı')).toBeInTheDocument();
    expect(screen.getByText('Warfarin')).toBeInTheDocument();
    expect(screen.getByText('Greyfurt')).toBeInTheDocument();
    expect(screen.getByText('Greyfurt suyu warfarin düzeyini artırabilir.')).toBeInTheDocument();

    expect(screen.getByText('Levotiroksin')).toBeInTheDocument();
    expect(screen.getByText('Kalsiyum / Süt')).toBeInTheDocument();
    expect(screen.getByText('Süt levotiroksin emilimini azaltır.')).toBeInTheDocument();
  });
});

describe('LivePolypharmacy', () => {
  it('renders null when polypharmacyReport is null or below threshold with no beers warnings', () => {
    const { container: containerNull } = render(<LivePolypharmacy polypharmacyReport={null} />);
    expect(containerNull.firstChild).toBeNull();

    const lowReport: PolypharmacyReport = {
      score: 2,
      level: 'low',
      message: 'Low risk',
      beersWarnings: [],
    };
    const { container: containerLow } = render(<LivePolypharmacy polypharmacyReport={lowReport} />);
    expect(containerLow.firstChild).toBeNull();
  });

  it('renders polypharmacy report and beers warnings when present', () => {
    const report: PolypharmacyReport = {
      score: 5,
      level: 'high',
      message: 'Çoklu ilaç kullanımı yüksek riskli.',
      beersWarnings: ['Geriatrik hastalarda düşme riski artabilir.'],
    };

    render(<LivePolypharmacy polypharmacyReport={report} />);

    expect(screen.getByText('Çoklu İlaç ve Beers Analizi')).toBeInTheDocument();
    expect(screen.getByText('Yüksek Risk')).toBeInTheDocument();
    expect(screen.getByText('Çoklu ilaç kullanımı yüksek riskli.')).toBeInTheDocument();
    expect(screen.getByText('Geriatrik hastalarda düşme riski artabilir.')).toBeInTheDocument();
  });
});

describe('LiveSafeState', () => {
  const selectedDrugs: Drug[] = [
    { id: '1', name: 'Parasetamol' },
    { id: '2', name: 'Amoksisilin' },
  ];

  it('renders selected drug list and triggers coverage callback', () => {
    const handleRequestCoverageExplanation = jest.fn();

    render(
      <LiveSafeState
        selectedDrugs={selectedDrugs}
        handleRequestCoverageExplanation={handleRequestCoverageExplanation}
        isCoverageLoading={false}
      />
    );

    expect(screen.getByText(/Parasetamol, Amoksisilin/)).toBeInTheDocument();

    const button = screen.getByRole('button', { name: 'Canlı AI Kombinasyon Analizini Başlat' });
    fireEvent.click(button);
    expect(handleRequestCoverageExplanation).toHaveBeenCalledTimes(1);
  });

  it('disables button and shows loading text when isCoverageLoading is true', () => {
    render(
      <LiveSafeState
        selectedDrugs={selectedDrugs}
        handleRequestCoverageExplanation={jest.fn()}
        isCoverageLoading={true}
      />
    );

    const button = screen.getByRole('button', { name: /Analiz Hazırlanıyor.../i });
    expect(button).toBeDisabled();
  });
});

describe('LiveReportsPanel', () => {
  const defaultProps = {
    selectedDrugs: [{ id: '1', name: 'Aspirin' }],
    interactions: [] as CheckResult[],
    explanations: {},
    accumulationWarnings: [],
    contraindications: [],
    polypharmacyReport: null,
    foodInteractions: [],
    loadingExplanations: {},
    onExplainRequested: jest.fn(),
    handleRequestCoverageExplanation: jest.fn(),
    isCoverageLoading: false,
    showCoveragePanel: false,
    setShowCoveragePanel: jest.fn(),
    coverageExplanation: null,
  };

  it('renders LiveSafeState when there are no interactions', () => {
    render(<LiveReportsPanel {...defaultProps} />);

    expect(screen.getAllByText(/Kayıtlı Veri Setinde Bilinen Etkileşim Saptanmadı/i).length).toBeGreaterThan(0);
  });

  it('renders InteractionList when there are interactions', () => {
    const interactions: CheckResult[] = [
      {
        drug1Name: 'Aspirin',
        drug2Name: 'Warfarin',
        summary: 'Ciddi kanama riski.',
        interaction: {
          id: 'int1',
          drug1: 'Aspirin',
          drug2: 'Warfarin',
          severity: 'high',
          type: 'Kanamaya eğilim',
          description: 'Ciddi kanama riski.',
        },
      },
    ];

    render(<LiveReportsPanel {...defaultProps} interactions={interactions} />);

    expect(screen.getByText('Aspirin')).toBeInTheDocument();
    expect(screen.getByText('Warfarin')).toBeInTheDocument();
  });
});
