/** @jest-environment jsdom */
import {render,screen} from "@testing-library/react";
import "@testing-library/jest-dom";
import LiveFoodInteractions from "@/components/LiveReports/LiveFoodInteractions";
import FoodInteractions from "@/components/MedicalReportSections/FoodInteractions";
import {findFoodInteractions} from "@/lib/interactions/food";

describe("Food guidance and grouped substance warnings",()=>{
  const drugs=["metformin","enalapril","ibuprofen"];
  it("shows one alcohol group while retaining both medicine-specific warnings",()=>{
    const results=findFoodInteractions(drugs);
    render(<LiveFoodInteractions foodInteractions={results}/>);
    expect(screen.getAllByRole("img",{name:"Alkol"})).toHaveLength(1);
    expect(screen.getByText(/1 Uyarı · 1 Bilgi/)).toBeInTheDocument();
    for(const warning of results.filter(item=>item.substance==="Alkol"))expect(screen.getByText(warning.effect)).toBeInTheDocument();
    expect(screen.getByText("Yemek / Öğün")).toBeInTheDocument();
    expect(screen.getByRole("link",{name:/DailyMed/})).toHaveAttribute("href",expect.stringContaining("https://dailymed.nlm.nih.gov/"));
  });
  it("resolves aliases and does not add meal information to unrelated drugs",()=>{
    expect(findFoodInteractions(["  Metformin "]).filter(item=>item.kind==="usage")).toHaveLength(1);
    expect(findFoodInteractions(["ibuprofen"]).some(item=>item.kind==="usage")).toBe(false);
  });
  it("prints meal information without calling it a risk",()=>{
    const usage=findFoodInteractions(drugs).filter(item=>item.kind==="usage");
    render(<FoodInteractions foodInteractions={usage}/>);
    expect(screen.getByText(/Kullanım Bilgisi/)).toBeInTheDocument();
    expect(screen.queryByText(/Düşük Risk/)).not.toBeInTheDocument();
  });
});
