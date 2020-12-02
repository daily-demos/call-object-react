import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './components/App/App';
import BrowserUnsupported from './components/BrowserUnsupported/BrowserUnsupported';
import DailyIframe from '@daily-co/daily-js';

ReactDOM.render(
  DailyIframe.supportedBrowser().supported ? <App /> : <BrowserUnsupported />,
  document.getElementById('root')
);
