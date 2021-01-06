import React, { useEffect, useContext, useReducer, useCallback } from 'react';
import './Call.css';
import Tile from '../Tile/Tile';
import CallObjectContext from '../../CallObjectContext';
import CallMessage from '../CallMessage/CallMessage';
import {
  initialCallState,
  CLICK_ALLOW_TIMEOUT,
  PARTICIPANTS_CHANGE,
  NETWORK_CHANGE,
  TRACKS_CHANGE,
  PARTICIPANT_JOINED,
  PARTICIPANT_LEFT,
  CAM_OR_MIC_ERROR,
  FATAL_ERROR,
  callReducer,
  isLocal,
  isScreenShare,
  containsScreenShare,
  getMessage,
  checkForSFU,
} from './callState';
import { logDailyEvent } from '../../logUtils';

export default function Call() {
  const callObject = useContext(CallObjectContext);
  const [callState, dispatch] = useReducer(callReducer, initialCallState);

  /**
   * Subscribe to new participant tracks when they join the call, if in P2P
   * Add a participant id to the ordered list of ids when they join
   */
  useEffect(() => {
    if (!callObject) {
      return;
    }

    function handleParticipantJoined(event) {
      let sfuMode = checkForSFU(callState);
      let id = event.participant.session_id;
      if (!sfuMode) {
        callObject.updateParticipant(event.participant.session_id, {
          setSubscribedTracks: true,
        });
      }
      dispatch({
        type: PARTICIPANT_JOINED,
        participant: id,
      });
    }

    callObject.on('participant-joined', handleParticipantJoined);

    return function cleanup() {
      callObject.off('participant-joined', handleParticipantJoined);
    };
  }, [callObject, callState]);

  /**
   * Remove a participant's id from the ordered id list when they leave the call
   */
  useEffect(() => {
    if (!callObject) {
      return;
    }

    function handleParticipantLeft(event) {
      let id = event.participant.session_id;
      dispatch({
        type: PARTICIPANT_LEFT,
        participant: id,
      });
    }

    callObject.on('participant-left', handleParticipantLeft);

    return function cleanup() {
      callObject.off('participant-left', handleParticipantLeft);
    };
  }, [callObject, callState]);

  /**
   * Start listening for participant changes, when the callObject is set.
   */
  useEffect(() => {
    if (!callObject) return;

    const events = [
      'participant-joined',
      'participant-updated',
      'participant-left',
    ];

    function handleNewParticipantsState(event) {
      // event && logDailyEvent(event);
      dispatch({
        type: PARTICIPANTS_CHANGE,
        participants: callObject.participants(),
      });
    }

    // Use initial state
    handleNewParticipantsState();

    // Listen for changes in state
    for (const event of events) {
      callObject.on(event, handleNewParticipantsState);
    }

    // Stop listening for changes in state
    return function cleanup() {
      for (const event of events) {
        callObject.off(event, handleNewParticipantsState);
      }
    };
  }, [callObject]);

  /**
   * Start listening for call errors, when the callObject is set.
   */
  useEffect(() => {
    if (!callObject) return;

    function handleCameraErrorEvent(event) {
      logDailyEvent(event);
      dispatch({
        type: CAM_OR_MIC_ERROR,
        message:
          (event && event.errorMsg && event.errorMsg.errorMsg) || 'Unknown',
      });
    }

    // We're making an assumption here: there is no camera error when callObject
    // is first assigned.

    callObject.on('camera-error', handleCameraErrorEvent);

    return function cleanup() {
      callObject.off('camera-error', handleCameraErrorEvent);
    };
  }, [callObject]);

  /**
   * Start listening for fatal errors, when the callObject is set.
   */
  useEffect(() => {
    if (!callObject) return;

    function handleErrorEvent(e) {
      logDailyEvent(e);
      dispatch({
        type: FATAL_ERROR,
        message: (e && e.errorMsg) || 'Unknown',
      });
    }

    // We're making an assumption here: there is no error when callObject is
    // first assigned.

    callObject.on('error', handleErrorEvent);

    return function cleanup() {
      callObject.off('error', handleErrorEvent);
    };
  }, [callObject]);

  /**
   * Start a timer to show the "click allow" message, when the component mounts.
   */
  useEffect(() => {
    const t = setTimeout(() => {
      dispatch({ type: CLICK_ALLOW_TIMEOUT });
    }, 2500);

    return function cleanup() {
      clearTimeout(t);
    };
  }, []);

  /**
   * Send an app message to the remote participant whose tile was clicked on.
   */
  const sendHello = useCallback(
    (participantId) => {
      callObject &&
        callObject.sendAppMessage({ hello: 'world' }, participantId);
    },
    [callObject]
  );

  /**
   * Start listening for network changes, when the callObject is set.
   */
  useEffect(() => {
    if (!callObject) return;

    function handleNetworkChange(e) {
      // If it was an SFU switch: 1) Unsubscribe from all ids after first two
      const participants = callObject.participants();
      const participantIds = Object.keys(callObject.participants()).filter(
        (id) => id !== 'local'
      );
      const unsubscribeIds = participantIds.slice(
        callState.displayedVideoStreams
      );
      if (e.type === 'sfu') {
        unsubscribeIds.forEach((id) =>
          callObject.updateParticipant(id, { setSubscribedTracks: false })
        );
      }
      dispatch({
        type: NETWORK_CHANGE,
        connection: e.type,
      });
    }

    callObject.on('network-connection', handleNetworkChange);

    return function cleanup() {
      callObject.off('network-connection', handleNetworkChange);
    };
  }, [callObject]);

  function getTiles() {
    let largeTiles = [];
    let smallTiles = [];
    Object.entries(callState.callItems).forEach(([id, callItem]) => {
      if (callItem.isLoading || !callItem.videoTrack) {
        return;
      } else {
        const isLarge =
          isScreenShare(id) ||
          (!isLocal(id) && !containsScreenShare(callState.callItems));
        const tile = (
          <Tile
            key={id}
            videoTrack={callItem.videoTrack}
            audioTrack={callItem.audioTrack}
            testName={callItem.testName}
            isLocalPerson={isLocal(id)}
            isLarge={isLarge}
            isLoading={callItem.isLoading}
            onClick={
              isLocal(id)
                ? null
                : () => {
                    sendHello(id);
                  }
            }
          />
        );
        if (isLarge) {
          largeTiles.push(tile);
        } else {
          smallTiles.push(tile);
        }
      }
    });
    return [largeTiles, smallTiles];
  }

  function rotateParticipants() {
    console.log(`Clicked!`);
    console.log(
      `You can access ordered ids here! ${callState.orderedParticipantIds}`
    );
    let unsubscribedIds = [];
    // Unsubscribe from first two id's from the list
    for (let i = 0; i < callState.displayedVideoStreams; i++) {
      callObject.updateParticipant(callState.orderedParticipantIds[i], {
        setSubscribedTracks: false,
      });
      unsubscribedIds = [
        ...unsubscribedIds,
        callState.orderedParticipantIds[i],
      ];
    }
    console.log(`You are going to unsubscribe from ${unsubscribedIds}`);
    // Subscribe to next two
    for (
      let i = callState.displayedVideoStreams;
      i < callState.displayedVideoStreams + callState.displayedVideoStreams;
      i++
    ) {
      callObject.updateParticipant(callState.orderedParticipantIds[i], {
        setSubscribedTracks: true,
      });
    }
    dispatch({
      type: TRACKS_CHANGE,
      unsubscribedIds: unsubscribedIds,
    });
  }

  const [largeTiles, smallTiles] = getTiles();
  const message = getMessage(callState);
  const sfuMode = checkForSFU(callState);

  return (
    <div className="call">
      <div className="large-tiles">
        {
          !message
            ? largeTiles
            : null /* Avoid showing large tiles to make room for the message */
        }
      </div>
      <div className="small-tiles">{smallTiles}</div>
      {message && (
        <CallMessage
          header={message.header}
          detail={message.detail}
          isError={message.isError}
        />
      )}
      {sfuMode ? (
        <button className="paginateButton" onClick={rotateParticipants}>
          Rotate participants
        </button>
      ) : null}
    </div>
  );
}
