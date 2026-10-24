// Phone normalisation for anything that will be messaged on WhatsApp.
//
// This exists because a malformed number fails silently and expensively: the
// profile looks fine in the admin, every send is refused or goes nowhere, and
// the person is invisible in the message log. One pilot teacher was lost to a
// mistyped number that sat in the database for three days looking correct.
//
// Output is E.164 digits with no "+", which is the form Meta's API expects.

export type Market = "il" | "in";

// Digits expected AFTER the dialling code, for the countries we actually serve.
// A mismatch here is the cheap, high-signal check that catches a typo.
const NATIONAL_LEN: Record<string, number> = {
  "972": 9,  // Israel
  "91": 10,  // India
  "44": 10,  // United Kingdom
  "353": 9,  // Ireland
  "1": 10,   // United States / Canada
  "92": 10,  // Pakistan
  "61": 9,   // Australia
};

const COUNTRY_BY_DIAL: Record<string, string> = {
  "972": "Israel",
  "91": "India",
  "44": "United Kingdom",
  "353": "Ireland",
  "1": "United States/Canada",
  "92": "Pakistan",
  "61": "Australia",
};

// Longest first, so 972 wins over 97 and 91 is never mistaken for 9.
const DIAL_CODES = Object.keys(NATIONAL_LEN).sort((a, b) => b.length - a.length);

export const DIAL_HINT: Record<Market, string> = { il: "+972…", in: "+91…" };

export type PhoneResult =
  | { ok: true; e164: string; dial: string | null; country: string | null }
  | { ok: false; reason: string };

export function countryFromDial(dial: string | null): string | null {
  return dial ? COUNTRY_BY_DIAL[dial] ?? null : null;
}

// Accepts what a parent actually types — spaces, dashes, brackets, a leading
// "+" or "00", or their own local format — and returns E.164 digits.
export function normalisePhone(raw: string, market?: Market): PhoneResult {
  let d = (raw ?? "").replace(/[^\d+]/g, "").replace(/\+/g, "");
  d = d.replace(/^00/, "");
  if (!d) return { ok: false, reason: "No number given." };

  // Local formats, resolved using the market the form was opened for.
  if (market === "il" && /^0\d{8,9}$/.test(d)) d = "972" + d.slice(1);
  else if (market === "il" && /^5\d{8}$/.test(d)) d = "972" + d;
  else if (market === "in" && /^0?[6-9]\d{9}$/.test(d)) d = "91" + d.replace(/^0/, "");

  if (d.length < 8) return { ok: false, reason: "That number looks too short. Include the country code." };
  if (d.length > 15) return { ok: false, reason: "That number looks too long." };

  const dial = DIAL_CODES.find((c) => d.startsWith(c)) ?? null;
  if (dial) {
    const national = d.slice(dial.length).length;
    const expected = NATIONAL_LEN[dial];
    if (national !== expected) {
      return {
        ok: false,
        reason: `A +${dial} number needs ${expected} digits after the country code — this has ${national}.`,
      };
    }
  }
  // Unknown dialling code: stay permissive rather than block a real family.
  return { ok: true, e164: d, dial, country: countryFromDial(dial) };
}

// Market inferred from a normalised number, for records created without one.
export function marketFromE164(e164: string): Market | null {
  if (e164.startsWith("972")) return "il";
  if (e164.startsWith("91")) return "in";
  return null;
}
