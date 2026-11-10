import { Haptics } from "@/components/ui/haptics";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  Vibration,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { Image, type ImageSource } from "expo-image";
import { createAudioPlayer, type AudioPlayer, type AudioSource } from "expo-audio";
import { AppText } from "@/components/ui/AppText";
import { GarnetMark } from "@/components/brand/GarnetMark";
import { SparkleBurst } from "@/components/brand/SparkleBurst";
import { CharacterSlot } from "@/components/character/CharacterSlot";
import { Glass } from "@/components/ui/Glass";
import { FRAME_ASPECT } from "@/features/figures/art/figure";
import { artworkFiles } from "@/features/figures/art/artworkFiles";
import { useTheme } from "@/theme/ThemeProvider";

let defaultFusionSource: ImageSource | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  defaultFusionSource = require("../../../../assets/characters/fusion.webp") as ImageSource;
} catch {
  // Ignored if not found
}

let defaultStartSource: ImageSource | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  defaultStartSource = require("../../../../assets/characters/fusion-start.png") as ImageSource;
} catch {
  // Ignored if not found
}

let defaultSettledSource: ImageSource | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  defaultSettledSource = require("../../../../assets/characters/fusion-settled.png") as ImageSource;
} catch {
  // Ignored if not found
}

let defaultSoundAsset: AudioSource | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  defaultSoundAsset = require("../../../../assets/characters/fusion.aac") as AudioSource;
} catch {
  // Ignored if not found
}

/** 0 gliding/fusing · 1 ruby facet · 2 sapphire facet · 3 violet core · 4 bloom (settled frame). */
export type ConnectPhase = 0 | 1 | 2 | 3 | 4;

/** When each phase starts for the glass pane fallback (ms). */
const TIMELINE: readonly [ConnectPhase, number][] = [
  [1, 620],
  [2, 740],
  [3, 860],
  [4, 1000],
];

/** The fusion video duration before settling on Garnet (ms). */
const FUSION_DURATION_MS = 2550;
/** The moment when the sparkle explosion bursts and Garnet appears (ms). */
const FUSION_BURST_PEAK_MS = 1800;

function FallbackPane({
  side,
  glide,
  paneWidth,
  travel,
}: {
  side: "ruby" | "sapphire";
  glide: SharedValue<number>;
  paneWidth: number;
  travel: number;
}) {
  const { radii } = useTheme();
  const dir = side === "ruby" ? -1 : 1;
  const style = useAnimatedStyle(() => {
    const g = glide.get();
    return {
      opacity: Math.min(1, 0.2 + g * 1.2),
      transform: [
        { translateX: (1 - g) * travel * dir },
        { rotate: `${dir * (4 + (1 - g) * 8)}deg` },
      ],
    };
  });
  const height = Math.round(paneWidth * 1.4);
  return (
    <Animated.View style={[side === "sapphire" && styles.front, style]}>
      <Glass
        radius={radii.xl + 8}
        veil="soft"
        tint={side}
        contentStyle={[styles.pane, { width: paneWidth, height }]}
      >
        <CharacterSlot
          character={side}
          pose="happy"
          size={height * 0.92}
          aspectRatio={FRAME_ASPECT}
        />
      </Glass>
    </Animated.View>
  );
}

/**
 * PAIR-05 celebration (P-49):
 * When accounts link, Ruby and Sapphire twirl together, fuse with a burst of magical sparkles,
 * and Garnet emerges smiling into her iconic visor pose, accompanied by the fusion sound.
 * Transparent, borderless, seamless — designed to feel like live character magic, not a video.
 */
export function ConnectedScene({
  onSettled,
  replayKey = 0,
}: {
  onSettled?: (() => void) | undefined;
  replayKey?: number | undefined;
}) {
  const { motion, reduceMotion } = useTheme();
  const { width, height } = useWindowDimensions();

  // Character artwork from owner-supplied assets (git-ignored assets/characters)
  const fusionSource = artworkFiles.fusion ?? defaultFusionSource;
  const settledSource =
    artworkFiles["fusion-settled"] ??
    defaultSettledSource ??
    artworkFiles["garnet-happy"] ??
    artworkFiles["garnet-celebrating"] ??
    artworkFiles.garnet;
  const hasFusionVideo = fusionSource !== undefined;

  // Fallback glass dimensions
  const paneWidth = Math.round(Math.min(150, width * 0.36));
  const travel = width * 0.6;

  // Video / Animation dimensions (9:16 portrait aspect ratio, transparent)
  const maxAnimHeight = Math.min(540, height * 0.58);
  const maxAnimWidth = Math.min(width * 0.92, 380);
  const animHeight = Math.round(Math.min(maxAnimHeight, maxAnimWidth * (16 / 9)));
  const animWidth = Math.round(animHeight * (9 / 16));

  const glide = useSharedValue(reduceMotion ? 1 : 0);
  const [phase, setPhase] = useState<ConnectPhase>(reduceMotion ? 4 : 0);
  const [animatingKey, setAnimatingKey] = useState<number | null>(
    Platform.OS !== "web" || reduceMotion ? replayKey : null,
  );
  const [prevReplayKey, setPrevReplayKey] = useState(replayKey);
  const [hideUnderlyingAnim, setHideUnderlyingAnim] = useState(false);
  if (prevReplayKey !== replayKey) {
    setPrevReplayKey(replayKey);
    setPhase(reduceMotion ? 4 : 0);
    setAnimatingKey(Platform.OS !== "web" || reduceMotion ? replayKey : null);
    setHideUnderlyingAnim(false);
  }
  const animating = animatingKey === replayKey;
  const [needsSoundHint, setNeedsSoundHint] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const settled = useRef(false);
  const soundRef = useRef<AudioPlayer | null>(null);
  const webAudioRef = useRef<HTMLAudioElement | null>(null);

  const stopAudio = () => {
    if (soundRef.current !== null) {
      soundRef.current.pause();
      soundRef.current.release();
      soundRef.current = null;
    }
    if (webAudioRef.current !== null) {
      webAudioRef.current.pause();
      webAudioRef.current = null;
    }
  };

  const playAudio = () => {
    stopAudio();
    if (Platform.OS === "web" && typeof window !== "undefined") {
      try {
        const audio = new window.Audio(`/fusion.aac?k=${replayKey}`);
        audio.volume = 1.0;
        audio.loop = false;
        webAudioRef.current = audio;
        audio
          .play()
          .then(() => {
            // Audio hardware has started playing at 0.0s: start animation in lockstep!
            setAnimatingKey(replayKey);
          })
          .catch(() => {
            setNeedsSoundHint(true);
            setAnimatingKey(replayKey);
          });
      } catch {
        queueMicrotask(() => {
          setAnimatingKey(replayKey);
        });
      }
    } else if (defaultSoundAsset !== undefined) {
      try {
        const player = createAudioPlayer(defaultSoundAsset);
        player.volume = 1.0;
        player.loop = false;
        soundRef.current = player;
        player.play();
        setAnimatingKey(replayKey);
      } catch {
        setNeedsSoundHint(true);
        setAnimatingKey(replayKey);
      }
    } else {
      queueMicrotask(() => {
        setAnimatingKey(replayKey);
      });
    }
  };

  // Subtle floating breathing motion once Garnet is settled
  const floatAnim = useSharedValue(0);
  useEffect(() => {
    if (phase === 4 && !reduceMotion) {
      floatAnim.set(withRepeat(withTiming(1, { duration: 2200 }), -1, true));
    }
  }, [phase, reduceMotion, floatAnim]);

  const floatStyle = useAnimatedStyle(() => {
    if (reduceMotion) return {};
    const f = floatAnim.get();
    return {
      transform: [{ translateY: (f - 0.5) * 6 }],
    };
  });

  const settle = () => {
    if (settled.current) return;
    settled.current = true;
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Vibration.vibrate(50);
    }
    // Note: Do not abort audio here so the magical shimmer sound naturally resolves to silence
    onSettled?.();
  };

  const settleFromEffect = useEffectEvent(settle);
  const playAudioFromEffect = useEffectEvent(playAudio);

  useEffect(() => {
    if (reduceMotion) {
      settleFromEffect();
      return;
    }

    settled.current = false;
    // Reset phase when replaying
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhase(0);
    setAnimatingKey(Platform.OS !== "web" ? replayKey : null);

    if (hasFusionVideo) {
      playAudioFromEffect();
      return () => {
        stopAudio();
      };
    } else {
      // Fallback glass panes timeline
      glide.set(withSpring(1, motion.spring.smooth));
      const ids = TIMELINE.map(([p, at]) =>
        setTimeout(() => {
          setPhase(p);
          if (p === 4) settleFromEffect();
        }, at),
      );
      timers.current = ids;
      return () => {
        ids.forEach(clearTimeout);
      };
    }
  }, [reduceMotion, glide, motion.spring.smooth, hasFusionVideo, replayKey]);

  // Synchronized animation timeline starts only when audio/animation begins
  useEffect(() => {
    if (!animating || phase === 4 || reduceMotion) return;

    // Contact vibration at t=1000ms as Ruby & Sapphire leap together
    const leapTimer = setTimeout(() => {
      if (Platform.OS !== "web") {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Vibration.vibrate(40);
      }
    }, 1000);

    // Burst vibration at the peak of the fusion
    const hapticTimer = setTimeout(() => {
      if (Platform.OS !== "web") {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Vibration.vibrate([0, 80, 50, 120]);
      }
    }, FUSION_BURST_PEAK_MS);

    // Settle timer
    const settleTimer = setTimeout(() => {
      setPhase(4);
      settleFromEffect();
    }, FUSION_DURATION_MS);

    // Clean up underlying animation shortly after settled overlay mounts to prevent looping
    const cleanupTimer = setTimeout(() => {
      setHideUnderlyingAnim(true);
    }, FUSION_DURATION_MS + 150);

    timers.current = [leapTimer, hapticTimer, settleTimer, cleanupTimer];

    return () => {
      timers.current.forEach(clearTimeout);
      if (Platform.OS !== "web") {
        Vibration.cancel();
      }
    };
  }, [animating, phase, reduceMotion]);

  const skip = () => {
    if (phase === 4) return;
    timers.current.forEach(clearTimeout);
    glide.set(1);
    setPhase(4);
    setHideUnderlyingAnim(true);
    stopAudio();
    settle();
  };

  const handlePress = () => {
    if (needsSoundHint) {
      setNeedsSoundHint(false);
      playAudio();
      return;
    }
    skip();
  };

  // 1. Owner-supplied video fusion animation (completely transparent, no video chrome)
  if (hasFusionVideo) {
    const isSettled = phase === 4;
    const startSource =
      Platform.OS === "web"
        ? { uri: `/fusion-start.png?v=2&k=${replayKey}` }
        : (defaultStartSource ?? fusionSource);
    const webpSource =
      Platform.OS === "web" ? { uri: `/fusion.webp?v=2&k=${replayKey}` } : fusionSource;
    const settledWebSource =
      Platform.OS === "web" ? { uri: `/fusion-settled.png?v=2&k=${replayKey}` } : undefined;
    const settledSourceToUse = settledWebSource ?? settledSource ?? webpSource;

    return (
      <Pressable
        onPress={handlePress}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={styles.fusionStage}
      >
        <Animated.View style={[styles.fusionWrap, floatStyle]}>
          {!hideUnderlyingAnim ? (
            <Image
              key={`fusion-anim-${replayKey}`}
              source={animating ? webpSource : startSource}
              style={{ width: animWidth, height: animHeight }}
              contentFit="contain"
              priority="high"
              accessible={false}
            />
          ) : null}
          {isSettled ? (
            <View pointerEvents="none" style={styles.settledOverlay}>
              <Image
                source={settledSourceToUse}
                style={{ width: animWidth, height: animHeight }}
                contentFit="contain"
                priority="high"
                accessible={false}
              />
            </View>
          ) : null}
          <View pointerEvents="none" style={styles.sparkleOverlay}>
            <SparkleBurst play={isSettled} />
          </View>
          {needsSoundHint && !isSettled ? (
            <View style={styles.unmutePill}>
              <AppText variant="caption" color="accent">
                Tap for sound 🔊
              </AppText>
            </View>
          ) : null}
        </Animated.View>
      </Pressable>
    );
  }

  // 2. Glass pane fallback (used in unit tests and before character assets exist)
  const lit = phase === 4 ? 3 : phase;
  return (
    <Pressable
      onPress={skip}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={styles.stage}
    >
      <View style={[styles.row, { marginRight: -paneWidth * 0.1 }]}>
        <FallbackPane side="ruby" glide={glide} paneWidth={paneWidth} travel={travel} />
      </View>
      <View style={[styles.row, styles.front, { marginLeft: -paneWidth * 0.1 }]}>
        <FallbackPane side="sapphire" glide={glide} paneWidth={paneWidth} travel={travel} />
      </View>
      <View pointerEvents="none" style={styles.crystal}>
        <GarnetMark size={Math.round(paneWidth * 0.5)} progress={lit} />
        <SparkleBurst play={phase === 4} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stage: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  row: { alignItems: "center" },
  front: { zIndex: 1 },
  pane: { alignItems: "center", justifyContent: "flex-end", overflow: "hidden" },
  crystal: { position: "absolute", top: 0, alignSelf: "center", alignItems: "center", zIndex: 2 },

  // Seamless fusion video styling
  fusionStage: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  fusionWrap: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  settledOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  sparkleOverlay: {
    position: "absolute",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  unmutePill: {
    position: "absolute",
    bottom: 8,
    alignSelf: "center",
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});
