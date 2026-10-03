import { COUNTRY_CODES } from "@satsharks/types";

export { LOCAL_COUNTRY_CODE } from "@satsharks/types";

// Country names come from the runtime's own locale data, so the list needs no translation table and
// stays current. Browsers and Node ship slightly different data, so call this in the browser only.
export function countryOptions(): { code: string; name: string }[] {
  const names = new Intl.DisplayNames(["en"], { type: "region" });
  return COUNTRY_CODES.map((code) => ({ code, name: names.of(code) ?? code })).sort((a, b) => a.name.localeCompare(b.name));
}
