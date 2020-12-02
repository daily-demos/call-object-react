import React from 'react';
import './BrowserUnsupported.css';

export default function BrowserUnsupported() {
  return (
    <p class="browser-unsupported">
      Looks like you need to upgrade your browser to make Daily video calls.
      <br />
      See&nbsp;
      <a href="https://help.daily.co/en/articles/3179421-what-browser-version-does-daily-co-require">
        this page
      </a>
      &nbsp;for help getting on a supported browser version.
    </p>
  );
}
