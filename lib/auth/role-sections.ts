/**
 * Role -> sidebar visibility mapping.
 *
 * Single source of truth for which role sees which nav items in the /admin
 * shell. Both the server (layout enforcement) and the client (sidebar render)
 * consume this list, so a role never "sees" a link it cannot reach.
 *
 * Section keys are short ids; the admin i18n namespace `admin.nav.<key>`
 * carries the human label.
 *
 * Roles:
 *   - Rendszeradminisztrator: full access (everything)
 *   - Producer: events / fight cards / results / votes / reality triggers / chat moderation
 *   - Reality szerkeszto: votes / reality triggers / audio library
 *   - Tartalomkeszito: pages / news / videos / photos / fighter profiles
 *   - Marketing: news / sponsors / social-media link registry / analytics
 *   - Moderator: chat moderation only
 *
 * Each entry is the *role's* visible section list — admin can always see
 * every section, moderator sees only moderation. The shell filters sections
 * per-role at render time, and the server-side guards repeat the same rule
 * for every page so a tampered cookie never reaches a hidden route.
 */

import type { Role } from './dev-role';

export type AdminSectionKey =
  // Workspace
  | 'dashboard'
  | 'applications'
  | 'analytics'
  // Reality / Producer
  | 'events'
  | 'fight-cards'
  | 'results'
  | 'votes'
  | 'reality-triggers'
  | 'audio-library'
  // Content
  | 'pages'
  | 'news'
  | 'videos'
  | 'photos'
  | 'fighter-profiles'
  // Marketing
  | 'sponsors'
  | 'social-links'
  // Chat moderation
  | 'chat-moderation'
  // System
  | 'users'
  | 'roles'
  | 'audit-logs'
  | 'system-settings';

export interface AdminSectionDef {
  key: AdminSectionKey;
  href: string;
  i18nKey: string; // dot-path under admin.nav (e.g. 'applications')
  icon: 'home' | 'inbox' | 'chart' | 'calendar' | 'swords' | 'trophy' | 'vote' | 'zap' | 'music' | 'file' | 'news' | 'video' | 'image' | 'user' | 'handshake' | 'link' | 'shield' | 'users' | 'key' | 'scroll' | 'settings';
  /** Coarse grouping used to render section headers in the sidebar. */
  group: 'workspace' | 'reality' | 'content' | 'marketing' | 'moderation' | 'system';
  /** Minimum role required to *reach* the page (server still enforces per-page). */
  requiredRoles: ReadonlyArray<Role>;
}

/**
 * Master list of all admin sections, in render order.
 *
 * Adding a new admin page = adding an entry here AND a route under
 * `/app/dashboard/<href>/page.tsx` that re-checks `requiredRoles`. The sidebar
 * reads `requiredRoles` to decide visibility; the page repeats the check
 * because the sidebar can be tampered with (DOM-only) but a forged request
 * hits the route handler.
 */
export const ADMIN_SECTIONS: ReadonlyArray<AdminSectionDef> = [
  // ── Workspace (everyone with admin access) ───────────────────────
  {
    key: 'dashboard',
    href: '/dashboard',
    i18nKey: 'dashboard',
    icon: 'home',
    group: 'workspace',
    requiredRoles: [
      'Rendszeradminisztrator',
      'Producer',
      'Reality szerkeszto',
      'Tartalomkeszito',
      'Marketing',
      'Moderator',
    ],
  },
  {
    key: 'applications',
    href: '/dashboard/applications',
    i18nKey: 'applications',
    icon: 'inbox',
    group: 'workspace',
    requiredRoles: ['Rendszeradminisztrator', 'Producer', 'Reality szerkeszto'],
  },
  {
    key: 'analytics',
    href: '/dashboard/analytics',
    i18nKey: 'analytics',
    icon: 'chart',
    group: 'workspace',
    requiredRoles: ['Rendszeradminisztrator', 'Producer', 'Marketing'],
  },

  // ── Reality / Producer ──────────────────────────────────────────
  {
    key: 'events',
    href: '/dashboard/events',
    i18nKey: 'events',
    icon: 'calendar',
    group: 'reality',
    requiredRoles: ['Rendszeradminisztrator', 'Producer'],
  },
  {
    key: 'fight-cards',
    href: '/dashboard/fight-cards',
    i18nKey: 'fightCards',
    icon: 'swords',
    group: 'reality',
    requiredRoles: ['Rendszeradminisztrator', 'Producer'],
  },
  {
    key: 'results',
    href: '/dashboard/results',
    i18nKey: 'results',
    icon: 'trophy',
    group: 'reality',
    requiredRoles: ['Rendszeradminisztrator', 'Producer'],
  },
  {
    key: 'votes',
    href: '/dashboard/votes',
    i18nKey: 'votes',
    icon: 'vote',
    group: 'reality',
    requiredRoles: ['Rendszeradminisztrator', 'Producer', 'Reality szerkeszto'],
  },
  {
    key: 'reality-triggers',
    href: '/dashboard/reality-triggers',
    i18nKey: 'realityTriggers',
    icon: 'zap',
    group: 'reality',
    requiredRoles: ['Rendszeradminisztrator', 'Producer', 'Reality szerkeszto'],
  },
  {
    key: 'audio-library',
    href: '/dashboard/audio-library',
    i18nKey: 'audioLibrary',
    icon: 'music',
    group: 'reality',
    requiredRoles: ['Rendszeradminisztrator', 'Reality szerkeszto'],
  },

  // ── Content (Tartalomkeszito) ────────────────────────────────────
  {
    key: 'pages',
    href: '/dashboard/cms/pages',
    i18nKey: 'pages',
    icon: 'file',
    group: 'content',
    requiredRoles: ['Rendszeradminisztrator', 'Tartalomkeszito'],
  },
  {
    key: 'news',
    href: '/dashboard/news',
    i18nKey: 'news',
    icon: 'news',
    group: 'content',
    requiredRoles: ['Rendszeradminisztrator', 'Tartalomkeszito', 'Marketing'],
  },
  {
    key: 'videos',
    href: '/dashboard/videos',
    i18nKey: 'videos',
    icon: 'video',
    group: 'content',
    requiredRoles: ['Rendszeradminisztrator', 'Tartalomkeszito'],
  },
  {
    key: 'photos',
    href: '/dashboard/photos',
    i18nKey: 'photos',
    icon: 'image',
    group: 'content',
    requiredRoles: ['Rendszeradminisztrator', 'Tartalomkeszito'],
  },
  {
    key: 'fighter-profiles',
    href: '/dashboard/fighter-profiles',
    i18nKey: 'fighterProfiles',
    icon: 'user',
    group: 'content',
    requiredRoles: ['Rendszeradminisztrator', 'Tartalomkeszito'],
  },

  // ── Marketing ────────────────────────────────────────────────────
  {
    key: 'sponsors',
    href: '/dashboard/sponsors',
    i18nKey: 'sponsors',
    icon: 'handshake',
    group: 'marketing',
    requiredRoles: ['Rendszeradminisztrator', 'Marketing'],
  },
  {
    key: 'social-links',
    href: '/dashboard/social-links',
    i18nKey: 'socialLinks',
    icon: 'link',
    group: 'marketing',
    requiredRoles: ['Rendszeradminisztrator', 'Marketing'],
  },

  // ── Moderation ───────────────────────────────────────────────────
  {
    key: 'chat-moderation',
    href: '/dashboard/chat-moderation',
    i18nKey: 'chatModeration',
    icon: 'shield',
    group: 'moderation',
    requiredRoles: ['Rendszeradminisztrator', 'Producer', 'Moderator'],
  },

  // ── System (Rendszeradminisztrator only) ─────────────────────────
  {
    key: 'users',
    href: '/dashboard/users',
    i18nKey: 'users',
    icon: 'users',
    group: 'system',
    requiredRoles: ['Rendszeradminisztrator'],
  },
  {
    key: 'roles',
    href: '/dashboard/roles',
    i18nKey: 'roles',
    icon: 'key',
    group: 'system',
    requiredRoles: ['Rendszeradminisztrator'],
  },
  {
    key: 'audit-logs',
    href: '/dashboard/audit-logs',
    i18nKey: 'auditLogs',
    icon: 'scroll',
    group: 'system',
    requiredRoles: ['Rendszeradminisztrator'],
  },
  {
    key: 'system-settings',
    href: '/dashboard/system-settings',
    i18nKey: 'systemSettings',
    icon: 'settings',
    group: 'system',
    requiredRoles: ['Rendszeradminisztrator'],
  },
];

/** Sidebar sections a given role is allowed to see. */
export function sectionsForRole(role: Role): AdminSectionDef[] {
  return ADMIN_SECTIONS.filter((s) => s.requiredRoles.includes(role));
}

/** True when the role can reach the given href. Used by the server guard. */
export function canRoleReach(role: Role, href: string): boolean {
  return ADMIN_SECTIONS.some((s) => s.href === href && s.requiredRoles.includes(role));
}

/** Group the sections for sidebar rendering. Preserves section order within group. */
export function groupSections(
  sections: ReadonlyArray<AdminSectionDef>
): Array<{ group: AdminSectionDef['group']; sections: AdminSectionDef[] }> {
  const order: AdminSectionDef['group'][] = [
    'workspace',
    'reality',
    'content',
    'marketing',
    'moderation',
    'system',
  ];
  const groups: Record<AdminSectionDef['group'], AdminSectionDef[]> = {
    workspace: [],
    reality: [],
    content: [],
    marketing: [],
    moderation: [],
    system: [],
  };
  for (const s of sections) groups[s.group].push(s);
  return order
    .filter((g) => groups[g].length > 0)
    .map((g) => ({ group: g, sections: groups[g] }));
}

/** Stable role id -> i18n key for the role badge in the topbar. */
export const ROLE_I18N_KEYS: Record<Role, string> = {
  guest: 'roles.guest',
  user: 'roles.user',
  Rendszeradminisztrator: 'roles.Rendszeradminisztrator',
  Producer: 'roles.Producer',
  'Reality szerkeszto': 'roles.RealitySzerkeszto',
  Tartalomkeszito: 'roles.Tartalomkeszito',
  Marketing: 'roles.Marketing',
  Moderator: 'roles.Moderator',
};