'use client';

interface ComingSoonProps {
  title: string;
  description?: string;
  icon?: string;
}

export function ComingSoon({ title, description, icon = '🚧' }: ComingSoonProps) {
  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto mt-16 text-center">
        <div className="text-6xl mb-6">{icon}</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{title}</h1>
        <p className="text-gray-600 text-lg mb-8">
          {description || 'Ez a funkció hamarosan elérhető lesz.'}
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm">
          <span>⏳</span>
          <span>Fejlesztés alatt</span>
        </div>
      </div>
    </div>
  );
}
