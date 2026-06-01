export default function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-8 rounded-3xl shadow-lg hover:shadow-indigo-500/5 hover:border-indigo-500/30 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-32 bg-linear-to-bl from-indigo-500/5 to-transparent rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative z-10">
        <div className="text-3xl mb-5 p-3 bg-white/5 border border-white/10 rounded-xl inline-block shadow-inner group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <h3 className="text-lg font-bold text-white mb-2 tracking-tight">{title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed font-medium">{description}</p>
      </div>
    </div>
  );
}
