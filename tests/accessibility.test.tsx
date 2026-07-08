/**
 * @jest-environment jsdom
 */
import { useRef } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useFocusTrap } from "../hooks/useFocusTrap";
import DrugSelector from "../components/DrugSelector";
import { fuzzySearchDrugs } from "../lib/fuzzySearch";

// Mock fuzzySearch to control returns
jest.mock("../lib/fuzzySearch", () => ({
  fuzzySearchDrugs: jest.fn()
}));

const mockDrugs = [
  { id: "1", name: "Aspirin", activeIngredient: "ASA", category: "Analgesic" },
  { id: "2", name: "Parol", activeIngredient: "Paracetamol", category: "Analgesic" },
];


function TestEmptyTrapComponent({ isActive }: { isActive: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, isActive);
  return (
    <div ref={ref} data-testid="empty-container">
      <p>No focusable elements here</p>
    </div>
  );
}

// Test component for useFocusTrap
function TestTrapComponent({ isActive }: { isActive: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, isActive);
  return (
    <div ref={ref}>
      <button data-testid="first">First</button>
      <input data-testid="middle" />
      <button data-testid="last">Last</button>
    </div>
  );
}

describe("Accessibility & Keyboard Navigation Tests", () => {
  describe("useFocusTrap Hook", () => {
    it("should trap focus and cycle from last to first on Tab press", () => {
      render(<TestTrapComponent isActive={true} />);
      const firstEl = screen.getByTestId("first");
      const lastEl = screen.getByTestId("last");

      lastEl.focus();
      expect(document.activeElement).toBe(lastEl);

      // Simulate Tab keydown event
      fireEvent.keyDown(lastEl, { key: "Tab", shiftKey: false });
      
      // Focus should move to the first element
      expect(document.activeElement).toBe(firstEl);
    });

    it("should trap focus and cycle from first to last on Shift+Tab press", () => {
      render(<TestTrapComponent isActive={true} />);
      const firstEl = screen.getByTestId("first");
      const lastEl = screen.getByTestId("last");

      firstEl.focus();
      expect(document.activeElement).toBe(firstEl);

      // Simulate Shift+Tab keydown event
      fireEvent.keyDown(firstEl, { key: "Tab", shiftKey: true });

      // Focus should move to the last element
      expect(document.activeElement).toBe(lastEl);
    });

    it("should not intercept focus navigation if isActive is false", () => {
      render(<TestTrapComponent isActive={false} />);
      const firstEl = screen.getByTestId("first");

      firstEl.focus();
      expect(document.activeElement).toBe(firstEl);

      // Simulate Tab press - hook shouldn't change the active element manually
      const prevActive = document.activeElement;
      fireEvent.keyDown(firstEl, { key: "Tab" });
      
      expect(document.activeElement).toBe(prevActive);
    });

    it("should prevent default tab behavior if no focusable elements are present", () => {
      render(<TestEmptyTrapComponent isActive={true} />);
      const container = screen.getByTestId("empty-container");

      const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
      Object.defineProperty(event, 'preventDefault', {
        value: jest.fn(),
        configurable: true
      });

      fireEvent(container, event);

      expect(event.preventDefault).toHaveBeenCalled();
    });
  });

  describe("DrugSelector Accessibility & Keyboard Nav", () => {
    const mockOnSelect = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should navigate via ArrowDown and ArrowUp and select via Enter", () => {
      (fuzzySearchDrugs as jest.Mock).mockReturnValue([
        { item: mockDrugs[0], score: 1 },
        { item: mockDrugs[1], score: 1 },
      ]);

      render(<DrugSelector drugs={mockDrugs} selected={[]} onSelect={mockOnSelect} />);
      const input = screen.getByPlaceholderText(/İlaç adı, etken madde veya marka yazın/i);

      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: "a" } });

      // First ArrowDown highlights first item (Aspirin)
      fireEvent.keyDown(input, { key: "ArrowDown" });
      // Second ArrowDown highlights second item (Parol)
      fireEvent.keyDown(input, { key: "ArrowDown" });
      // ArrowUp highlights first item again (Aspirin)
      fireEvent.keyDown(input, { key: "ArrowUp" });

      // Enter selects highlighted item (Aspirin - drug ID '1')
      fireEvent.keyDown(input, { key: "Enter" });
      expect(mockOnSelect).toHaveBeenCalledWith(["1"]);
    });

    it("should update aria-live announcer on drug addition and removal", () => {
      const { rerender } = render(
        <DrugSelector drugs={mockDrugs} selected={[]} onSelect={mockOnSelect} />
      );

      // We should check that aria-live live announcer is empty initially
      const announcer = screen.getByText("", { selector: '[aria-live="assertive"]' });
      expect(announcer).toBeInTheDocument();
      expect(announcer.textContent).toBe("");

      // Simulate adding a drug
      (fuzzySearchDrugs as jest.Mock).mockReturnValue([
        { item: mockDrugs[0], score: 1 }
      ]);
      const input = screen.getByPlaceholderText(/İlaç adı, etken madde veya marka yazın/i);
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: "Asp" } });
      const option = screen.getByText("Aspirin").closest("button");
      fireEvent.click(option!);

      // Announcer should update to drug addition message
      expect(announcer.textContent).toBe("Aspirin ilacı kutuya eklendi.");

      // Now rerender with selected = ["1"]
      rerender(<DrugSelector drugs={mockDrugs} selected={["1"]} onSelect={mockOnSelect} />);
      
      // Click remove button
      const removeBtn = screen.getByRole("button", { name: /Aspirin ilacını arama kutusundan kaldır/i });
      fireEvent.click(removeBtn);

      // Announcer should update to removal message
      expect(announcer.textContent).toBe("Aspirin ilacı kutudan kaldırıldı.");
    });
  });
});
