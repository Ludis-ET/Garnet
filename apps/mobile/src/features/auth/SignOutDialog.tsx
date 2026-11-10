/**
 * AUTH-08 · Sign out confirmation, as a glass action sheet (P-48). Reassures that nothing typed
 * is lost: drafts and unsent items stay on this device (AGENTS.md §5 "never silently lose typed
 * text").
 */
import { useRouter } from "expo-router";
import { SideCharacter } from "@/components/character/SideCharacter";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { useSignOut, useUnsentCount } from "./useAuth";

export function signOutBody(unsent: number): string {
  if (unsent <= 0) return "Drafts saved on this device stay here until you sign back in.";
  const things = unsent === 1 ? "1 moment" : `${unsent} moments`;
  return `You have ${things} waiting to send. They'll stay on this device.`;
}

export function SignOutDialog({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const unsent = useUnsentCount(visible);
  const signOut = useSignOut();
  return (
    <ActionSheet
      visible={visible}
      icon="sign-out"
      art={<SideCharacter pose="wave" size={124} />}
      destructive
      title="Sign out?"
      body={signOutBody(unsent.data ?? 0)}
      confirmLabel="Sign out"
      confirming={signOut.isPending}
      onCancel={onClose}
      onConfirm={() => {
        signOut.mutate(undefined, {
          onSettled: () => {
            onClose();
            router.replace("/welcome");
          },
        });
      }}
    />
  );
}
