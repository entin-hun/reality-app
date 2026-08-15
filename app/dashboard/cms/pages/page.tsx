/**
 * CMS Pages Admin Page
 * 
 * Ez az oldal listázza az összes CMS oldalt, és lehetővé teszi
 * új oldalak létrehozását, szerkesztését és törlését.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Page } from '@/lib/cms/types';

export default function CmsPagesAdmin() {
  const router = useRouter();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPages();
  }, []);

  async function loadPages() {
    try {
      setLoading(true);
      const response = await fetch('/api/cms/pages');
      const data = await response.json();
      
      if (response.ok) {
        setPages(data.pages);
      } else {
        setError(data.error || 'Failed to load pages');
      }
    } catch (err) {
      setError('Failed to load pages');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(slug: string) {
    if (!confirm(`Biztosan törölni szeretnéd ezt az oldalt: ${slug}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/cms/pages/${slug}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadPages();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete page');
      }
    } catch (err) {
      setError('Failed to delete page');
    }
  }

  async function handleCreate() {
    const slug = prompt('Add meg az oldal slug-jét (pl. "rolunk"):');
    if (!slug) return;

    const titleHu = prompt('Cím (magyarul):');
    if (!titleHu) return;

    const titleEn = prompt('Cím (angolul):') || titleHu;

    try {
      const response = await fetch('/api/cms/pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slug,
          title: {
            hu: titleHu,
            en: titleEn,
          },
          blocks: [],
          seo: {
            title: { hu: titleHu, en: titleEn },
            description: { hu: '', en: '' },
          },
          published: false,
        }),
      });

      if (response.ok) {
        await loadPages();
        router.push(`/dashboard/cms/pages/${slug}`);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create page');
      }
    } catch (err) {
      setError('Failed to create page');
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">Betöltés...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={loadPages}
          className="px-4 py-2 bg-brand-red text-white rounded hover:bg-red-700"
        >
          Újra próbál
        </button>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">CMS Oldalak</h1>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-brand-red text-white rounded hover:bg-red-700"
        >
          + Új oldal
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Slug
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cím (HU)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cím (EN)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Blokkok
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Állapot
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Műveletek
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pages.map((page) => (
              <tr key={page.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {page.slug}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {page.title.hu || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {page.title.en || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {page.blocks.length}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      page.published
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {page.published ? 'Publikált' : 'Piszkozat'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => router.push(`/dashboard/cms/pages/${page.slug}`)}
                    className="text-brand-red hover:text-red-900"
                  >
                    Szerkeszt
                  </button>
                  <button
                    onClick={() => handleDelete(page.slug)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Töröl
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {pages.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Még nincsenek oldalak. Kattints az "Új oldal" gombra a létrehozáshoz.
          </div>
        )}
      </div>
    </div>
  );
}
