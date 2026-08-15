import Image from 'next/image';

type Pillar = {
  title: string;
  tag: string;
  description: string;
  logo: string;
};

const pillars: Pillar[] = [
  {
    title: 'EFU Reality',
    tag: 'Tehetségkutatás',
    description:
      'Többhetes verseny- és tehetségkutató formátum. A résztvevők feladatokon, kihívásokon és küzdelmeken keresztül bizonyíthatják rátermettségüket, miközben a nézők betekintést nyernek a személyiségükbe, felkészülésükbe és mindennapjaikba.',
    logo: '/logos/reality.webp',
  },
  {
    title: 'EFU Fight Night',
    tag: 'Gálasorozat',
    description:
      'Az EFU hivatalos gálasorozata. Kiemelt mérkőzések, rangsoroló összecsapások és bajnoki küzdelmek — amatőr, félprofi és profi versenyzőknek.',
    logo: '/logos/fight-night.webp',
  },
  {
    title: 'EFU TV',
    tag: 'Digitális platform',
    description:
      'Az Elite Fight Universe digitális platformja. Élő közvetítések, reality epizódok, gálák, interjúk, háttéranyagok, exkluzív tartalmak.',
    logo: '/logos/fight-tv.webp',
  },
];

export function EfuPillars() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {pillars.map((p) => (
        <div
          key={p.title}
          className="card-dark rounded-xl p-6 hover:border-brand-dark-muted transition-colors group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="relative w-12 h-12 group-hover:scale-110 transition-transform">
              <Image
                src={p.logo}
                alt={p.title}
                fill
                className="object-contain"
              />
            </div>
            <span className="text-[10px] uppercase tracking-widest font-bold text-gray-500">
              {p.tag}
            </span>
          </div>
          <h3
            className="text-2xl font-black uppercase text-white mb-3"
            style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
          >
            {p.title}
          </h3>
          <p className="text-gray-400 text-sm leading-relaxed">{p.description}</p>
        </div>
      ))}
    </div>
  );
}