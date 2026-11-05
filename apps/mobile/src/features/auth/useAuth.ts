/**
 * Data hooks for the welcome and account flows. Screens never touch fixtures or the store
 * directly (apps/mobile/AGENTS.md rule 1): everything goes through AuthRepository.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRepositories } from "@/data/RepositoryProvider";
import type { AuthRepository } from "@/data/repositories/types";

export const authKeys = {
  all: ["auth"] as const,
  status: ["auth", "status"] as const,
  unsent: ["auth", "unsent"] as const,
  resetLink: (token: string) => ["auth", "reset-link", token] as const,
};

export function useAuthStatus() {
  const { auth } = useRepositories();
  return useQuery({ queryKey: authKeys.status, queryFn: () => auth.status() });
}

export function useUnsentCount(enabled: boolean) {
  const { auth } = useRepositories();
  return useQuery({ queryKey: authKeys.unsent, queryFn: () => auth.unsentCount(), enabled });
}

export function useResetLink(token: string) {
  const { auth } = useRepositories();
  return useQuery({
    queryKey: authKeys.resetLink(token),
    queryFn: () => auth.checkResetLink(token),
  });
}

/** A mutation on AuthRepository that refreshes the auth state afterwards. */
function useAuthMutation<TInput, TResult>(
  run: (auth: AuthRepository, input: TInput) => Promise<TResult>,
) {
  const { auth } = useRepositories();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: TInput) => run(auth, input),
    onSettled: () => client.invalidateQueries({ queryKey: authKeys.all }),
  });
}

/** The same, for actions that take no input. */
function useAuthAction<TResult>(run: (auth: AuthRepository) => Promise<TResult>) {
  const { auth } = useRepositories();
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => run(auth),
    onSettled: () => client.invalidateQueries({ queryKey: authKeys.all }),
  });
}

export const useSignIn = () =>
  useAuthMutation((auth, input: Parameters<AuthRepository["signIn"]>[0]) => auth.signIn(input));

export const useCreateAccount = () =>
  useAuthMutation((auth, input: Parameters<AuthRepository["createAccount"]>[0]) =>
    auth.createAccount(input),
  );

export const useResendVerification = () => useAuthAction((auth) => auth.resendVerification());

export const useOpenVerificationLink = () =>
  useAuthMutation((auth, token: string | undefined) => auth.openVerificationLink(token));

export const useFinishVerification = () => useAuthAction((auth) => auth.finishVerification());

export const useCancelVerification = () => useAuthAction((auth) => auth.cancelVerification());

export const useRequestPasswordReset = () =>
  useAuthMutation((auth, email: string) => auth.requestPasswordReset(email));

export const useResetPassword = () =>
  useAuthMutation((auth, input: { token: string; password: string }) =>
    auth.resetPassword(input.token, input.password),
  );

export const useSignOut = () => useAuthAction((auth) => auth.signOut());

/** Which ways in this server offers (Google and Apple need the server set up for them). */
export function useSignInMethods() {
  const { auth } = useRepositories();
  return useQuery({
    queryKey: ["auth", "methods"],
    queryFn: () => auth.signInMethods(),
    staleTime: 5 * 60_000,
  });
}

export const useContinueWith = () =>
  useAuthMutation((auth, provider: Parameters<AuthRepository["continueWith"]>[0]) =>
    auth.continueWith(provider),
  );

export const useCompleteRegistration = () =>
  useAuthMutation((auth, input: Parameters<AuthRepository["completeRegistration"]>[0]) =>
    auth.completeRegistration(input),
  );

export const useConfirmEmailChange = () =>
  useAuthMutation((auth, token: string) => auth.confirmEmailChange(token));
