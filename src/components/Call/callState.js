/**
 * Call state is comprised of:
 * - "Call items" (inputs to the call, i.e. participants or shared screens)
 * - UI state that depends on call items (for now, just whether to show "click allow" message)
 *
 * Call items are keyed by id:
 * - "local" for the current participant
 * - A session id for each remote participant
 * - "<id>-screen" for each shared screen
 */
const initialCallState = {
  callItems: {
    local: {
      isLoading: true,
      audioTrack: null,
      videoTrack: null,
      testName: '',
    },
  },
  networkConnectionType: '',
  // Rename these to be participants
  orderedParticipantIds: [],
  // Have a subscribed list?
  // Make sure loop starts at new id every time
  // Computed order

  // What about complete list of all participants, ordered
  // Then when click paginate...would have to look at what indices in call items
  // instead
  // array of sorted participant_ids of when joined date: [] -- getter gets state of page of everyone in current
  // Page index, increments every time button is clicked
  // Call.js, instead of callItems, calling getter
  // subscribedTracks: [],
  // unsubscribedTracks: [],
  displayedVideoStreams: 2,
  clickAllowTimeoutFired: false,
  camOrMicError: null,
  fatalError: null,
};

// --- Actions ---

/**
 * CLICK_ALLOW_TIMEOUT action structure:
 * - type: string
 */
const CLICK_ALLOW_TIMEOUT = 'CLICK_ALLOW_TIMEOUT';

/**
 * PARTICIPANTS_CHANGE action structure:
 * - type: string
 * - participants: Object (from Daily callObject.participants())
 */
const PARTICIPANTS_CHANGE = 'PARTICIPANTS_CHANGE';

/**
 * NETWORK_CHANGE action structure:
 * - type: string
 * - connection: string, from e.type
 * - participants: Object (from Daily callObject.participants())
 */
const NETWORK_CHANGE = 'NETWORK_CHANGE';

/**
 * TRACKS_CHANGE action structure:
 * - unsubscribedIds: array of ids that will be unsubscribed, sent from calling function
 */
const TRACKS_CHANGE = 'TRACKS_CHANGE';

/**
 * PARTICIPANT_JOINED action structure:
 * - id: string, from the Daily action
 */
const PARTICIPANT_JOINED = 'PARTICIPANT_JOINED';

/**
 * PARTICIPANT_LEFT action structure:
 * - id: string, from the Daily action
 */
const PARTICIPANT_LEFT = 'PARTICIPANT_LEFT';

/**
 * CAM_OR_MIC_ERROR action structure:
 * - type: string
 * - message: string
 */
const CAM_OR_MIC_ERROR = 'CAM_OR_MIC_ERROR';

/**
 * CAM_OR_MIC_ERROR action structure:
 * - type: string
 * - message: string
 */
const FATAL_ERROR = 'FATAL_ERROR';

// --- Reducer and helpers --

function callReducer(callState, action) {
  switch (action.type) {
    case CLICK_ALLOW_TIMEOUT:
      return {
        ...callState,
        clickAllowTimeoutFired: true,
      };
    case PARTICIPANTS_CHANGE:
      const callItems = getCallItems(action.participants, callState);
      return {
        ...callState,
        callItems,
      };
    case NETWORK_CHANGE:
      console.log(
        `The connection state before we switch is ${callState.networkConnectionType}`
      );
      return {
        ...callState,
        networkConnectionType: action.connection,
      };
    case PARTICIPANT_JOINED:
      let orderedParticipantIds = addNextParticipantId(
        action.participant,
        callState
      );
      // Add test name to participant joined
      let testName = getTestName(action.participant, callState);
      return {
        ...callState,
        orderedParticipantIds,
        testName,
      };
    case TRACKS_CHANGE:
      return {
        ...callState,
        orderedParticipantIds: updateOrderedParticipantIds(
          action.unsubscribedIds,
          callState
        ),
      };
    case PARTICIPANT_LEFT:
      return {
        ...callState,
        orderedParticipantIds: removeParticipantId(
          action.participant,
          callState
        ),
      };
    case CAM_OR_MIC_ERROR:
      return { ...callState, camOrMicError: action.message };
    case FATAL_ERROR:
      return { ...callState, fatalError: action.message };
    default:
      throw new Error();
  }
}

function getLocalCallItem(callItems) {
  return callItems['local'];
}

function getCallItems(participants, prevCallState) {
  let callItems = { ...initialCallState.callItems }; // Ensure we *always* have a local participant
  //participantIdsbyJoinDate -- could call helper and set in reducer;
  // let subscribedTracks = [...initialCallState.subscribedTracks];
  // let unsubscribedTracks = [...initialCallState.unsubscribedTracks];
  for (const [id, participant] of Object.entries(participants)) {
    // Here we assume that a participant will join with audio/video enabled.
    // This assumption lets us show a "loading" state before we receive audio/video tracks.
    // This may not be true for all apps, but the call object doesn't yet support distinguishing
    // between cases where audio/video are missing because they're still loading or muted.
    const hasLoaded =
      prevCallState.callItems[id] && !prevCallState.callItems[id].isLoading;
    const missingTracks = !(participant.audioTrack || participant.videoTrack);
    console.log(prevCallState.callItems[id]);
    const hasName =
      prevCallState.callItems[id] && prevCallState.callItems[id].testName;

    if (!hasName) {
      callItems[id] = {
        isLoading: !hasLoaded && missingTracks,
        audioTrack: participant.audioTrack,
        videoTrack: participant.videoTrack,
        testName: '',
      };
    } else {
      callItems[id] = {
        isLoading: !hasLoaded && missingTracks,
        audioTrack: participant.audioTrack,
        videoTrack: participant.videoTrack,
        testName: prevCallState.callItems[id].testName,
      };
    }

    if (participant.screenVideoTrack || participant.screenAudioTrack) {
      callItems[id + '-screen'] = {
        isLoading: false,
        videoTrack: participant.screenVideoTrack,
        audioTrack: participant.screenAudioTrack,
      };
    }
  }
  return callItems;
}

function updateOrderedParticipantIds(unsubscribedIds, callState) {
  console.log(`You sent these ids back to state ${unsubscribedIds}`);
  let orderedParticipantIds = [...callState.orderedParticipantIds];
  console.log(`The original state waiting is ${orderedParticipantIds}`);
  orderedParticipantIds.splice(0, callState.displayedVideoStreams);
  console.log(`Did you cut it??? ${orderedParticipantIds}`);
  unsubscribedIds.forEach((id) => orderedParticipantIds.push(id));
  console.log(`The change is: ${orderedParticipantIds}`);
  return orderedParticipantIds;
}

function addNextParticipantId(participant, callState) {
  let orderedParticipantIds = [...callState.orderedParticipantIds];
  orderedParticipantIds.push(participant);
  return orderedParticipantIds;
}

function removeParticipantId(participant, callState) {
  let orderedParticipantIds = [...callState.orderedParticipantIds];
  let newOrder = orderedParticipantIds.filter((id) => id !== participant);
  console.log(
    `You removed ${participant} from the list. Are they missing? ${newOrder}`
  );
  return newOrder;
}

function getTestName(participant, callState) {
  const randomEmojis = [
    '✨',
    '🎀',
    '👻',
    '🎢',
    '🎠',
    '🎡',
    '🏖',
    '🚀',
    '💸',
    '🔮',
    '🧡',
  ];
  let randomIndex = Math.ceil(Math.random() * (randomEmojis.length - 1));
  return (callState.callItems[participant].testName =
    randomEmojis[randomIndex]);
}

// --- Derived data ---

// True if id corresponds to local participant (*not* their screen share)
function isLocal(id) {
  return id === 'local';
}

function isScreenShare(id) {
  return id.endsWith('-screen');
}

function containsScreenShare(callItems) {
  return Object.keys(callItems).some((id) => isScreenShare(id));
}

function getMessage(callState) {
  function shouldShowClickAllow() {
    const localCallItem = getLocalCallItem(callState.callItems);
    const hasLoaded = localCallItem && !localCallItem.isLoading;
    return !hasLoaded && callState.clickAllowTimeoutFired;
  }

  let header = null;
  let detail = null;
  let isError = false;
  if (callState.fatalError) {
    header = `Fatal error: ${callState.fatalError}`;
    isError = true;
  } else if (callState.camOrMicError) {
    header = `Camera or mic access error: ${callState.camOrMicError}`;
    detail =
      'See https://help.daily.co/en/articles/2528184-unblock-camera-mic-access-on-a-computer to troubleshoot.';
    isError = true;
  } else if (shouldShowClickAllow()) {
    header = 'Click "Allow" to enable camera and mic access';
  } else if (Object.keys(callState.callItems).length === 1) {
    header = "Copy and share this page's URL to invite others";
    detail = window.location.href;
  }
  return header || detail ? { header, detail, isError } : null;
}

function checkForSFU(callState) {
  return callState.networkConnectionType == 'sfu';
}

export {
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
};
