import React, { useEffect, useMemo, useRef } from 'react';
import './Tile.css';

function getTrackUnavailableMessage(kind, trackState) {
  if (!trackState) return;
  switch (trackState.state) {
    case 'blocked':
      if (trackState.blocked.byPermissions) {
        return `${kind} permission denied`;
      } else if (trackState.blocked.byDeviceMissing) {
        return `${kind} device missing`;
      }
      return `${kind} blocked`;
    case 'off':
      if (trackState.off.byUser) {
        return `${kind} muted`;
      } else if (trackState.off.byBandwidth) {
        return `${kind} muted to save bandwidth`;
      }
      return `${kind} off`;
    case 'sendable':
      return `${kind} not subscribed`;
    case 'loading':
      return `${kind} loading...`;
    case 'interrupted':
      return `${kind} interrupted`;
    case 'playable':
      return null;
  }
}

/**
 * Props
 * - videoTrackState: DailyTrackState?
 * - audioTrackState: DailyTrackState?
 * - isLocalPerson: boolean
 * - isLarge: boolean
 * - disableCornerMessage: boolean
 * - onClick: Function
 */
export default function Tile(props) {
  const videoEl = useRef(null);
  const audioEl = useRef(null);

  const videoTrack = useMemo(() => {
    // For video let's use the `track` field, which is only present when video
    // is in the "playable" state.
    // (Using `persistentTrack` could result in a still frame being shown when
    // remote video is muted).
    return props.videoTrackState?.track;
  }, [props.videoTrackState]);

  const audioTrack = useMemo(() => {
    // For audio let's use the `persistentTrack` field, which is present whether
    // or not audio is in the "playable" state.
    // (Using `track` would result in a bug where, if remote audio were unmuted
    // while this call was is in a Safari background tab, audio wouldn't resume
    // playing).
    return props.audioTrackState?.persistentTrack;
  }, [props.audioTrackState]);

  const videoUnavailableMessage = useMemo(() => {
    return getTrackUnavailableMessage('video', props.videoTrackState);
  }, [props.videoTrackState]);

  const audioUnavailableMessage = useMemo(() => {
    return getTrackUnavailableMessage('audio', props.audioTrackState);
  }, [props.audioTrackState]);

  /**
   * When video track changes, update video srcObject
   */
  useEffect(() => {
    videoEl.current &&
      (videoEl.current.srcObject = videoTrack && new MediaStream([videoTrack]));
  }, [videoTrack]);

  /**
   * When audio track changes, update audio srcObject
   */
  useEffect(() => {
    audioEl.current &&
      (audioEl.current.srcObject = audioTrack && new MediaStream([audioTrack]));
  }, [audioTrack]);

  function getVideoComponent() {
    return videoTrack && <video autoPlay muted playsInline ref={videoEl} />;
  }

  function getAudioComponent() {
    return (
      !props.isLocalPerson &&
      audioTrack && <audio autoPlay playsInline ref={audioEl} />
    );
  }

  function getOverlayComponent() {
    // Show overlay when video is unavailable. Audio may be unavailable too.
    return (
      videoUnavailableMessage && (
        <p className="overlay">
          {videoUnavailableMessage}
          {audioUnavailableMessage && (
            <>
              <br />
              {audioUnavailableMessage}
            </>
          )}
        </p>
      )
    );
  }

  function getCornerMessageComponent() {
    // Show corner message when only audio is unavailable.
    return (
      !props.disableCornerMessage &&
      audioUnavailableMessage &&
      !videoUnavailableMessage && (
        <p className="corner">{audioUnavailableMessage}</p>
      )
    );
  }

  function getClassNames() {
    let classNames = 'tile';
    classNames += props.isLarge ? ' large' : ' small';
    props.isLocalPerson && (classNames += ' local');
    return classNames;
  }

  return (
    <div className={getClassNames()} onClick={props.onClick}>
      <div className="background" />
      {getOverlayComponent()}
      {getVideoComponent()}
      {getAudioComponent()}
      {getCornerMessageComponent()}
    </div>
  );
}
