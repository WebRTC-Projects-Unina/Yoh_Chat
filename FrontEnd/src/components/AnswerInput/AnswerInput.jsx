import React, { useState } from 'react';
import './AnswerInput.css';

function AnswerInput({ onSubmit }) {
  const [answer, setAnswer] = useState('');

  const handleSubmit = () => {
    if (answer.trim()) {
      onSubmit(answer);
    }
  };

  return (
    <div className="answer-input">
      <h4>Incolla la risposta (Answer) qui:</h4>
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder='Incolla il JSON della risposta qui...'
        className="answer-textarea"
        rows={6}
      />
      <button
        onClick={handleSubmit}
        className="button submit-button"
      >
        Connetti
      </button>
    </div>
  );
}

export default AnswerInput;