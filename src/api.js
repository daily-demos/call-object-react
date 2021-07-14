const newRoomEndpoint =
  `${window.location.origin}/api/rooms`;

/**
 * Create a short-lived room for demo purposes.
 *
 * It uses the redirect proxy as specified in netlify.toml`
 * This will work locally if you following the Netlify specific instructions
 * in README.md
 *
 * See https://docs.daily.co/reference#create-room for more information on how
 * to use the Daily REST API to create rooms and what options are available.
 */
async function createRoom() {
  const exp = Math.round(Date.now() / 1000) + 60 * 30;
  const options = {
    properties: {
      exp: exp,
    },
  };
  let response = await fetch(newRoomEndpoint, {
    method: "POST",
    body: JSON.stringify(options),
    mode: 'cors',
  })
  if (response.status === 200) {
    return await response.json();
  } else if (response.status === 404 &&
             process.env.REACT_APP_DAILY_DOMAIN &&
             process.env.REACT_APP_DAILY_ROOM) {

    return {
      url: `https://${process.env.REACT_APP_DAILY_DOMAIN}.daily.co/${process.env.REACT_APP_DAILY_ROOM}`
    }
  } else {
    throw new Error("Unable to create a Daily room. Check out the README.md for setup instruction!")
  }
}

export default { createRoom };
