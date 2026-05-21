const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid"
]);

export function normalizeUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(withScheme);
  url.hash = "";
  for (const param of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.has(param.toLowerCase())) url.searchParams.delete(param);
  }
  if (url.pathname !== "/" && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only HTTP and HTTPS URLs are supported.");
  }
  return url.toString();
}

export function isSameRegistrableHost(candidateUrl: string, rootUrl: string): boolean {
  const candidate = new URL(candidateUrl);
  const root = new URL(rootUrl);
  return candidate.hostname === root.hostname || candidate.hostname.endsWith(`.${root.hostname}`);
}

export function isLikelyUsefulPage(url: string): boolean {
  const lower = url.toLowerCase();
  if (/\.(pdf|jpg|jpeg|png|gif|webp|svg|zip|mp4|mov|css|js)$/i.test(lower)) return false;
  if (lower.includes("/wp-json/") || lower.includes("/feed")) return false;
  return true;
}

export function scoreLink(url: string, text: string): number {
  const haystack = `${url} ${text}`.toLowerCase();
  const priorities = [
    "product",
    "service",
    "menu",
    "price",
    "pricing",
    "plan",
    "faq",
    "reserve",
    "reservation",
    "booking",
    "store",
    "shop",
    "campaign",
    "contact",
    "about",
    "company",
    "case",
    "voice",
    "お客様",
    "料金",
    "予約",
    "店舗",
    "商品",
    "サービス",
    "キャンペーン",
    "問い合わせ",
    "よくある"
  ];
  return priorities.reduce((score, keyword, index) => {
    return haystack.includes(keyword) ? score + priorities.length - index : score;
  }, 0);
}
