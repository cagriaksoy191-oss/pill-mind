/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import AccumulationWarnings from '@/components/MedicalReportSections/AccumulationWarnings';
import Contraindications from '@/components/MedicalReportSections/Contraindications';
import Disclaimer from '@/components/MedicalReportSections/Disclaimer';
import DrugInteractions from '@/components/MedicalReportSections/DrugInteractions';
import FoodInteractions from '@/components/MedicalReportSections/FoodInteractions';
import PolypharmacyReport from '@/components/MedicalReportSections/PolypharmacyReport';
import ReportHeader from '@/components/MedicalReportSections/ReportHeader';
import SelectedDrugsList from '@/components/MedicalReportSections/SelectedDrugsList';
import { CheckResult, Drug } from '@/lib/interactions';

describe('MedicalReportSections', () => {
  describe('AccumulationWarnings', () => {
    it('renders null when accumulationWarnings is empty', () => {
      const { container } = render(<AccumulationWarnings accumulationWarnings={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders list of warnings when accumulationWarnings is provided', () => {
      const warnings = [
        { message: 'Aspirin accumulation risk', drugs: [] },
        { message: 'Paracetamol dose overlap', drugs: [] },
      ];
      render(<AccumulationWarnings accumulationWarnings={warnings} />);
      expect(screen.getByText('🚨 Aşırı Doz / Farmakolojik Grup Çakışmaları')).toBeInTheDocument();
      expect(screen.getByText('Aspirin accumulation risk')).toBeInTheDocument();
      expect(screen.getByText('Paracetamol dose overlap')).toBeInTheDocument();
    });
  });

  describe('Contraindications', () => {
    it('renders null when contraindications is empty', () => {
      const { container } = render(<Contraindications contraindications={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders contraindications with diseaseName when present', () => {
      const contraindications = [
        { drugName: 'Ibuprofen', diseaseName: 'Asthma', message: 'Avoid in active asthma', diseaseIcd: 'J45' }
      ];
      render(<Contraindications contraindications={contraindications} />);
      expect(screen.getByText('❌ Kritik Tıbbi Uyumsuzluklar (Contraindications)')).toBeInTheDocument();
      expect(screen.getByText(/Ibuprofen & Asthma:/i)).toBeInTheDocument();
      expect(screen.getByText(/Avoid in active asthma/i)).toBeInTheDocument();
    });

    it('renders contraindications falling back to diseaseIcd when diseaseName is empty', () => {
      const contraindications = [
        { drugName: 'Aspirin', diseaseName: '', message: 'Avoid in ulcer', diseaseIcd: 'K25' }
      ];
      render(<Contraindications contraindications={contraindications} />);
      expect(screen.getByText(/Aspirin & K25:/i)).toBeInTheDocument();
      expect(screen.getByText(/Avoid in ulcer/i)).toBeInTheDocument();
    });
  });

  describe('Disclaimer', () => {
    it('renders disclaimer text properly', () => {
      render(<Disclaimer />);
      expect(screen.getByText('⚠️ Önemli Klinik Yasal Uyarı')).toBeInTheDocument();
      expect(screen.getByText(/Bu rapor, yalnızca kürate edilmiş demo tıbbi veri setleri/i)).toBeInTheDocument();
    });
  });

  describe('DrugInteractions', () => {
    it('renders no interactions notice when interactions array is empty', () => {
      render(<DrugInteractions interactions={[]} explanations={{}} />);
      expect(screen.getByText('💚 Etkileşim Durumu')).toBeInTheDocument();
      expect(screen.getByText('Kayıtlı veri setinde bilinen etkileşim saptanmadı.')).toBeInTheDocument();
    });

    it('renders interactions with patient explanations and clinical mode table', () => {
      const mockInteractions: CheckResult[] = [
        {
          drug1Name: 'Drug Alpha',
          drug2Name: 'Drug Beta',
          interaction: {
            id: 'int-101',
            drug1Id: 'd1',
            drug2Id: 'd2',
            severity: 'high',
            summary: 'High risk of arrhythmia',
            clinicalDetail: 'Prolongs QT interval',
            mechanisms: [{ type: 'Pharmacodynamic', mechanism: 'Synergistic QT prolongation' }],
            evidences: [
              {
                source: { title: 'Journal of Cardiology', url: 'https://example.com/study' },
                summary: 'Observed QT prolongation in clinical trials',
                date: '2022-05-10',
                type: 'clinical_trial'
              }
            ],
            verificationStatus: 'verified',
            evidenceLevel: 'fda_approved',
            source: 'FDA',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        }
      ];

      const explanations = {
        'int-101': {
          explanation: 'These two medicines may affect your heart rhythm if taken together.'
        }
      };

      render(<DrugInteractions interactions={mockInteractions} explanations={explanations} />);

      expect(screen.getByText('1. Hasta İçin Sadeleştirilmiş Etkileşim Açıklamaları')).toBeInTheDocument();
      expect(screen.getByText('HIGH RİSK')).toBeInTheDocument();
      expect(screen.getByText('Drug Alpha & Drug Beta Etkileşimi')).toBeInTheDocument();
      expect(screen.getByText('High risk of arrhythmia')).toBeInTheDocument();
      expect(screen.getByText('These two medicines may affect your heart rhythm if taken together.')).toBeInTheDocument();

      expect(screen.getByText('2. Sağlık Profesyonelleri İçin Klinik Detaylar (Klinik Mod)')).toBeInTheDocument();
      expect(screen.getByText(/Mekanizma:/)).toBeInTheDocument();
      expect(screen.getByText(/Prolongs QT interval/)).toBeInTheDocument();
      expect(screen.getByText('- Pharmacodynamic: Synergistic QT prolongation')).toBeInTheDocument();
      expect(screen.getByText('Journal of Cardiology')).toBeInTheDocument();
      expect(screen.getByText('https://example.com/study')).toBeInTheDocument();
      expect(screen.getByText('“Observed QT prolongation in clinical trials”')).toBeInTheDocument();
    });

    it('handles interaction without optional mechanisms, evidences, clinicalDetail, or explanations', () => {
      const mockInteractions: CheckResult[] = [
        {
          drug1Name: 'Drug X',
          drug2Name: 'Drug Y',
          interaction: {
            id: 'int-102',
            drug1Id: 'dx',
            drug2Id: 'dy',
            severity: 'low',
            summary: 'Minor interaction',
            verificationStatus: 'unverified',
            evidenceLevel: 'literature',
            source: 'Database',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        }
      ];

      render(<DrugInteractions interactions={mockInteractions} explanations={{}} />);

      expect(screen.getByText('LOW RİSK')).toBeInTheDocument();
      expect(screen.getByText('Drug X & Drug Y Etkileşimi')).toBeInTheDocument();
      expect(screen.getByText('Minor interaction')).toBeInTheDocument();
      expect(screen.getByText('Kanıt: literature')).toBeInTheDocument();
      expect(screen.getByText('Onay: unverified')).toBeInTheDocument();
      expect(screen.queryByText('Mekanizma Detayları:')).not.toBeInTheDocument();
      expect(screen.queryByText('Bilimsel Referanslar:')).not.toBeInTheDocument();
    });
  });

  describe('FoodInteractions', () => {
    it('renders null when foodInteractions is empty', () => {
      const { container } = render(<FoodInteractions foodInteractions={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders list of food interactions when provided', () => {
      const foodInteractions = [
        { drugName: 'Warfarin', substance: 'Grapefruit', severity: 'high', effect: 'Increases drug level' }
      ];
      render(<FoodInteractions foodInteractions={foodInteractions} />);
      expect(screen.getByText('🥗 Gıda, Alkol ve Besin Etkileşim Raporu')).toBeInTheDocument();
      expect(screen.getByText(/Warfarin & Grapefruit \(HIGH Risk\):/i)).toBeInTheDocument();
      expect(screen.getByText('Increases drug level')).toBeInTheDocument();
    });
  });

  describe('PolypharmacyReport', () => {
    it('renders null when polypharmacyReport is null', () => {
      const { container } = render(<PolypharmacyReport polypharmacyReport={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders null when score is less than 4 and beersWarnings is empty', () => {
      const { container } = render(
        <PolypharmacyReport polypharmacyReport={{ score: 3, message: 'Low risk', beersWarnings: [] }} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders report when score >= 4', () => {
      render(
        <PolypharmacyReport polypharmacyReport={{ score: 5, message: 'Polypharmacy detected', beersWarnings: [] }} />
      );
      expect(screen.getByText('📊 Polifarmasi & Beers Yaşlı Hasta Analizi')).toBeInTheDocument();
      expect(screen.getByText('Polypharmacy detected')).toBeInTheDocument();
    });

    it('renders report when beersWarnings is non-empty even if score < 4', () => {
      render(
        <PolypharmacyReport
          polypharmacyReport={{ score: 2, message: 'Elderly caution', beersWarnings: ['Beers warning 1'] }}
        />
      );
      expect(screen.getByText('📊 Polifarmasi & Beers Yaşlı Hasta Analizi')).toBeInTheDocument();
      expect(screen.getByText('Elderly caution')).toBeInTheDocument();
      expect(screen.getByText('Beers warning 1')).toBeInTheDocument();
    });
  });

  describe('ReportHeader', () => {
    it('renders header elements properly', () => {
      render(<ReportHeader />);
      expect(screen.getByText('💊 PillMind Klinik İlaç Etkileşim Raporu')).toBeInTheDocument();
      expect(screen.getByText(/CONFIDENTIAL \/ CLINICAL ANALYSIS REPORT/)).toBeInTheDocument();
    });
  });

  describe('SelectedDrugsList', () => {
    it('renders list of selected drugs', () => {
      const selectedDrugs: Drug[] = [
        { id: 'd1', name: 'Aspirin', activeIngredient: 'Acetylsalicylic acid', category: 'NSAID' },
        { id: 'd2', name: 'Atorvastatin', activeIngredient: 'Atorvastatin calcium', category: 'Statin' }
      ];
      render(<SelectedDrugsList selectedDrugs={selectedDrugs} />);
      expect(screen.getByText('Değerlendirilen Sanal İlaç Kutusu İçeriği')).toBeInTheDocument();
      expect(screen.getByText('Aspirin')).toBeInTheDocument();
      expect(screen.getByText('Acetylsalicylic acid (NSAID)')).toBeInTheDocument();
      expect(screen.getByText('Atorvastatin')).toBeInTheDocument();
      expect(screen.getByText('Atorvastatin calcium (Statin)')).toBeInTheDocument();
    });
  });
});
