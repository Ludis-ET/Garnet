import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/**
 * Whether the on-screen keyboard is up (P-75). Android draws edge to edge, so its window no
 * longer shrinks for the keyboard: screens lift their content themselves and drop the bottom
 * safe-area gap while the keyboard covers it, like a messaging app.
 */
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    // iOS announces the keyboard before it moves; Android only once it has.
    const show = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hide = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const a = Keyboard.addListener(show, () => {
      setVisible(true);
    });
    const b = Keyboard.addListener(hide, () => {
      setVisible(false);
    });
    return () => {
      a.remove();
      b.remove();
    };
  }, []);
  return visible;
}
