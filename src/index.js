import { createRoot } from 'react-dom/client';
import DailyIframe from '@daily-co/daily-js';
import './index.css';
import App from './components/App/App';
import BrowserUnsupported from './components/BrowserUnsupported/BrowserUnsupported';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  DailyIframe.supportedBrowser().supported ? <App /> : <BrowserUnsupported />
);
