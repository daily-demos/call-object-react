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
   * Add or update a participant's "tile" data
   */
  const addOrUpdateTile = useCallback(
    (e) => {
      logDailyEvent(e);
      console.log(`✨ ADD OR UPDATE ✨ `);
      const isSharedScreen = e?.track?.id === screenShareTrackId;
      const isLarge =
        isSharedScreen || (!e?.participant?.local && !isScreenSharing);
      const isLocalPerson = e?.participant?.local;

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
          console.log(`➕ ADDING a tile ➕`);
        } else {
          arr[index] = obj;
          console.log(`👯‍♀️ UPDATING the tile 👯‍♀️`);
        }
        return arr;
      }

      const updatedTiles = addOrUpdate(tiles.slice(), tile);

      if (isSharedScreen) {
        updatedTiles.forEach((t) => {
          if (!t.id.includes('-screen')) {
            t.isLarge = false;
          }
        });
      }
      setTiles(updatedTiles);
    },
    [tiles, screenShareTrackId, isScreenSharing]
  );

  /**
   * Remove a participant's tile data
   */
  const removeTile = useCallback(
    (e) => {
      console.log(`✂️ REMOVE TILE ✂️`);
      logDailyEvent(e);
      const remainingTiles = tiles.filter(
        (t) => t.videoTrackState.track !== e?.track
      );
      setTiles(remainingTiles);
    },
    [tiles]
  );

  /**
   * When the call object is set, reflect participant-updated change in tiles
   */
  useEffect(() => {
    if (!callObject) return;

    function handleParticipantUpdate(e) {
      logDailyEvent(e);
      console.log(`💅 participant-updated makeover 💅`);
      console.log(e);

      // TEST: If the participant-updated is sharing a screen, don't do anything
      if (
        e?.participant?.tracks?.screenVideo.track?.id === screenShareTrackId
      ) {
        console.log(`💕 it's the participant screensharing, do nothing`);
      } else {
        addOrUpdateTile(e);
      }
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
      console.log(`🟢 TRACK STARTING 🟢`);
      console.log(e);

      if (typeof screenVideoTrackState === 'undefined') {
        if (trackType === 'video') {
          addOrUpdateTile(e);
        } else if (trackType === 'audio') {
          console.log(
            `We listen for audio changes on participant-updated, so nothing to do here.`
          );
        }
      } else {
        console.log(`🎬 Screenshare starting 🎬`);
        setScreenShareStarted(!screenShareStarted);
        setScreenShareTrackId(trackId);
        setScreenShareEvent(e);
        setScreenSharing(!isScreenSharing);
      }
    }

    callObject.on('track-started', handleTrackStarted);

    return function cleanup() {
      callObject.off('track-started', handleTrackStarted);
    };
  }, [
    callObject,
    isScreenSharing,
    screenShareTrackId,
    screenShareStarted,
    tiles,
    addOrUpdateTile,
  ]);

  /**
   * Listen for track stops, and remove a track if it has ended (participant left)
   */
  useEffect(() => {
    if (!callObject) return;

    function handleTrackStopped(e) {
      console.log(`🛑 TRACK STOPPED 🛑`);
      console.log(e);

      if (e?.track?.readyState === 'ended') {
        removeTile(e);
      } else if (e?.track?.id === screenShareTrackId) {
        removeTile(e);
        setScreenShareTrackId('');
        setScreenShareEvent({});
        setScreenSharing(!isScreenSharing);
        // TODO: Set tiles back to normal size
      }
    }

    callObject.on('track-stopped', handleTrackStopped);

    return function cleanup() {
      callObject.off('track-stopped', handleTrackStopped);
    };
  }, [callObject, screenShareTrackId, tiles, removeTile]);

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

  /**
   * Whenever the list of tiles changes, display the new list
   */
  useEffect(() => {
    console.log(`TILE CHANGE`);
    console.log(tiles);
  }, [tiles]);

  const displayLargeTiles = useMemo(() => {
    const participantTracks = [...tiles];
    const largeTiles = participantTracks.filter((t) => t.isLarge);
    return (
      <div className="large-tiles">
        {largeTiles?.map((t, i) => (
          <Tile
            key={`large-${i}`}
            videoTrackState={t.videoTrackState}
            audioTrackState={t.audioTrackState}
            isLocalPerson={t.isLocalPerson}
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
            isLocalPerson={t.isLocalPerson}
            isLarge={t.isLarge}
            disableCornerMessage={t.disableCornerMessage}
            onClick={t.onClick}
          />
        ))}
      </div>
    );
  }, [tiles]);

  /**
   * If somebody is screensharing, a screenshare started, and there is a screenShareEvent, show the shared screen
   */
  useEffect(() => {
    if (!callObject) return;

    if (isScreenSharing && screenShareStarted && screenShareEvent) {
      addOrUpdateTile(screenShareEvent);
      setScreenShareStarted(!screenShareStarted);
    }
  }, [
    isScreenSharing,
    addOrUpdateTile,
    screenShareEvent,
    screenShareStarted,
    tiles,
  ]);

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
