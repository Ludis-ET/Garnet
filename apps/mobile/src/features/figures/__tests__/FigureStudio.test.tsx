import { fireEvent, render, screen } from "@testing-library/react-native";
import type * as ReactNative from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { moods } from "../moods";
import { FigureStudio } from "../FigureStudio";

// WebGL is not available in Jest; the stage is covered by the 3D builder tests and renders.
jest.mock("../FigureStage", () => {
  const { View } = jest.requireActual<typeof ReactNative>("react-native");
  return {
    FigureStage: (props: { accessibilityLabel: string }) => (
      <View accessible accessibilityRole="image" accessibilityLabel={props.accessibilityLabel} />
    ),
  };
});

const metrics = {
  frame: { x: 0, y: 0, width: 393, height: 852 },
  insets: { top: 59, left: 0, right: 0, bottom: 34 },
};

async function renderStudio(params: Record<string, string> = {}) {
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider>
        <FigureStudio params={params} />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe("FigureStudio (temporary home, P-41)", () => {
  it("renders the brand, the described stage and the speech bubble", async () => {
    await renderStudio();
    expect(screen.getByRole("header", { name: "Garnet" })).toBeTruthy();
    expect(screen.getByRole("image", { name: /Sapphire, Garnet and Ruby/ })).toBeTruthy();
    expect(
      screen.getByLabelText("Garnet says: Welcome back. Both of your days are here."),
    ).toBeTruthy();
  });

  it("selects a mood with radio semantics and speaks its line", async () => {
    await renderStudio();
    const sleepy = screen.getByRole("radio", { name: "Sleepy" });
    expect(sleepy.props.accessibilityState).toMatchObject({ checked: false });
    await fireEvent.press(sleepy);
    expect(screen.getByRole("radio", { name: "Sleepy" }).props.accessibilityState).toMatchObject({
      checked: true,
    });
    expect(screen.getByLabelText(`Garnet says: ${moods.sleepy.line}`)).toBeTruthy();
    expect(screen.getByRole("image", { name: /sleepy/ })).toBeTruthy();
  });

  it("offers Fuse for Ruby & Sapphire and Unfuse after fusing", async () => {
    await renderStudio({ scene: "us" });
    await fireEvent.press(
      screen.getByRole("button", { name: "Fuse Ruby and Sapphire into Garnet" }),
    );
    expect(
      screen.getByRole("button", { name: "Unfuse Garnet into Ruby and Sapphire" }),
    ).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Garnet" }).props.accessibilityState).toMatchObject({
      checked: true,
    });
  });

  it("hides the bubble when switched off", async () => {
    await renderStudio();
    await fireEvent(screen.getByLabelText("Speech bubble"), "valueChange", false);
    expect(screen.queryByLabelText(/says:/)).toBeNull();
  });
});
