import FeatureCard from "./FeatureCard";

export default function FeaturesSection() {
  return (
    <section className="grid sm:grid-cols-3 gap-6 w-full mt-4">
      <FeatureCard
        icon="🛡️"
        title="Deterministik Klinik Çekirdek"
        description="Tüm etkileşim verileri FDA prospektüsleri ve bilimsel farmakoloji veri tabanlarından alınarak doğrulanır."
      />
      <FeatureCard
        icon="🧠"
        title="Çift Ajanlı Canlı AI"
        description="Karmaşık bildirimleri tıbbi olarak onaylanmış, sade ve şefkatli bir Türkçe ile okuyun ve hekiminize bilinçli danışın."
      />
      <FeatureCard
        icon="⚡"
        title="Sanal İlaç Kutusu (3D)"
        description="İlaçlarınızı şık 3D animasyonlu kutunuza sürükleyin, hatalı veya Türkçe karakter eksik yazımlarda bile anında eşleşme yakalayın."
      />
    </section>
  );
}
