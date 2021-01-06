import React, { useEffect, useState, useCallback } from 'react';
import Call from '../Call/Call';
import StartButton from '../StartButton/StartButton';
import api from '../../api';
import './App.css';
import Tray from '../Tray/Tray';
import CallObjectContext from '../../CallObjectContext';
import { roomUrlFromPageUrl, pageUrlFromRoomUrl } from '../../urlUtils';
import DailyIframe from '@daily-co/daily-js';
import { logDailyEvent } from '../../logUtils';

const STATE_IDLE = 'STATE_IDLE';
const STATE_CREATING = 'STATE_CREATING';
const STATE_JOINING = 'STATE_JOINING';
const STATE_JOINED = 'STATE_JOINED';
const STATE_LEAVING = 'STATE_LEAVING';
const STATE_ERROR = 'STATE_ERROR';
// const CONNECTION_STATE_SIGNALING = 'CONNECTION_STATE_SIGNALING';
// const CONNECTION_STATE_P2P = 'CONNECTION_STATE_P2P';
// const CONNECTION_STATE_SFU = 'CONNECTION_STATE_SFU';

export default function App() {
  const [appState, setAppState] = useState(STATE_IDLE);
  const [roomUrl, setRoomUrl] = useState(null);
  const [callObject, setCallObject] = useState(null);
  // const [connectionState, setConnectionState] = useState();
  // const [subscribedTracks, setSubscribedTracks] = useState([]);
  // const [unsubscribedTracks, setUnsubscribedTracks] = useState([]);

  /**
   * Creates a new call room.
   */
  const createCall = useCallback(() => {
    setAppState(STATE_CREATING);
    return api
      .createRoom()
      .then((room) => room.url)
      .catch((error) => {
        console.log('Error creating room', error);
        setRoomUrl(null);
        setAppState(STATE_IDLE);
      });
  }, []);

  /**
   * Starts joining an existing call.
   *
   * NOTE: In this demo we show how to completely clean up a call with destroy(),
   * which requires creating a new call object before you can join() again.
   * This isn't strictly necessary, but is good practice when you know you'll
   * be done with the call object for a while and you're no longer listening to its
   * events.
   */
  const startJoiningCall = useCallback((url) => {
    const newCallObject = DailyIframe.createCallObject({
      subscribeToTracksAutomatically: false,
    });
    setRoomUrl(url);
    setCallObject(newCallObject);
    setAppState(STATE_JOINING);
    newCallObject.join({ url });
  }, []);

  /**
   * Starts leaving the current call.
   */
  const startLeavingCall = useCallback(() => {
    if (!callObject) return;
    // If we're in the error state, we've already "left", so just clean up
    if (appState === STATE_ERROR) {
      callObject.destroy().then(() => {
        setRoomUrl(null);
        setCallObject(null);
        setAppState(STATE_IDLE);
      });
    } else {
      setAppState(STATE_LEAVING);
      callObject.leave();
    }
  }, [callObject, appState]);

  /**
   * If a room's already specified in the page's URL when the component mounts,
   * join the room.
   */
  useEffect(() => {
    const url = roomUrlFromPageUrl();
    url && startJoiningCall(url);
  }, [startJoiningCall]);

  /**
   * Update the page's URL to reflect the active call when roomUrl changes.
   *
   * This demo uses replaceState rather than pushState in order to avoid a bit
   * of state-management complexity. See the comments around enableCallButtons
   * and enableStartButton for more information.
   */
  useEffect(() => {
    const pageUrl = pageUrlFromRoomUrl(roomUrl);
    if (pageUrl === window.location.href) return;
    window.history.replaceState(null, null, pageUrl);
  }, [roomUrl]);

  /**
   * Uncomment to attach call object to window for debugging purposes.
   */
  // useEffect(() => {
  //   window.callObject = callObject;
  // }, [callObject]);

  /**
   * Update app state based on reported meeting state changes.
   *
   * NOTE: Here we're showing how to completely clean up a call with destroy().
   * This isn't strictly necessary between join()s, but is good practice when
   * you know you'll be done with the call object for a while and you're no
   * longer listening to its events.
   */
  useEffect(() => {
    if (!callObject) return;

    const events = ['joined-meeting', 'left-meeting', 'error'];

    function handleNewMeetingState(event) {
      event && logDailyEvent(event);
      switch (callObject.meetingState()) {
        case 'joined-meeting':
          setAppState(STATE_JOINED);
          break;
        case 'left-meeting':
          callObject.destroy().then(() => {
            setRoomUrl(null);
            setCallObject(null);
            setAppState(STATE_IDLE);
          });
          break;
        case 'error':
          setAppState(STATE_ERROR);
          break;
        default:
          break;
      }
    }

    // Use initial state
    handleNewMeetingState();

    // Listen for changes in state
    for (const event of events) {
      callObject.on(event, handleNewMeetingState);
    }

    // Stop listening for changes in state
    return function cleanup() {
      for (const event of events) {
        callObject.off(event, handleNewMeetingState);
      }
    };
  }, [callObject]);

  /*
   * Helper function to update connection state and subscribe to appropriate participant tracks
   */
  // function handleNetworkConnection(event) {
  //   const sessionIds = Object.keys(callObject.participants()).filter(
  //     (id) => id != 'local'
  //   );
  //   console.log(`Here are all your sessionIds: ${sessionIds}`);
  //   switch (event.type) {
  //     case 'signaling':
  //       setConnectionState(CONNECTION_STATE_SIGNALING);
  //       console.log(`your connection is: ${connectionState}`);
  //       sessionIds.forEach((id) => {
  //         callObject.updateParticipant(id, { setSubscribedTracks: true });
  //         // Add session id to state array (not local!)
  //         setSubscribedTracks([...subscribedTracks, id]);
  //       });
  //       break;
  //     case 'peer-to-peer':
  //       setConnectionState(CONNECTION_STATE_P2P);
  //       console.log(`your connection is: ${connectionState}`);
  //       sessionIds.forEach((id) => {
  //         callObject.updateParticipant(id, { setSubscribedTracks: true });
  //         // Add session id to state array (not local!)
  //         setSubscribedTracks([...subscribedTracks, id]);
  //       });
  //       break;
  //     case 'sfu':
  //       setConnectionState(CONNECTION_STATE_SFU);
  //       console.log(`your connection is: ${connectionState}`);
  //       // Get id's from state array after first two
  //       // Unsubscribe from those tracks
  //       // Update state to be just the first two
  //       const unsubscribeIds = sessionIds.slice(2);
  //       console.log(`Id's you will unsubscribe from: ${unsubscribeIds}`);

  //       unsubscribeIds.forEach((id) => {
  //         callObject.updateParticipant(id, { setSubscribedTracks: false });
  //       });
  //       break;
  //     default:
  //       break;
  //   }
  // }

  /**
   * Subscribe to new participant tracks when they join the call, if in P2P
   */
  // useEffect(() => {
  //   if (!callObject) {
  //     return;
  //   }

  //   function handleParticipantJoined(event) {
  //     handleNetworkConnection(event);
  //   }

  //   callObject.on('participant-joined', handleParticipantJoined);

  //   return function cleanup() {
  //     callObject.off('app-message', handleParticipantJoined);
  //   };
  // }, [callObject, connectionState]);

  /**
   * Listen for network connection changes, and update the connection state and display accordingly.
   */
  // useEffect(() => {
  //   if (!callObject) {
  //     return;
  //   }

  //   callObject.on('network-connection', handleNetworkConnection);

  //   return function cleanup() {
  //     callObject.off('network-connection', handleNetworkConnection);
  //   };
  // }, [callObject, connectionState]);

  /**
   * Listen for app messages from other call participants.
   */
  useEffect(() => {
    if (!callObject) {
      return;
    }

    function handleAppMessage(event) {
      if (event) {
        logDailyEvent(event);
        console.log(`received app message from ${event.fromId}: `, event.data);
      }
    }

    callObject.on('app-message', handleAppMessage);

    return function cleanup() {
      callObject.off('app-message', handleAppMessage);
    };
  }, [callObject]);

  /**
   * Rotate through participant video streams
   */
  // const toggleParticipantStreams = () => {
  //   const participants = callObject.participants();
  //   const ids = Object.keys(participants).filter((id) => id != 'local');
  //   let lastSubscribedIndex = 0;

  // Best way to track: tracks.video.subscribed (then not missing camera off)
  // If participants enter and leave meeting, order not guaranteed
  // Participants should have joined-at
  // First sort by joined-at, chronological, or user
  // Then track of one index -- track what page you're on, then only showing

  //   for (let i = 0; i < ids.length; i++) {
  //     if (participants[ids[i]].videoTrack) {
  //       callObject.updateParticipant(ids[i], { setSubscribedTracks: false });
  //       lastSubscribedIndex = i;
  //     }
  //   }

  //   if (lastSubscribedIndex == ids.length - 2) {
  //     callObject.updateParticipant(ids[lastSubscribedIndex + 1], {
  //       setSubscribedTracks: true,
  //     });
  //     callObject.updateParticipant(ids[0], { setSubscribedTracks: true });
  //   } else if (lastSubscribedIndex == ids.length - 1) {
  //     callObject.updateParticipant(ids[0], { setSubscribedTracks: true });
  //     callObject.updateParticipant(ids[1], { setSubscribedTracks: true });
  //   } else {
  //     callObject.updateParticipant(ids[lastSubscribedIndex + 1], {
  //       setSubscribedTracks: true,
  //     });
  //     callObject.updateParticipant(ids[lastSubscribedIndex + 2], {
  //       setSubscribedTracks: true,
  //     });
  //   }
  // };

  /**
   * Show the call UI if we're either joining, already joined, or are showing
   * an error.
   */
  const showCall = [STATE_JOINING, STATE_JOINED, STATE_ERROR].includes(
    appState
  );

  /**
   * Show the pagination UI if the call has switched to SFU mode
   */
  // const showPagination = [CONNECTION_STATE_SFU].includes(connectionState);

  /**
   * Only enable the call buttons (camera toggle, leave call, etc.) if we're joined
   * or if we've errored out.
   *
   * !!!
   * IMPORTANT: calling callObject.destroy() *before* we get the "joined-meeting"
   * can result in unexpected behavior. Disabling the leave call button
   * until then avoids this scenario.
   * !!!
   */
  const enableCallButtons = [STATE_JOINED, STATE_ERROR].includes(appState);

  /**
   * Only enable the start button if we're in an idle state (i.e. not creating,
   * joining, etc.).
   *
   * !!!
   * IMPORTANT: only one call object is meant to be used at a time. Creating a
   * new call object with DailyIframe.createCallObject() *before* your previous
   * callObject.destroy() completely finishes can result in unexpected behavior.
   * Disabling the start button until then avoids that scenario.
   * !!!
   */
  const enableStartButton = appState === STATE_IDLE;

  return (
    <div className="app">
      {showCall ? (
        // NOTE: for an app this size, it's not obvious that using a Context
        // is the best choice. But for larger apps with deeply-nested components
        // that want to access call object state and bind event listeners to the
        // call object, this can be a helpful pattern.
        <CallObjectContext.Provider value={callObject}>
          <Call roomUrl={roomUrl} />
          <Tray
            disabled={!enableCallButtons}
            onClickLeaveCall={startLeavingCall}
          />
        </CallObjectContext.Provider>
      ) : (
        <StartButton
          disabled={!enableStartButton}
          onClick={() => {
            createCall().then((url) => startJoiningCall(url));
          }}
        />
      )}
    </div>
  );
}
