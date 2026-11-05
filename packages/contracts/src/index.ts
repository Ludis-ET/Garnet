import type { ZodType } from "zod";

export { healthSchema, type Health } from "./health";
export { meSchema, type Me } from "./me";
export {
  acceptInviteResultSchema,
  checkInviteResultSchema,
  createInviteResultSchema,
  INVITE_ALPHABET,
  INVITE_CODE_LENGTH,
  inviteCodeBodySchema,
  inviteCodeSchema,
  normaliseInviteCode,
  pairingStatusSchema,
  type PairingStatusDto,
} from "./pairing";
export { isGuessablePassword, passwordContext } from "./password";
export {
  AGE_CHECK_ZONE,
  ageOn,
  completeRegistrationResultSchema,
  isOldEnough,
  isoDateSchema,
  isRegistrationComplete,
  isValidIsoDate,
  MIN_AGE,
  registrationSchema,
  registrationStateSchema,
  signInMethodsSchema,
  TERMS_VERSION,
  type RegistrationDto,
  type RegistrationStateDto,
  type SignInMethodsDto,
  type SocialProvider,
} from "./registration";
export {
  issueSchema,
  PROBLEM_CODES,
  PROBLEMS,
  problemSchema,
  problemType,
  type Problem,
  type ProblemCode,
} from "./problem";
export {
  accountDetailsSchema,
  accountMethodsSchema,
  defaultSettingsDoc,
  deviceSchema,
  devicesSchema,
  disconnectResultSchema,
  mergeSettings,
  readSettings,
  SETTINGS_SCHEMA_VERSION,
  settingsPatchSchema,
  settingsSchema,
  settingsViewSchema,
  updateAccountSchema,
  type AccountMethodsDto,
  type DeviceDto,
  type SettingsDto,
  type SettingsPatchDto,
  type SettingsViewDto,
} from "./settings";
export {
  avatarSchema,
  chooseSideResultSchema,
  chooseSideSchema,
  completeSetupResultSchema,
  homeCitySchema,
  notificationPrefsSchema,
  OPTIONAL_SETUP_STEPS,
  partnerProfileSchema,
  profileSchema,
  SETUP_STEPS,
  setupStateSchema,
  sideSchema,
  togetherSinceSchema,
  updateSetupSchema,
  type ProfileDto,
  type SetupStateDto,
  type UpdateSetupDto,
} from "./setup";

/** A contract schema for values of type T (so callers need no direct zod import). */
export type Schema<T> = ZodType<T>;
