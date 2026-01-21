import React from 'react';
// import './StartButton.css';

/**
 * Props:
 * - disabled: boolean
 * - onClick: () => ()
 */
export default function StartButton(props) {
  return (
    <button
      className={props.disabled ? 'startButton' : 'startButtonReady'}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      Start call
    </button>
  );
}
