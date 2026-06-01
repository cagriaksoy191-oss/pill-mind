export default function BackgroundEffects() {
  return (
    <>
      <div className="absolute top-[15%] left-[20%] w-[35rem] h-[35rem] rounded-full bg-indigo-500/10 blur-[130px] pointer-events-none animate-pulse-slow"></div>
      <div className="absolute bottom-[10%] right-[15%] w-[40rem] h-[40rem] rounded-full bg-purple-500/10 blur-[140px] pointer-events-none animate-pulse-slow"></div>
      <div className="absolute top-[50%] left-[40%] w-[25rem] h-[25rem] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none"></div>
    </>
  );
}
