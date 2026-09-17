/** Validate a version segment before putting it in an authenticated URL. */
export function apiPrefix(version: string = "v1"): string {
  if (!/^v[1-9]\d*$/.test(version) || version.trim() !== version)
    throw new TypeError('apiVersion must be a version such as "v1" or "v2"');
  return `/api/${version}`;
}
