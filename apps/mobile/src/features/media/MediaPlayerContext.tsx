import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { DemoArt } from "@/data/fixtures/demoDays";
import { MediaPlayerLightbox } from "./MediaPlayerLightbox";

export interface ActiveMediaItem {
  type: "photo" | "video";
  art: DemoArt;
  caption?: string | undefined;
  seconds?: number | undefined;
  authorName?: string | undefined;
  at?: string | undefined;
}

export type PlaybackSpeed = 1 | 1.5 | 2;

export interface VoicePlaybackState {
  activeId: string | null;
  isPlaying: boolean;
  elapsed: number;
  duration: number;
  speed: PlaybackSpeed;
}

export interface MediaPlayerContextValue {
  // Voice playback
  voice: VoicePlaybackState;
  playVoice: (id: string, duration: number) => void;
  pauseVoice: () => void;
  resumeVoice: () => void;
  toggleVoice: (id: string, duration: number) => void;
  seekVoice: (seconds: number) => void;
  setVoiceSpeed: (speed: PlaybackSpeed) => void;
  stopVoice: () => void;

  // Fullscreen media preview / lightbox
  activeMedia: ActiveMediaItem | null;
  openMedia: (item: ActiveMediaItem) => void;
  closeMedia: () => void;
  videoPlaying: boolean;
  videoElapsed: number;
  toggleVideo: () => void;
  seekVideo: (seconds: number) => void;
}

const MediaPlayerContext = createContext<MediaPlayerContextValue | null>(null);

/**
 * Universal Media Player Service for Garnet.
 * Provides unified voice note playback (ensures only one plays at a time, smooth waveform scrubbing,
 * speed toggling 1x / 1.5x / 2x) and a silky glass lightbox modal for viewing photos and videos
 * anywhere in the app (Chat, Days, Memories, Open When).
 */
export function MediaPlayerProvider({ children }: { children: ReactNode }) {
  // Voice state
  const [activeVoiceId, setActiveVoiceId] = useState<string | null>(null);
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);
  const [voiceElapsed, setVoiceElapsed] = useState(0);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const [voiceSpeed, setVoiceSpeed] = useState<PlaybackSpeed>(1);

  // Video / Photo lightbox state
  const [activeMedia, setActiveMedia] = useState<ActiveMediaItem | null>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoElapsed, setVideoElapsed] = useState(0);

  const voiceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
      if (videoTimerRef.current) clearInterval(videoTimerRef.current);
    };
  }, []);

  // Voice playback ticker
  useEffect(() => {
    if (!isVoicePlaying || activeVoiceId === null || voiceDuration <= 0) {
      if (voiceTimerRef.current) {
        clearInterval(voiceTimerRef.current);
        voiceTimerRef.current = null;
      }
      return;
    }

    const intervalMs = 100;
    const stepSeconds = (intervalMs / 1000) * voiceSpeed;

    voiceTimerRef.current = setInterval(() => {
      setVoiceElapsed((prev) => {
        const next = prev + stepSeconds;
        if (next >= voiceDuration) {
          setIsVoicePlaying(false);
          return 0;
        }
        return next;
      });
    }, intervalMs);

    return () => {
      if (voiceTimerRef.current) {
        clearInterval(voiceTimerRef.current);
        voiceTimerRef.current = null;
      }
    };
  }, [isVoicePlaying, activeVoiceId, voiceDuration, voiceSpeed]);

  // Video playback ticker
  useEffect(() => {
    if (!videoPlaying || activeMedia?.type !== "video" || !activeMedia.seconds) {
      if (videoTimerRef.current) {
        clearInterval(videoTimerRef.current);
        videoTimerRef.current = null;
      }
      return;
    }

    const duration = activeMedia.seconds;
    videoTimerRef.current = setInterval(() => {
      setVideoElapsed((prev) => {
        const next = prev + 0.1;
        if (next >= duration) {
          setVideoPlaying(false);
          return 0;
        }
        return next;
      });
    }, 100);

    return () => {
      if (videoTimerRef.current) {
        clearInterval(videoTimerRef.current);
        videoTimerRef.current = null;
      }
    };
  }, [videoPlaying, activeMedia]);

  const playVoice = useCallback((id: string, duration: number) => {
    setActiveVoiceId(id);
    setVoiceDuration(duration);
    setVoiceElapsed(0);
    setIsVoicePlaying(true);
  }, []);

  const pauseVoice = useCallback(() => {
    setIsVoicePlaying(false);
  }, []);

  const resumeVoice = useCallback(() => {
    setIsVoicePlaying(true);
  }, []);

  const toggleVoice = useCallback((id: string, duration: number) => {
    setActiveVoiceId((currentId) => {
      if (currentId === id) {
        setIsVoicePlaying((prev) => !prev);
        return currentId;
      }
      setVoiceDuration(duration);
      setVoiceElapsed(0);
      setIsVoicePlaying(true);
      return id;
    });
  }, []);

  const seekVoice = useCallback((seconds: number) => {
    setVoiceElapsed(seconds);
  }, []);

  const stopVoice = useCallback(() => {
    setIsVoicePlaying(false);
    setActiveVoiceId(null);
    setVoiceElapsed(0);
  }, []);

  const openMedia = useCallback((item: ActiveMediaItem) => {
    setIsVoicePlaying(false);
    setActiveMedia(item);
    setVideoPlaying(item.type === "video");
    setVideoElapsed(0);
  }, []);

  const closeMedia = useCallback(() => {
    setActiveMedia(null);
    setVideoPlaying(false);
    setVideoElapsed(0);
  }, []);

  const toggleVideo = useCallback(() => {
    setVideoPlaying((prev) => !prev);
  }, []);

  const seekVideo = useCallback((seconds: number) => {
    setVideoElapsed(seconds);
  }, []);

  const value = useMemo<MediaPlayerContextValue>(
    () => ({
      voice: {
        activeId: activeVoiceId,
        isPlaying: isVoicePlaying,
        elapsed: voiceElapsed,
        duration: voiceDuration,
        speed: voiceSpeed,
      },
      playVoice,
      pauseVoice,
      resumeVoice,
      toggleVoice,
      seekVoice,
      setVoiceSpeed,
      stopVoice,
      activeMedia,
      openMedia,
      closeMedia,
      videoPlaying,
      videoElapsed,
      toggleVideo,
      seekVideo,
    }),
    [
      activeVoiceId,
      isVoicePlaying,
      voiceElapsed,
      voiceDuration,
      voiceSpeed,
      playVoice,
      pauseVoice,
      resumeVoice,
      toggleVoice,
      seekVoice,
      setVoiceSpeed,
      stopVoice,
      activeMedia,
      openMedia,
      closeMedia,
      videoPlaying,
      videoElapsed,
      toggleVideo,
      seekVideo,
    ],
  );

  return (
    <MediaPlayerContext.Provider value={value}>
      {children}
      {activeMedia ? <MediaPlayerLightbox media={activeMedia} onClose={closeMedia} /> : null}
    </MediaPlayerContext.Provider>
  );
}

export function useMediaPlayer(): MediaPlayerContextValue {
  const ctx = useContext(MediaPlayerContext);
  if (!ctx) {
    throw new Error("useMediaPlayer must be used within a MediaPlayerProvider");
  }
  return ctx;
}
