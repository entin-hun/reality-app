/**
 * Block Renderer Components
 * 
 * Ezek a komponensek renderelik a CMS blokkokat a frontend oldalon.
 * Minden blokk típushoz egy külön komponens tartozik.
 */

import type { Block } from '@/lib/cms/types';
import { useTranslations } from 'next-intl';

/** Fő blokk renderelő komponens */
export function BlockRenderer({ block }: { block: Block }) {
  if (!block.visible) return null;

  const paddingClass = {
    none: '',
    small: 'py-4',
    medium: 'py-8',
    large: 'py-16',
  }[block.settings.padding || 'medium'];

  const layoutClass = {
    full: 'w-full',
    wide: 'max-w-7xl mx-auto px-4',
    narrow: 'max-w-3xl mx-auto px-4',
    split: 'max-w-7xl mx-auto px-4 grid grid-cols-2 gap-8',
  }[block.layout || 'full'];

  const bgColor = block.settings.backgroundColor
    ? { backgroundColor: block.settings.backgroundColor }
    : {};

  const className = `${paddingClass} ${layoutClass} ${block.settings.className || ''}`.trim();

  return (
    <section className={className} style={bgColor}>
      {block.type === 'hero' && <HeroBlock content={block.content} />}
      {block.type === 'text' && <TextBlock content={block.content} />}
      {block.type === 'image' && <ImageBlock content={block.content} />}
      {block.type === 'video' && <VideoBlock content={block.content} />}
      {block.type === 'gallery' && <GalleryBlock content={block.content} />}
      {block.type === 'cta' && <CTABlock content={block.content} />}
      {block.type === 'divider' && <DividerBlock />}
      {block.type === 'spacer' && <SpacerBlock content={block.content} />}
      {block.type === ('html' as any) && <HtmlBlock content={block.content} />}
    </section>
  );
}

/** Hero Block */
function HeroBlock({ content }: { content: Record<string, any> }) {
  const t = useTranslations('common');
  
  return (
    <div className="text-center">
      <h1 className="text-5xl md:text-7xl font-bold mb-4 text-white">
        {content.title?.hu || content.title?.en || ''}
      </h1>
      {content.subtitle && (
        <p className="text-xl md:text-2xl text-gray-300 mb-8">
          {content.subtitle?.hu || content.subtitle?.en || ''}
        </p>
      )}
      {content.ctaText && content.ctaLink && (
        <a
          href={content.ctaLink}
          className="inline-block px-8 py-4 bg-brand-red text-white text-lg font-semibold rounded hover:bg-red-700 transition"
        >
          {content.ctaText?.hu || content.ctaText?.en || ''}
        </a>
      )}
    </div>
  );
}

/** Text Block */
function TextBlock({ content }: { content: Record<string, any> }) {
  const text = content.content?.hu || content.content?.en || '';
  
  return (
    <div className="prose prose-lg max-w-none">
      {text.split('\n\n').map((paragraph: string, index: number) => (
        <p key={index} className="mb-4 text-gray-700">
          {paragraph}
        </p>
      ))}
    </div>
  );
}

/** Image Block */
function ImageBlock({ content }: { content: Record<string, any> }) {
  if (!content.src) return null;

  return (
    <figure className="text-center">
      <img
        src={content.src}
        alt={content.alt?.hu || content.alt?.en || ''}
        className="max-w-full h-auto rounded-lg shadow-lg"
      />
      {content.caption && (
        <figcaption className="mt-2 text-sm text-gray-600">
          {content.caption?.hu || content.caption?.en || ''}
        </figcaption>
      )}
    </figure>
  );
}

/** Video Block */
function VideoBlock({ content }: { content: Record<string, any> }) {
  if (!content.url) return null;

  // YouTube URL konverzió embed formátumra
  const getEmbedUrl = (url: string) => {
    const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/;
    const match = url.match(youtubeRegex);
    if (match) {
      let embedUrl = `https://www.youtube.com/embed/${match[1]}`;
      const params: string[] = [];
      if (content.autoplay) params.push('autoplay=1');
      if (content.loop) params.push('loop=1', 'playlist=' + match[1]);
      if (params.length > 0) embedUrl += '?' + params.join('&');
      return embedUrl;
    }
    return url;
  };

  const embedUrl = getEmbedUrl(content.url);

  return (
    <div className="aspect-video w-full">
      <iframe
        src={embedUrl}
        className="w-full h-full rounded-lg shadow-lg"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

/** Gallery Block */
function GalleryBlock({ content }: { content: Record<string, any> }) {
  const images = content.images || [];

  if (images.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {images.map((image: any, index: number) => (
        <div key={index} className="aspect-square overflow-hidden rounded-lg">
          <img
            src={image.src}
            alt={image.alt?.hu || image.alt?.en || ''}
            className="w-full h-full object-cover hover:scale-110 transition duration-300"
          />
        </div>
      ))}
    </div>
  );
}

/** CTA Block */
function CTABlock({ content }: { content: Record<string, any> }) {
  const variant: 'primary' | 'secondary' | 'outline' = content.variant || 'primary';
  
  const variantClasses: Record<string, string> = {
    primary: 'bg-brand-red text-white hover:bg-red-700',
    secondary: 'bg-brand-gold text-white hover:bg-yellow-600',
    outline: 'border-2 border-brand-red text-brand-red hover:bg-brand-red hover:text-white',
  };

  return (
    <div className="text-center">
      <a
        href={content.link || '#'}
        className={`inline-block px-8 py-4 text-lg font-semibold rounded transition ${variantClasses[variant] || variantClasses.primary}`}
      >
        {content.text?.hu || content.text?.en || ''}
      </a>
    </div>
  );
}

/** Divider Block */
function DividerBlock() {
  return <hr className="border-gray-300 my-8" />;
}

/** Spacer Block */
function SpacerBlock({ content }: { content: Record<string, any> }) {
  const heightMap: Record<string, string> = {
    small: 'h-8',
    medium: 'h-16',
    large: 'h-32',
  };
  const height = heightMap[content.height || 'medium'] || heightMap.medium;

  return <div className={height} />;
}

/** HTML Block — renders raw HTML from GrapesJS editor */
function HtmlBlock({ content }: { content: Record<string, any> }) {
  return (
    <div
      className="efu-html-block"
      dangerouslySetInnerHTML={{ __html: content.html || '' }}
    />
  );
}
