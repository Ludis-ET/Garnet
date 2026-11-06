import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Button, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ToastProvider } from "@/components/ui/Toast";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { MediaPlayerProvider, useMediaPlayer } from "../MediaPlayerContext";

const metrics = {
  frame: { x: 0, y: 0, width: 393, height: 852 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function TestPlayerConsumer() {
  const {
    voice,
    activeMedia,
    playVoice,
    pauseVoice,
    resumeVoice,
    setVoiceSpeed,
    seekVoice,
    stopVoice,
    openMedia,
    closeMedia,
    toggleVideo,
    seekVideo,
    videoPlaying,
    videoElapsed,
  } = useMediaPlayer();

  return (
    <View>
      <Text testID="voice-id">{voice.activeId ?? "none"}</Text>
      <Text testID="voice-playing">{String(voice.isPlaying)}</Text>
      <Text testID="voice-speed">{String(voice.speed)}</Text>
      <Text testID="voice-elapsed">{String(voice.elapsed)}</Text>
      <Text testID="active-media">{activeMedia?.art ?? "none"}</Text>
      <Text testID="video-playing">{String(videoPlaying)}</Text>
      <Text testID="video-elapsed">{String(videoElapsed)}</Text>

      <Button
        title="Play Voice"
        onPress={() => {
          playVoice("voice-1", 20);
        }}
      />
      <Button title="Pause Voice" onPress={pauseVoice} />
      <Button title="Resume Voice" onPress={resumeVoice} />
      <Button
        title="Speed 1.5"
        onPress={() => {
          setVoiceSpeed(1.5);
        }}
      />
      <Button
        title="Seek Voice 10"
        onPress={() => {
          seekVoice(10);
        }}
      />
      <Button title="Stop Voice" onPress={stopVoice} />

      <Button
        title="Open Media"
        onPress={() => {
          openMedia({
            type: "video",
            art: "sunrise",
            seconds: 15,
            caption: "Sunrise",
            authorName: "Noah",
          });
        }}
      />
      <Button title="Toggle Video" onPress={toggleVideo} />
      <Button
        title="Seek Video 8"
        onPress={() => {
          seekVideo(8);
        }}
      />
      <Button title="Close Media" onPress={closeMedia} />
    </View>
  );
}

describe("MediaPlayer service", () => {
  async function renderPlayer() {
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <ThemeProvider>
          <ToastProvider>
            <MediaPlayerProvider>
              <TestPlayerConsumer />
            </MediaPlayerProvider>
          </ToastProvider>
        </ThemeProvider>
      </SafeAreaProvider>,
    );
  }

  it("provides initial voice and media state", async () => {
    await renderPlayer();
    expect(screen.getByTestId("voice-id").props.children).toBe("none");
    expect(screen.getByTestId("voice-playing").props.children).toBe("false");
    expect(screen.getByTestId("voice-speed").props.children).toBe("1");
    expect(screen.getByTestId("active-media").props.children).toBe("none");
  });

  it("handles voice playback controls and speed adjustments", async () => {
    await renderPlayer();

    await fireEvent.press(screen.getByText("Play Voice"));
    await waitFor(() => {
      expect(screen.getByTestId("voice-id").props.children).toBe("voice-1");
    });
    expect(screen.getByTestId("voice-playing").props.children).toBe("true");

    await fireEvent.press(screen.getByText("Pause Voice"));
    await waitFor(() => {
      expect(screen.getByTestId("voice-playing").props.children).toBe("false");
    });

    await fireEvent.press(screen.getByText("Resume Voice"));
    await waitFor(() => {
      expect(screen.getByTestId("voice-playing").props.children).toBe("true");
    });

    await fireEvent.press(screen.getByText("Speed 1.5"));
    await waitFor(() => {
      expect(screen.getByTestId("voice-speed").props.children).toBe("1.5");
    });

    await fireEvent.press(screen.getByText("Seek Voice 10"));
    await waitFor(() => {
      const elapsed = Number(screen.getByTestId("voice-elapsed").props.children);
      expect(elapsed).toBeGreaterThanOrEqual(10);
    });

    await fireEvent.press(screen.getByText("Stop Voice"));
    await waitFor(() => {
      expect(screen.getByTestId("voice-id").props.children).toBe("none");
    });
    expect(screen.getByTestId("voice-playing").props.children).toBe("false");
  });

  it("opens and closes media lightbox and controls video playback", async () => {
    await renderPlayer();

    await fireEvent.press(screen.getByText("Open Media"));
    await waitFor(() => {
      expect(screen.getByTestId("active-media").props.children).toBe("sunrise");
    });
    expect(screen.getByTestId("video-playing").props.children).toBe("true");

    await fireEvent.press(screen.getByText("Toggle Video"));
    await waitFor(() => {
      expect(screen.getByTestId("video-playing").props.children).toBe("false");
    });

    await fireEvent.press(screen.getByText("Seek Video 8"));
    await waitFor(() => {
      expect(screen.getByTestId("video-elapsed").props.children).toBe("8");
    });

    await fireEvent.press(screen.getByText("Close Media"));
    await waitFor(() => {
      expect(screen.getByTestId("active-media").props.children).toBe("none");
    });
    expect(screen.getByTestId("video-playing").props.children).toBe("false");
  });
});
