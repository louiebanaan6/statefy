import { useEffect, useRef } from "react";
import { Audio } from "expo-av";

interface Props {
  url: string;
  title?: string;
  autoPlay?: boolean;
  active?: boolean;
}

export default function AudioPlayer({ url, autoPlay = false, active = true }: Props) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const autoStarted = useRef(false);
  const activeRef = useRef(active);

  useEffect(() => { activeRef.current = active; }, [active]);

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!active) {
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
      autoStarted.current = false;
    }
  }, [active]);

  useEffect(() => {
    if (!autoPlay || !active || autoStarted.current || !url) return;
    autoStarted.current = true;

    let cancelled = false;

    const load = async (attempt = 1) => {
      if (cancelled || !activeRef.current) return;

      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        if (cancelled || !activeRef.current) return;

        const { sound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: true },
          (status) => {
            if (!status.isLoaded) return;
            if (status.didJustFinish) {
              soundRef.current?.unloadAsync().catch(() => {});
              soundRef.current = null;
              autoStarted.current = false;
            }
          }
        );

        if (cancelled || !activeRef.current) {
          sound.unloadAsync().catch(() => {});
          return;
        }

        soundRef.current = sound;
      } catch {
        if (!cancelled && activeRef.current && attempt < 3) {
          await new Promise(r => setTimeout(r, 1000));
          load(attempt + 1);
        }
      }
    };

    load();

    return () => { cancelled = true; };
  }, [autoPlay, active, url]);

  return null;
}
