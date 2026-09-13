"use client";

/**
 * A link out to a retailer, pointed at the storefront for the reader's
 * language — amazon.in for the Indian languages, amazon.com otherwise.
 *
 * A client component so it can read the active locale, which is chosen in the
 * browser and is therefore unknown on the server. That matters because the
 * patient's own report page is server-rendered: it can render this, and this
 * can know the language, where the page itself cannot.
 *
 * `localizeStoreUrl` leaves non-Amazon URLs alone, so this is safe to use for
 * every product link regardless of where it points.
 */

import { localizeStoreUrl } from "@/lib/productCatalog";
import { useI18n } from "@/lib/i18n/I18nProvider";

export function StoreLink({
  url,
  className,
  children,
}: {
  url: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { locale } = useI18n();
  return (
    <a
      href={localizeStoreUrl(url, locale)}
      target="_blank"
      rel="noreferrer"
      className={className}
    >
      {children}
    </a>
  );
}
