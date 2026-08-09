/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MedicalReport from '../components/MedicalReport';

describe('MedicalReport', () => {
  const defaultProps = {
    interactions: [],
    accumulationWarnings: [],
    foodInteractions: [],
    contraindications: [],
    polypharmacyReport: null,
    explanations: {},
    selectedDrugs: []
  };

  it('renders "no interaction" state correctly when interactions array is empty', () => {
    render(<MedicalReport {...defaultProps} />);

    expect(screen.getByText('💚 Etkileşim Durumu')).toBeInTheDocument();
    expect(screen.getByText('Kayıtlı veri setinde bilinen etkileşim saptanmadı.')).toBeInTheDocument();
  });

  it('renders accumulation warnings correctly', () => {
    const props = {
      ...defaultProps,
      accumulationWarnings: [
        { message: 'Aspirin usage has accumulation risk.', drugs: [] }
      ]
    };

    render(<MedicalReport {...props} />);

    expect(screen.getByText('🚨 Aşırı Doz / Farmakolojik Grup Çakışmaları')).toBeInTheDocument();
    expect(screen.getByText('Aspirin usage has accumulation risk.')).toBeInTheDocument();
  });

  it('renders contraindications correctly', () => {
    const props = {
      ...defaultProps,
      contraindications: [
        { drugName: 'Ibuprofen', diseaseName: 'Asthma', message: 'Not recommended for asthma patients.', diseaseIcd: '' }
      ]
    };

    render(<MedicalReport {...props} />);

    expect(screen.getByText('❌ Kritik Tıbbi Uyumsuzluklar (Contraindications)')).toBeInTheDocument();
    expect(screen.getByText(/Ibuprofen & Asthma:/i)).toBeInTheDocument();
    expect(screen.getByText(/Not recommended for asthma patients\./i)).toBeInTheDocument();
  });

  it('renders polypharmacy report correctly', () => {
    const props = {
      ...defaultProps,
      polypharmacyReport: {
        score: 5,
        message: 'High polypharmacy risk.',
        beersWarnings: ['Avoid taking X with Y in elderly.']
      }
    };

    render(<MedicalReport {...props} />);

    expect(screen.getByText('📊 Polifarmasi & Beers Yaşlı Hasta Analizi')).toBeInTheDocument();
    expect(screen.getByText('High polypharmacy risk.')).toBeInTheDocument();
    expect(screen.getByText('Avoid taking X with Y in elderly.')).toBeInTheDocument();
  });

  it('does not render polypharmacy report when score is low and no warnings exist', () => {
    const props = {
      ...defaultProps,
      polypharmacyReport: {
        score: 2,
        message: 'Low risk.',
        beersWarnings: []
      }
    };

    render(<MedicalReport {...props} />);

    expect(screen.queryByText('📊 Polifarmasi & Beers Yaşlı Hasta Analizi')).not.toBeInTheDocument();
  });

  it('renders food interactions correctly', () => {
    const props = {
      ...defaultProps,
      foodInteractions: [
        { drugName: 'Warfarin', substance: 'Grapefruit', severity: "high", effect: 'Increases bleeding risk.' }
      ]
    };

    render(<MedicalReport {...props} />);

    expect(screen.getByText('🥗 Gıda, Alkol ve Besin Etkileşim Raporu')).toBeInTheDocument();
    expect(screen.getByText(/Warfarin & Grapefruit \(high Risk\):/i)).toBeInTheDocument();
    expect(screen.getByText('Increases bleeding risk.')).toBeInTheDocument();
  });

  it('renders interactions with simple explanations', () => {
    const props = {
      ...defaultProps,
      interactions: [
        {
          drug1Name: 'DrugA',
          drug2Name: 'DrugB',
          interaction: {
            id: 'int-1',
            drug1Id: 'd1',
            drug2Id: 'd2',
            severity: "high",
            summary: 'Dangerous interaction.',
            clinicalDetail: 'May cause heart failure.',
            mechanisms: [],
            evidences: [],
            verificationStatus: "verified",
            evidenceLevel: "fda_approved",
            source: 'FDA',
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        }
      ],
      explanations: {
        'int-1': {
          explanation: 'This is a test explanation.'
        }
      }
    };

    render(<MedicalReport {...props} />);

    expect(screen.getByText('1. Hasta İçin Sadeleştirilmiş Etkileşim Açıklamaları')).toBeInTheDocument();
    expect(screen.getByText('HIGH RİSK')).toBeInTheDocument();
    expect(screen.getByText('DrugA & DrugB Etkileşimi')).toBeInTheDocument();
    expect(screen.getByText('Dangerous interaction.')).toBeInTheDocument();
    expect(screen.getByText('This is a test explanation.')).toBeInTheDocument();

    // Check table headers for clinical mode
    expect(screen.getByText('2. Sağlık Profesyonelleri İçin Klinik Detaylar (Klinik Mod)')).toBeInTheDocument();
    expect(screen.getByText('İlaç Kombinasyonu')).toBeInTheDocument();

    // Check table cells
    const tdDrugA = screen.getAllByText('DrugA');
    expect(tdDrugA.length).toBeGreaterThan(0);
    expect(screen.getByText('high Risk')).toBeInTheDocument();
    expect(screen.getByText(/Mekanizma:/)).toBeInTheDocument();
    expect(screen.getByText(/May cause heart failure\./)).toBeInTheDocument();
  });

  it('renders interaction mechanisms and evidences properly in clinical mode', () => {
    const props = {
      ...defaultProps,
      interactions: [
        {
          drug1Name: 'DrugC',
          drug2Name: 'DrugD',
          interaction: {
            id: 'int-2',
            drug1Id: 'd3',
            drug2Id: 'd4',
            severity: "medium",
            summary: 'Moderate interaction.',
            clinicalDetail: 'Alters metabolism.',
            mechanisms: [
              { type: 'Pharmacokinetic', mechanism: 'Inhibits CYP3A4' }
            ],
            evidences: [
              {
                source: { title: 'Study A', url: 'http://test.url' },
                summary: 'Clear evidence of interaction.',
                date: '2023-01-01',
                type: 'clinical_trial'
              }
            ],
            verificationStatus: "verified",
            evidenceLevel: "peer_reviewed",
            source: 'Literature',
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        }
      ]
    };

    render(<MedicalReport {...props} />);

    expect(screen.getByText('Mekanizma Detayları:')).toBeInTheDocument();
    expect(screen.getByText('- Pharmacokinetic: Inhibits CYP3A4')).toBeInTheDocument();

    expect(screen.getByText('Bilimsel Referanslar:')).toBeInTheDocument();
    expect(screen.getByText('Study A')).toBeInTheDocument();
    expect(screen.getByText('http://test.url')).toBeInTheDocument();
    expect(screen.getByText('“Clear evidence of interaction.”')).toBeInTheDocument();
  });
});
