import React, {
  useEffect,
  useContext,
  useReducer,
  useState,
  useCallback,
  useMemo,
} from 'react';
import './Call.css';
import Tile from '../Tile/Tile';
import CallObjectContext from '../../CallObjectContext';
import CallMessage from '../CallMessage/CallMessage';
import {
  initialCallState,
  CLICK_ALLOW_TIMEOUT,
  PARTICIPANTS_CHANGE,
  CAM_OR_MIC_ERROR,
  FATAL_ERROR,
  callReducer,
  // isLocal,
  // isScreenShare,
  // containsScreenShare,
  // shouldIncludeScreenCallItem,
  getMessage,
} from './callState';
import { logDailyEvent } from '../../logUtils';

export default function Call() {
  const callObject = useContext(CallObjectContext);
  const [callState, dispatch] = useReducer(callReducer, initialCallState);
  const [isScreenSharing, setScreenSharing] = useState(false);
  const [screenShareTrackId, setScreenShareTrackId] = useState('');
  const toggleScreenShare = () => setScreenSharing(!isScreenSharing);
  const [largeTiles, setLargeTiles] = useState([]);
  const [smallTiles, setSmallTiles] = useState([]);
  const [participants, setParticipants] = useState([]);

  /**
   * Start listening for participant changes, when the callObject is set.
   */
  // useEffect(() => {
  //   if (!callObject) return;

  //   const events = [
  //     'participant-joined',
  //     'participant-updated',
  //     'participant-left',
  //   ];

  //   function handleNewParticipantsState(event) {
  //     event && logDailyEvent(event);
  //     dispatch({
  //       type: PARTICIPANTS_CHANGE,
  //       participants: callObject.participants(),
  //     });
  //   }

  //   // Use initial state
  //   handleNewParticipantsState();

  //   // Listen for changes in state
  //   for (const event of events) {
  //     callObject.on(event, handleNewParticipantsState);
  //   }

  //   // Stop listening for changes in state
  //   return function cleanup() {
  //     for (const event of events) {
  //       callObject.off(event, handleNewParticipantsState);
  //     }
  //   };
  // }, [callObject]);

  // Validate screenshare state changes
  // useEffect(() => {
  //   if (isScreenSharing) {
  //     console.log(`New screen sharing state is: ${isScreenSharing}`);
  //     console.log(`The track that is being shared is: ${screenShareTrackId}`);
  //   }
  // });

  // Update participant list
  // When participants updates
  // Have addVideoTrack as useEffect that formats into large and small tiles

  const addVideoTrack = useCallback(
    (event) => {
      console.log(`🎥 Video display comin' up!`);
      console.log(event);
      const trackId = event.track.id;
      const isLocal = event.participant.local;
      const isSharedScreen = trackId === screenShareTrackId;
      const isLarge = isSharedScreen || (!isLocal && !isScreenSharing);
      console.log(`The track that started is large: ${isLarge}`);

      const tile = {
        videoTrackState: event.participant.tracks.video,
        audioTrackState: event.participant.tracks.audio,
        isLocalPerson: isLocal,
        isLarge: isLarge,
        disableCornerMessage: isSharedScreen,
        //   onClick: isLocal
        //     ? null
        //     : () => {
        //         sendHello(event.participant.session_id);
        //       },
      };
      if (isLarge) {
        console.log([...largeTiles, tile]);
        setLargeTiles([...largeTiles, tile]);
      } else {
        setSmallTiles([...smallTiles, tile]);
      }
    },
    [smallTiles, largeTiles]
  );

  const displayLargeTiles = useMemo(() => {
    const participantTracks = [...largeTiles];
    return (
      <div className="large-tiles">
        {participantTracks?.map((p, i) => (
          <Tile
            key={`large-${i}`}
            videoTrackState={p.videoTrackState}
            audioTrackState={p.audioTrackState}
            isLocalPerson={p.isLocal}
            isLarge={p.isLarge}
            disableCornerMessage={p.disableCornerMessage}
            onClick={p.onClick}
          />
        ))}
      </div>
    );
  }, [largeTiles]);

  const displaySmallTiles = useMemo(() => {
    const participantTracks = [...smallTiles];
    return (
      <div className="small-tiles">
        {participantTracks?.map((p, i) => (
          <Tile
            key={`small-${i}`}
            videoTrackState={p.videoTrackState}
            audioTrackState={p.audioTrackState}
            isLocalPerson={p.isLocal}
            isLarge={p.isLarge}
            disableCornerMessage={p.disableCornerMessage}
            onClick={p.onClick}
          />
        ))}
      </div>
    );
  }, [smallTiles]);

  useEffect(() => {
    console.log(`Is participants changed??? ${participants}`);
    console.log(participants);
  }, [participants]);

  /**
   * When a  participant is updated, update their tracks
   */
  useEffect(() => {
    if (!callObject) return;

    function handleParticipantUpdate(event) {
      console.log('UPDATE UPDATE UPDATE');
      console.log(event);
      setParticipants([event.participant]);
    }
    callObject.on('participant-updated', handleParticipantUpdate);

    return function cleanup() {
      callObject.off('participant-updated', handleParticipantUpdate);
    };
  }, [callObject, addVideoTrack]);

  /**
   * When a track starts, display a participant's video or audio
   */
  useEffect(() => {
    if (!callObject) return;

    function handleTrackStarted(event) {
      console.log(`🛤🛤🛤🛤`);
      console.log(event);
      let trackType = event.track.kind;
      let trackId = event.track.id;
      let screenVideoTrackState = event.participant.tracks.screenVideo.track;

      if (typeof screenVideoTrackState === 'undefined') {
        if (trackType) {
          addVideoTrack(event);
        } else if (trackType === 'audio') {
          console.log(`Audio up next!`);
        }
      } else {
        console.log(`SCREENSHARE started SCREENSHARE started`);
        setScreenShareTrackId(trackId);
        setScreenSharing(!isScreenSharing);
        addVideoTrack(event);
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
    largeTiles,
    smallTiles,
    addVideoTrack,
  ]);

  /**
   * When a track stops, destroy the track
   */
  useEffect(() => {
    if (!callObject) return;

    function handleTrackStopped(event) {
      logDailyEvent(event);
      console.log(event);
      let trackId = event.track.id;
      console.log(`This is the track that STOPPED: ${trackId}`);
      if (trackId === screenShareTrackId) {
        console.log(`STOP THE SCREENSHARE`);
        toggleScreenShare();
      }
      // If track id is in large tiles, remove from large tiles
      // If in small tiles, remove from small tiles
    }

    callObject.on('track-stopped', handleTrackStopped);

    return function cleanup() {
      callObject.off('track-stopped', handleTrackStopped);
    };
  }, [callObject, isScreenSharing]);

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
  const message = getMessage(callState);

  /**
   * Display a join link to share if there is only one call participant
   */
  function displayJoinLink() {
    let header = null;
    let detail = null;

    if (largeTiles.length === 0) {
      header = "Copy and share this page's URL to invite others";
      detail = window.location.href;
    }

    return { header, detail };
  }
  const joinLink = displayJoinLink();
  return (
    <div className="call">
      {displayLargeTiles}
      {displaySmallTiles}
      {message && (
        <CallMessage
          header={joinLink.header}
          detail={joinLink.detail}
          isError={message.isError}
        />
      )}
    </div>
  );
}
