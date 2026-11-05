/**
 * Passwords that are easy to guess at any length (P-78): one short piece repeated
 * ("passwordpassword"), a run along the alphabet, the digits or a keyboard row
 * ("123456789012345", "qwertyuiopasdfg"), or little more than a common word, the service's
 * name or the person's own name or email padded with runs ("password12345678",
 * "selam.tesfaye1234"). NIST SP 800-63B-4 asks for exactly this kind of blocklist instead of
 * composition rules, so there are no "one capital, one symbol" rules anywhere. The API refuses
 * these and the app says so before sending; both use this one function.
 */

/** Cyclic runs: each step moves one place along one of these, in either direction. */
const RUNS = ["abcdefghijklmnopqrstuvwxyz", "0123456789", "qwertyuiopasdfghjklzxcvbnm"];

/**
 * Words a guesser always tries first: the service's own name and the base words of the most
 * common passwords in published breach lists. Kept short on purpose: length does the rest.
 */
const COMMON_WORDS = [
  "garnet",
  "password",
  "passw0rd",
  "iloveyou",
  "letmein",
  "welcome",
  "qwerty",
  "admin",
  "login",
  "sunshine",
  "princess",
  "football",
  "monkey",
  "dragon",
  "master",
];

/** A run or repeat this long inside a password adds nothing a guesser wouldn't try. */
const MIN_PATTERN = 4;

/** What is left once common words, context words and patterns are taken out. */
const MIN_REMAINDER = 6;

function chars(text: string): string[] {
  return Array.from(text.normalize("NFKC").toLowerCase());
}

const isWordChar = (ch: string) => /[\p{L}\p{N}]/u.test(ch);

/** How `b` follows `a`: the same character, or one step along a run (named with direction). */
function stepOf(a: string, b: string): string | null {
  if (a === b) return "same";
  for (const run of RUNS) {
    const i = run.indexOf(a);
    const j = run.indexOf(b);
    if (i === -1 || j === -1) continue;
    const d = (j - i + run.length) % run.length;
    if (d === 1) return `${run}+`;
    if (d === run.length - 1) return `${run}-`;
  }
  return null;
}

function isRepeat(c: readonly string[]): boolean {
  for (let size = 1; size <= c.length / 2; size++) {
    if (c.every((ch, i) => ch === c[i % size])) return true;
  }
  return false;
}

function isRun(c: readonly string[]): boolean {
  if (c.length < 2) return false;
  const first = stepOf(c[0] ?? "", c[1] ?? "");
  return (
    first !== null &&
    first !== "same" &&
    c.every((ch, i) => i === 0 || stepOf(c[i - 1] ?? "", ch) === first)
  );
}

function isGuessableShape(c: readonly string[]): boolean {
  return c.length < 2 || isRepeat(c) || isRun(c);
}

/** Drops every run or repeat of MIN_PATTERN characters or more ("1234", "aaaa", "asdf"). */
function withoutPatterns(c: readonly string[]): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < c.length) {
    const step = i + 1 < c.length ? stepOf(c[i] ?? "", c[i + 1] ?? "") : null;
    let end = i;
    if (step !== null)
      while (end + 1 < c.length && stepOf(c[end] ?? "", c[end + 1] ?? "") === step) end++;
    if (end - i + 1 >= MIN_PATTERN) {
      i = end + 1;
    } else {
      out.push(c[i] ?? "");
      i++;
    }
  }
  return out;
}

/**
 * True when `password` is easy to guess. `context` holds words a guesser would try first for
 * this person: their name and the part of their email before the @ (words under 3 characters
 * are ignored). Length rules are separate (see the password policy).
 */
export function isGuessablePassword(password: string, context: readonly string[] = []): boolean {
  const c = chars(password);
  if (c.length === 0) return false;
  if (isGuessableShape(c)) return true;
  const words = [...COMMON_WORDS, ...context]
    .flatMap((w) =>
      w
        .normalize("NFKC")
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u),
    )
    .filter((w) => Array.from(w).length >= 3);
  let rest = c.join("");
  for (const word of words) rest = rest.split(word).join("");
  const left = withoutPatterns(chars(rest)).filter(isWordChar);
  if (left.length === c.filter(isWordChar).length) return false;
  return left.length < MIN_REMAINDER || isGuessableShape(left);
}

/** The context words for an account: its name and the part of its email before the @. */
export function passwordContext(name: string, email: string): string[] {
  return [name, email.split("@")[0] ?? ""];
}
