type FoodSubstanceIconProps = {substance:string;className?:string};

/** The pictured substance is independent of the clinical severity colour. */
export default function FoodSubstanceIcon({substance,className="h-5 w-5 shrink-0"}:FoodSubstanceIconProps) {
  const value=substance.toLocaleLowerCase("tr-TR");
  const alcohol=value.includes("alkol");
  const citrus=value.includes("greyfurt") || value.includes("portakal");
  const greens=value.includes("vitamini") || value.includes("ıspanak") || value.includes("brokoli");
  return <svg viewBox="0 0 24 24" className={className} role="img" aria-label={alcohol?"Alkol":citrus?"Narenciye":greens?"Yeşil yapraklı gıdalar":"Gıda ve içecek"} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    {alcohol?<><path d="M7 3h10l-1 7a4 4 0 0 1-8 0L7 3Zm5 11v7m-4 0h8"/><path d="M8 8h8"/></>:citrus?<><circle cx="12" cy="13" r="8"/><path d="M12 5V2m0 3c4 0 6-2 6-3-3 0-5 0-6 3Zm0 4v8m-4-4h8m-7-3 6 6m0-6-6 6"/></>:greens?<><path d="M20 3C9 1 3 7 4 14c1 8 14 10 16-11Z"/><path d="m4 21 12-13m-9 9-1-5m5 1 5 1"/></>:<><path d="M5 3v7m3-7v7m-6-7v7c0 2 6 2 6 0m-3 2v9m13-18v18m0-18c-6 2-7 10 0 10"/></>}
  </svg>;
}
