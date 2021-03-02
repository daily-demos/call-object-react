import React, {
  useEffect,
  useContext,
  // useReducer,
  useState,
  useCallback,
  useMemo,
} from 'react';
import './Call.css';
import Tile from '../Tile/Tile';
import CallObjectContext from '../../CallObjectContext';
import CallMessage from '../CallMessage/CallMessage';
// import {
//   initialCallState,
//   CLICK_ALLOW_TIMEOUT,
//   PARTICIPANTS_CHANGE,
//   CAM_OR_MIC_ERROR,
//   FATAL_ERROR,
//   callReducer,
//   isLocal,
//   isScreenShare,
//   containsScreenShare,
//   shouldIncludeScreenCallItem,
//   getMessage,
// } from './callState';
import { logDailyEvent } from '../../logUtils';

export default function Call() {
  const callObject = useContext(CallObjectContext);
  // const [callState, dispatch] = useReducer(callReducer, initialCallState);
  const [isScreenSharing, setScreenSharing] = useState(false);
  const [screenShareTrackId, setScreenShareTrackId] = useState('');
  // Set a flag for screenshare started
  const [screenShareStarted, setScreenShareStarted] = useState(false);
  const [screenShareEvent, setScreenShareEvent] = useState({});
  const [tiles, setTiles] = useState([]);

  /**
   * Start listening for participant changes, when the callObject is set.
   */
  // useEffect(() => {
  //   if (!callObject) return;

  // const es = [
  //   'participant-joined',
  //   'participant-updated',
  //   'participant-left',
  // ];

  //   function handleNewParticipantsState(e) {
  //     e && logDailyEvent(e);
  //     dispatch({
  //       type: PARTICIPANTS_CHANGE,
  //       participants: callObject.participants(),
  //     });
  //   }

  //   // Use initial state
  //   handleNewParticipantsState();

  //   // Listen for changes in state
  //   for (const e of es) {
  //     callObject.on(e, handleNewParticipantsState);
  //   }

  //   // Stop listening for changes in state
  //   return function cleanup() {
  //     for (const e of es) {
  //       callObject.off(e, handleNewParticipantsState);
  //     }
  //   };
  // }, [callObject]);

  /**
   * Add or update a participant's "tile" details
   */
  const addOrUpdateTile = useCallback(
    (e) => {
      logDailyEvent(e);

      const isSharedScreen = e?.track?.id === screenShareTrackId;
      const isLarge =
        isSharedScreen || (!e?.participant?.local && !isScreenSharing);
      const isLocalPerson = e?.participant?.local;

      console.log(`The trackId in addTile is ${e?.track?.id}`);
      console.log(`The screenshare track in state: ${screenShareTrackId}`);
      console.log(`It is a shared screen: ${isSharedScreen}`);
      console.log(`The shared screen isLarge ${isLarge}`);

      const tile = {
        id: !isSharedScreen
          ? e?.participant?.session_id
          : `${e?.participant?.session_id}-screen`,
        videoTrackState: isSharedScreen
          ? e?.participant?.tracks?.screenVideo
          : e?.participant?.tracks?.video,
        audioTrackState: e?.participant?.tracks?.audio,
        isLocalPerson,
        isLarge,
        disableCornerMessage: isSharedScreen,
      };

      function addOrUpdate(arr, obj) {
        const index = arr?.findIndex((e) => e?.id === obj?.id);
        if (index === -1) {
          arr.push(obj);
          console.log(`PUSH PUSH PUSH`);
        } else {
          arr[index] = obj;
        }
        return arr;
      }

      const updatedTiles = addOrUpdate(tiles.slice(), tile);
      setTiles(updatedTiles);
    },
    [tiles, screenShareTrackId, isScreenSharing]
  );

  /**
   * Remove a participant's tile details from state
   */
  const removeTile = useCallback(
    (e) => {
      logDailyEvent(e);
      const remainingTiles = tiles.filter(
        (t) => t.id !== e?.participant?.session_id
      );
      setTiles(remainingTiles);
    },
    [tiles]
  );

  useEffect(() => {
    console.log(`New screen sharing state is: ${isScreenSharing}`);
    console.log(`The track that is being shared is: ${screenShareTrackId}`);
    console.log(screenShareEvent);
    if (isScreenSharing && screenShareStarted && screenShareEvent) {
      console.log('Doing a thing just once.');
      addOrUpdateTile(screenShareEvent);
      setScreenShareStarted(!screenShareStarted);
    }
  }, [
    isScreenSharing,
    addOrUpdateTile,
    screenShareEvent,
    screenShareTrackId,
    screenShareStarted,
  ]);

  /**
   * When the call object is set, listen and react to participant updates
   */
  useEffect(() => {
    if (!callObject) return;

    function handleParticipantUpdate(e) {
      logDailyEvent(e);
      addOrUpdateTile(e);
    }

    callObject.on('participant-updated', handleParticipantUpdate);

    return function cleanup() {
      callObject.off('participant-updated', handleParticipantUpdate);
    };
  }, [callObject, addOrUpdateTile]);

  /**
   * When the call obect is set, listen for tracks starting and get "tile" details from the event object
   * NOTE: We'll pass audio and video at once in this app, via event.participant.tracks, because our "tile" component renders both. However, it's possible, and sometimes preferred, to pass audio separately.
   */
  useEffect(() => {
    if (!callObject) return;

    function handleTrackStarted(e) {
      let trackType = e?.track?.kind;
      let trackId = e?.track?.id;
      let screenVideoTrackState = e?.participant?.tracks?.screenVideo?.track;
      console.log(e);

      if (typeof screenVideoTrackState === 'undefined') {
        if (trackType === 'video') {
          addOrUpdateTile(e);
        } else if (trackType === 'audio') {
          console.log(
            `We'll pass audio when we pass video, because one tile holds both tracks.`
          );
        }
      } else {
        if (trackType === 'video') {
          console.log(`A screenshare is starting!`);
          setScreenShareStarted(!screenShareStarted);
          setScreenShareTrackId(trackId);
          setScreenShareEvent(e);
          setScreenSharing(!isScreenSharing);
        } else {
          console.log(`Passing screenAudio when the video starts.`);
        }
      }
    }

    callObject.on('track-started', handleTrackStarted);

    return function cleanup() {
      callObject.off('track-started', handleTrackStarted);
    };
  }, [callObject, isScreenSharing, screenShareTrackId, tiles, addOrUpdateTile]);

  /**
   * PLACEHOLDER for track-stopped on screenshare
   */

  /**
   * When the call object is set, listen for participants leaving a call and remove their tracks
   */
  useEffect(() => {
    if (!callObject) return;

    function handleParticipantLeft(e) {
      removeTile(e);
    }

    callObject.on('participant-left', handleParticipantLeft);

    return function cleanup() {
      callObject.off('participant-left', handleParticipantLeft);
    };
  }, [callObject, isScreenSharing, removeTile]);

  /**
   * Start listening for call errors, when the callObject is set.
   */
  useEffect(() => {
    if (!callObject) return;

    function handleCameraErrorEvent(e) {
      logDailyEvent(e);
      getMessage(e);
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
      getMessage(e);
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
  // useEffect(() => {
  //   const t = setTimeout(() => {
  //     toggleShouldShowClickAllow();
  //   }, 2500);

  //   return function cleanup() {
  //     clearTimeout(t);
  //   };
  // }, [shouldShowClickAllow, toggleShouldShowClickAllow]);

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

  /**Display tiles when there is a change */
  useEffect(() => {
    console.log(`TILE CHANGE`);
    console.log(tiles);
  }, [tiles]);

  const displayLargeTiles = useMemo(() => {
    const participantTracks = [...tiles];
    const largeTiles = participantTracks.filter((t) => t.isLarge === true);
    return (
      <div className="large-tiles">
        {largeTiles?.map((t, i) => (
          <Tile
            key={`large-${i}`}
            videoTrackState={t.videoTrackState}
            audioTrackState={t.audioTrackState}
            isLocalPerson={t.isLocal}
            isLarge={t.isLarge}
            disableCornerMessage={t.disableCornerMessage}
            onClick={
              t.isLocalPerson
                ? null
                : () => {
                    sendHello(t.id);
                  }
            }
          />
        ))}
      </div>
    );
  }, [tiles, sendHello]);

  const displaySmallTiles = useMemo(() => {
    const participantTracks = [...tiles];
    const smallTiles = participantTracks.filter((t) => t.isLarge === false);
    return (
      <div className="small-tiles">
        {smallTiles?.map((t, i) => (
          <Tile
            key={`small-${i}`}
            videoTrackState={t.videoTrackState}
            audioTrackState={t.audioTrackState}
            isLocalPerson={t.isLocal}
            isLarge={t.isLarge}
            disableCornerMessage={t.disableCornerMessage}
            onClick={t.onClick}
          />
        ))}
      </div>
    );
  }, [tiles]);

  /**
   * Display a message
   */
  function getMessage(e) {
    let header = null;
    let detail = null;
    let isError = false;

    if (!e) {
      if (tiles.length <= 1) {
        header = "Copy and share this page's URL to invite others";
        detail = window.location.href;
      }
    } else if (e.action === 'error') {
      header = `Fatal error ${(e && e.errorMsg) || 'Unknown'}`;
    } else if (e.action === 'camera-error') {
      header = `Camera or mic access error: ${
        (e && e.errorMsg && e.errorMsg.errorMsg) || 'Unknown'
      }`;
      detail =
        'See https://help.daily.co/en/articles/2528184-unblock-camera-mic-access-on-a-computer to troubleshoot.';
      isError = true;
    }
    return header || detail ? { header, detail, isError } : null;
  }
  const message = getMessage();
  return (
    <div className="call">
      {displayLargeTiles}
      {displaySmallTiles}
      {message && (
        <CallMessage
          header={message.header}
          detail={message.detail}
          isError={message.isError}
        />
      )}
    </div>
  );
}
