import React, { useContext, useEffect, useState } from 'react';
import './Tray.css';
import TrayButton, {
  TYPE_MUTE_CAMERA,
  TYPE_MUTE_MIC,
  TYPE_SCREEN,
  TYPE_LEAVE,
  TYPE_CHAT,
} from '../TrayButton/TrayButton';
import Chat from '../Chat/Chat';
import CallObjectContext from '../../CallObjectContext';
import { logDailyEvent } from '../../logUtils';
import DailyIframe from '@daily-co/daily-js';

/**
 * Gets [isCameraMuted, isMicMuted, isSharingScreen].
 * This function is declared outside Tray() so it's not recreated every render
 * (which would require us to declare it as a useEffect dependency).
 */
function getStreamStates(callObject) {
  let isCameraMuted,
    isMicMuted,
    isSharingScreen = false;
  if (
    callObject &&
    callObject.participants() &&
    callObject.participants().local
  ) {
    const localParticipant = callObject.participants().local;
    isCameraMuted = !localParticipant.video;
    isMicMuted = !localParticipant.audio;
    isSharingScreen = localParticipant.screen;
  }
  return [isCameraMuted, isMicMuted, isSharingScreen];
}

/**
 * Props:
 * - onClickLeaveCall: () => ()
 * - disabled: boolean
 */
export default function Tray(props) {
  const callObject = useContext(CallObjectContext);
  const [isCameraMuted, setCameraMuted] = useState(false);
  const [isMicMuted, setMicMuted] = useState(false);
  const [isSharingScreen, setSharingScreen] = useState(false);
  const [displayChat, setChatDisplay] = useState(false);
  const [highlightedChat, setChatHighlight] = useState(false);

  function toggleCamera() {
    callObject.setLocalVideo(isCameraMuted);
  }

  function toggleMic() {
    callObject.setLocalAudio(isMicMuted);
  }

  function toggleSharingScreen() {
    isSharingScreen
      ? callObject.stopScreenShare()
      : callObject.startScreenShare();
  }

  function leaveCall() {
    props.onClickLeaveCall && props.onClickLeaveCall();
  }

  function toggleChat() {
    setChatDisplay(!displayChat);
    if (highlightedChat) {
      setChatHighlight(!highlightedChat);
    }
  }

  function handleNewChat() {
    setChatHighlight(!highlightedChat);
  }

  /**
   * Start listening for participant changes when callObject is set (i.e. when the component mounts).
   * This event will capture any changes to your audio/video mute state.
   */
  useEffect(() => {
    if (!callObject) return;

    function handleNewParticipantsState(event) {
      event && logDailyEvent(event);
      const [isCameraMuted, isMicMuted, isSharingScreen] = getStreamStates(
        callObject
      );
      setCameraMuted(isCameraMuted);
      setMicMuted(isMicMuted);
      setSharingScreen(isSharingScreen);
    }

    // Use initial state
    handleNewParticipantsState();

    // Listen for changes in state
    callObject.on('participant-updated', handleNewParticipantsState);

    // Stop listening for changes in state
    return function cleanup() {
      callObject.off('participant-updated', handleNewParticipantsState);
    };
  }, [callObject]);

  return (
    <div className="tray">
      <TrayButton
        type={TYPE_MUTE_CAMERA}
        disabled={props.disabled}
        highlighted={isCameraMuted}
        onClick={toggleCamera}
      />
      <TrayButton
        type={TYPE_MUTE_MIC}
        disabled={props.disabled}
        highlighted={isMicMuted}
        onClick={toggleMic}
      />
      {DailyIframe.supportedBrowser().supportsScreenShare && (
        <TrayButton
          type={TYPE_SCREEN}
          disabled={props.disabled}
          highlighted={isSharingScreen}
          onClick={toggleSharingScreen}
        />
      )}
      <TrayButton
        type={TYPE_CHAT}
        disabled={props.disabled}
        highlighted={highlightedChat}
        onClick={toggleChat}
      />
      <Chat onClickDisplay={displayChat} notification={handleNewChat} />
      <TrayButton
        type={TYPE_LEAVE}
        disabled={props.disabled}
        newButtonGroup={true}
        highlighted={true}
        onClick={leaveCall}
      />
    </div>
  );
}
