export function VirtualPillboxBackground() {
  return (
    <>
      {/* Dynamic visual mesh background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]"
        style={{ transform: "translateZ(-20px)" }}
      />

      <div
        className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"
        style={{ transform: "translateZ(-30px)" }}
      />
      <div
        className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"
        style={{ transform: "translateZ(-30px)" }}
      />
    </>
  );
}
