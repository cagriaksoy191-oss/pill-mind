/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Disclaimer from '../components/Disclaimer';

describe('Disclaimer Component', () => {
  it('renders without crashing and displays the correct disclaimer text', () => {
    render(<Disclaimer />);

    expect(screen.getByText(/PillMind bir bilgilendirme aracıdır/i)).toBeInTheDocument();
    expect(screen.getByText(/Tıbbi tavsiye niteliği taşımaz/i)).toBeInTheDocument();
    expect(screen.getByText(/Sonuçlar sınırlı bir demo veri setine dayanabilir/i)).toBeInTheDocument();
    expect(screen.getByText(/Sağlık kararlarınız için mutlaka doktorunuza veya eczacınıza danışın/i)).toBeInTheDocument();
  });
});
