import React from 'react';
import './BrowserUnsupported.css';

export default function BrowserUnsupported() {
  return (
    <p class="browser-unsupported">
      Looks like you need to upgrade your browser to make Daily video calls.
      <br />
      See&nbsp;
      <a href="https://docs.daily.co/docs/browsers">this page</a>
      &nbsp;for help getting on a supported browser version.
    </p>
  );
}
