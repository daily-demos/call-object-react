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
      videoTrackState: null,
      audioTrackState: null,
    },
  },
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
      const callItems = getCallItems(action.participants);
      return {
        ...callState,
        callItems,
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

function getCallItems(participants) {
  let callItems = { ...initialCallState.callItems }; // Ensure we *always* have a local participant
  for (const [id, participant] of Object.entries(participants)) {
    callItems[id] = {
      videoTrackState: participant.tracks.video,
      audioTrackState: participant.tracks.audio,
    };
    if (shouldIncludeScreenCallItem(participant)) {
      callItems[id + '-screen'] = {
        videoTrackState: participant.tracks.screenVideo,
        audioTrackState: participant.tracks.screenAudio,
      };
    }
  }
  return callItems;
}

function shouldIncludeScreenCallItem(participant) {
  const trackStatesForInclusion = ['loading', 'playable', 'interrupted'];
  return (
    trackStatesForInclusion.includes(participant.tracks.screenVideo.state) ||
    trackStatesForInclusion.includes(participant.tracks.screenAudio.state)
  );
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

export {
  initialCallState,
  CLICK_ALLOW_TIMEOUT,
  PARTICIPANTS_CHANGE,
  CAM_OR_MIC_ERROR,
  FATAL_ERROR,
  callReducer,
  isLocal,
  isScreenShare,
  containsScreenShare,
  getMessage,
};
