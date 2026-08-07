/**
 * Where SoleIQ is, off this site.
 *
 * One place, so a moved account is one edit rather than a hunt through the
 * footer and the team list.
 */

export interface SocialLink {
  /** Shown to screen readers and as the visible label where there is room. */
  label: string
  href: string
}

export const SOCIAL: SocialLink[] = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/soleiq_health/',
  },
  {
    // LinkedIn's numeric permalink for the company page. It is the form that
    // survives a rename, and it resolves to whatever the page's public address
    // is. Swap in the vanity URL (linkedin.com/company/<name>) if you'd rather
    // show that — both work.
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/company/136176273/',
  },
]

/** Personal profiles, shown on the team card they belong to. */
export const PROFILE_LINKS: Record<string, string> = {
  'Eshaan Naik': 'https://www.linkedin.com/in/eshaan-naik-8b329a320/',
}
