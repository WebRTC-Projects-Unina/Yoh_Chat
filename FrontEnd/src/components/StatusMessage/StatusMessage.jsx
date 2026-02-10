import React from 'react';
import './StatusMessage.css';

function StatusMessage({ message }) {
  return (
    <p className="status-message">{message}</p>
  );
}

export default StatusMessage;