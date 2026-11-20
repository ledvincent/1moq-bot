// Hosts that are not a business's own website: social networks, link-in-bio pages and Google.
// A host that is one of these, or under one, gives no website domain. The kickoff left the list to
// MOQ-5 (deferred): it starts here and MOQ-5 extends it.
export const notWebsiteDomains = [
  'instagram.com',
  'facebook.com',
  'fb.com',
  'tiktok.com',
  'x.com',
  'twitter.com',
  'linkedin.com',
  'youtube.com',
  'linktr.ee',
  'beacons.ai',
  'lnk.bio',
  'bio.link',
  'carrd.co',
  'google.com',
  'goo.gl',
] as const;

/** Whether a lower-cased host is, or is under, a domain that is not a business's own website. */
export function isNotWebsiteHost(host: string): boolean {
  return notWebsiteDomains.some((domain) => host === domain || host.endsWith(`.${domain}`));
}
