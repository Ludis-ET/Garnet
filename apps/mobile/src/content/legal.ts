import { MIN_AGE, TERMS_VERSION } from "@garnet/contracts";

/**
 * The Terms of use and the Privacy notice the app shows (P-79). They describe what Garnet
 * actually does today, but they are drafts: they need review before any public release, and
 * the open points are marked (U-36; hosting and region U-07; account deletion U-20, U-23).
 * Changing either means a new TERMS_VERSION, and everyone accepts again.
 */
export interface LegalSection {
  heading: string;
  paragraphs: readonly string[];
}

export interface LegalDocument {
  title: string;
  version: string;
  status: string;
  sections: readonly LegalSection[];
}

const STATUS = "Draft for review before release";

export const TERMS: LegalDocument = {
  title: "Terms of use",
  version: TERMS_VERSION,
  status: STATUS,
  sections: [
    {
      heading: "Garnet is for the two of you",
      paragraphs: [
        "Garnet is a private space for exactly two partners. Each of you has your own account, and the two accounts are paired with an invitation one of you sends the other.",
        `You need to be ${String(MIN_AGE)} or older to use Garnet. We ask for your birthday when you register to check this.`,
      ],
    },
    {
      heading: "Your account",
      paragraphs: [
        "You can sign in with your email and a password, with Google, or with Apple. These are ways into the same account: one account per person.",
        "Keep your sign-in to yourself. If you think someone else has used it, change your password; that signs out every other device.",
      ],
    },
    {
      heading: "What you share",
      paragraphs: [
        "What you write and add stays yours. Drafts stay private until you choose to share them, and only your partner sees what you share.",
        "Please use Garnet kindly and lawfully: nothing that harms your partner or anyone else.",
      ],
    },
    {
      heading: "While Garnet is young",
      paragraphs: [
        "Garnet is still being built. Things may change, and now and then something may not work as it should.",
        "If these terms change, we'll show you the new version and ask you to agree before you carry on.",
        "Still to be settled before release: who provides Garnet and under which country's law, and how to reach us.",
      ],
    },
  ],
};

export const PRIVACY: LegalDocument = {
  title: "Privacy notice",
  version: TERMS_VERSION,
  status: STATUS,
  sections: [
    {
      heading: "What we keep",
      paragraphs: [
        "Your account: your name, your email, your birthday, and either a scrambled form of your password (never the password itself) or the link to your Google or Apple account.",
        "From Google or Apple we receive only your name, your email and whether the email is confirmed. With Apple you can hide your real email.",
        "Your setup and what you choose to keep in Garnet: your side, your time zone and home town, your picture choice, your notification choices, and what you write and share.",
      ],
    },
    {
      heading: "Who sees what",
      paragraphs: [
        "Your partner sees your name, your side, your time zone and home town, your birthday, whether you've finished setting up, and whatever you share with them.",
        "Nobody else sees any of it. Your private drafts are never shown to your partner, not even that they exist.",
      ],
    },
    {
      heading: "What we never do",
      paragraphs: [
        "No adverts, no selling or renting your information, no tracking or analytics on what you write, and no scores or rankings about your relationship.",
        "Notifications on your lock screen never show what was written.",
      ],
    },
    {
      heading: "Why we use it",
      paragraphs: [
        "To run Garnet for the two of you: to sign you in, keep your account safe, pair you, and show each of you what the other shares.",
        `Your birthday is used to check you're ${String(MIN_AGE)} or older and so your partner can celebrate it.`,
      ],
    },
    {
      heading: "Your choices and rights",
      paragraphs: [
        "You can see and correct your details, and ask for a copy of them or for them to be deleted. Where the law gives you more rights, you have those too.",
        "Still to be settled before release: where your data is stored and for how long, how account deletion works for shared memories, and how to contact us.",
      ],
    },
  ],
};
