import { useState } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { SignOutDialog } from "./SignOutDialog";

/**
 * The round glass account button (top right during onboarding and on Home). For now it opens
 * the sign-out sheet (AUTH-08), so nobody is ever stuck in a flow; the profile menu comes with
 * HOME/SET designs.
 */
export function AccountButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton
        icon="user"
        label="Account: sign out"
        onPress={() => {
          setOpen(true);
        }}
      />
      <SignOutDialog
        visible={open}
        onClose={() => {
          setOpen(false);
        }}
      />
    </>
  );
}
