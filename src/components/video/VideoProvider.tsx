'use client';

import { StreamVideo } from '@stream-io/video-react-sdk';
import '@stream-io/video-react-sdk/dist/css/styles.css';
import {
  useEffect,
  useState,
  createContext,
  useContext,
} from 'react';
import { getStreamVideoClient } from '@/lib/stream-video-client';
import type { StreamVideoClient, Call } from '@stream-io/video-react-sdk';

interface VideoContextType {
  client: StreamVideoClient | null;
  activeCall: Call | null;
  setActiveCall: (call: Call | null) => void;
  isLoading: boolean;
  error: string | null;
}

const VideoContext = createContext<VideoContextType>({
  client: null,
  activeCall: null,
  setActiveCall: () => {},
  isLoading: true,
  error: null,
});

export const useVideoContext = () => useContext(VideoContext);

export function VideoProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const videoClient = await getStreamVideoClient();

        if (mounted) {
          if (videoClient) {
            setClient(videoClient);
          } else {
            setError('Could not connect to video service');
          }
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message);
          console.error('[VideoProvider] init error:', err);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  // Always render children — video is an optional enhancement
  if (isLoading || !client || error) {
    return (
      <VideoContext.Provider
        value={{ client: null, activeCall, setActiveCall, isLoading, error }}
      >
        {children}
      </VideoContext.Provider>
    );
  }

  return (
    <VideoContext.Provider
      value={{ client, activeCall, setActiveCall, isLoading, error }}
    >
      <StreamVideo client={client}>{children}</StreamVideo>
    </VideoContext.Provider>
  );
}
