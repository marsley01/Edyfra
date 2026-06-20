'use client';

import {
  StreamCall,
  StreamTheme,
  ParticipantView,
  useCallStateHooks,
  useCall,
  SfuModels,
} from '@stream-io/video-react-sdk';
import '@stream-io/video-react-sdk/dist/css/styles.css';
import { useEffect, useState } from 'react';
import type { Call } from '@stream-io/video-react-sdk';

// ── Call Timer ───────────────────────────────────────────────────────────────
function CallTimer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');

  return <span className="call-timer">🔴 {mins}:{secs}</span>;
}

// ── Video Grid ───────────────────────────────────────────────────────────────
function VideoGrid() {
  const { useParticipants } = useCallStateHooks();
  const participants = useParticipants();

  return (
    <div className={`video-grid count-${Math.min(participants.length, 4)}`}>
      {participants.map((p) => (
        <div
          key={p.sessionId}
          className={`video-tile${p.isSpeaking ? ' speaking' : ''}${
            !p.publishedTracks.includes(SfuModels.TrackType.VIDEO) ? ' no-cam' : ''
          }`}
        >
          {p.publishedTracks.includes(SfuModels.TrackType.VIDEO) ? (
            <ParticipantView
              participant={p}
              className="participant-view"
            />
          ) : (
            <div className="no-video-tile">
              <div className="no-video-avatar">
                {p.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <span className="no-video-name">{p.name}</span>
            </div>
          )}

          <div className="tile-info">
            <span className="tile-name">
              {p.name}
              {p.isLocalParticipant && ' (You)'}
            </span>
            {!p.publishedTracks.includes(SfuModels.TrackType.AUDIO) && (
              <span className="muted-icon">🔇</span>
            )}
          </div>

          {p.isSpeaking && <div className="speaking-indicator" />}
        </div>
      ))}
    </div>
  );
}

// ── Call Controls ────────────────────────────────────────────────────────────
function CallControls({ onEnd }: { onEnd: () => void }) {
  const call = useCall();
  const { useMicrophoneState, useCameraState, useScreenShareState } =
    useCallStateHooks();

  const { microphone, isMute: micMuted } = useMicrophoneState();
  const { camera, isMute: camMuted } = useCameraState();
  const { screenShare, status: ssStatus } = useScreenShareState();

  const isScreenSharing = ssStatus === 'enabled';

  const toggleMic = async () => {
    try {
      micMuted ? await microphone.enable() : await microphone.disable();
    } catch (err) {
      console.error('[ActiveCall] Mic toggle failed:', err);
    }
  };

  const toggleCam = async () => {
    try {
      camMuted ? await camera.enable() : await camera.disable();
    } catch (err) {
      console.error('[ActiveCall] Cam toggle failed:', err);
    }
  };

  const toggleScreen = async () => {
    try {
      isScreenSharing
        ? await screenShare.disable()
        : await screenShare.enable();
    } catch (err) {
      console.error('[ActiveCall] Screen share failed:', err);
    }
  };

  const endCall = async () => {
    try {
      await call?.endCall();
    } catch {
      try {
        await call?.leave();
      } catch (err) {
        console.error('[ActiveCall] Leave failed:', err);
      }
    }
    onEnd();
  };

  return (
    <div className="call-controls">
      <button
        onClick={toggleMic}
        className={`ctrl${micMuted ? ' ctrl-off' : ''}`}
        title={micMuted ? 'Unmute' : 'Mute'}
      >
        <span className="ctrl-icon">{micMuted ? '🔇' : '🎤'}</span>
        <span className="ctrl-label">{micMuted ? 'Unmute' : 'Mute'}</span>
      </button>

      <button
        onClick={toggleCam}
        className={`ctrl${camMuted ? ' ctrl-off' : ''}`}
        title={camMuted ? 'Start Video' : 'Stop Video'}
      >
        <span className="ctrl-icon">{camMuted ? '📷' : '📹'}</span>
        <span className="ctrl-label">
          {camMuted ? 'Start Video' : 'Stop Video'}
        </span>
      </button>

      <button
        onClick={toggleScreen}
        className={`ctrl${isScreenSharing ? ' ctrl-active' : ''}`}
        title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
      >
        <span className="ctrl-icon">🖥️</span>
        <span className="ctrl-label">
          {isScreenSharing ? 'Stop Share' : 'Share'}
        </span>
      </button>

      <button onClick={endCall} className="ctrl ctrl-end" title="End Call">
        <span className="ctrl-icon">📵</span>
        <span className="ctrl-label">End Call</span>
      </button>
    </div>
  );
}

// ── ActiveCall (root export) ─────────────────────────────────────────────────
export function ActiveCall({
  call,
  onEnd,
  subject,
}: {
  call: Call;
  onEnd: () => void;
  subject?: string;
}) {
  return (
    <StreamCall call={call}>
      <StreamTheme>
        <div className="active-call-new">
          <div className="call-header-new">
            <div className="call-info-new">
              <span className="call-subject-new">
                {subject || 'Study Session'}
              </span>
              <CallTimer />
            </div>
            <span className="call-secure-new">🔒 Encrypted</span>
          </div>

          <div className="call-body-new">
            <VideoGrid />
          </div>

          <CallControls onEnd={onEnd} />
        </div>
      </StreamTheme>
    </StreamCall>
  );
}
