/**
 * Typing without the layout moving (production-fix-plan K1, K7): the countdown belongs to fields
 * with room for writing, and the clear button's place is kept while a field is empty.
 */
import { fireEvent, render, screen } from "@testing-library/react-native";
import { useState } from "react";
import { TextField } from "@/components/ui/TextField";
import { ThemeProvider } from "@/theme/ThemeProvider";

function Field({ max, start = "" }: { max: number; start?: string }) {
  const [value, setValue] = useState(start);
  return (
    <ThemeProvider>
      <TextField label="Field" value={value} onChangeText={setValue} maxLength={max} />
    </ThemeProvider>
  );
}

describe("TextField while typing", () => {
  it("shows no countdown on a short field such as a day or month (K1)", async () => {
    await render(<Field max={2} start="1" />);
    await fireEvent(screen.getByLabelText("Field"), "focus");
    expect(screen.queryByText("1")).toBeNull();
  });

  it("counts down near the limit of a field with room for writing", async () => {
    await render(<Field max={20} start={"a".repeat(17)} />);
    await fireEvent(screen.getByLabelText("Field"), "focus");
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("keeps the clear button's place while empty, and offers it once there is text (K7)", async () => {
    await render(<Field max={40} />);
    const input = screen.getByLabelText("Field");
    expect(screen.queryByLabelText("Clear Field")).toBeNull();
    const widthBefore = input.parent?.parent?.children.length ?? 0;
    await fireEvent.changeText(input, "R");
    expect(screen.getByLabelText("Clear Field")).toBeTruthy();
    // Same number of slots in the row: nothing new pushed the text aside.
    expect(input.parent?.parent?.children.length ?? 0).toBe(widthBefore);
  });
});
