import { useState } from 'react';
import { REFERRALS_URL } from '../config';

// Shown only until an export has been stored. After that the referrals
// service remembers it across restarts, so this step never reappears unless
// you ask to replace the file.
function ConnectionsUpload({ onLoaded }) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  const upload = async (file) => {
    setError('');

    const response = await fetch(`${REFERRALS_URL}/connections`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/csv' },
      body: await file.text(),
    });
    const data = await response.json();

    if (!response.ok) {
      setError(data.error);
      return;
    }

    onLoaded(data);
  };

  return (
    <>
      {error && <div className="Error">{error}</div>}

      <label
        className={dragging ? 'Drop Drop-active' : 'Drop'}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files[0];
          if (file) upload(file);
        }}
      >
        <input
          type="file"
          accept=".csv"
          onChange={(event) => event.target.files[0] && upload(event.target.files[0])}
        />
        <strong>Drop your LinkedIn Connections.csv here</strong>
        <br />
        or click to choose a file
      </label>

      <div className="Help">
        Get the file from LinkedIn: <strong>Settings &amp; Privacy → Data Privacy → Get a
        copy of your data → Connections</strong>. LinkedIn emails you a zip; the file
        inside is <code>Connections.csv</code>.
        <br />
        <br />
        <strong>You only do this once.</strong> Your connections are saved locally to{' '}
        <code>referrals/data/</code> on this machine, so every later visit goes straight to
        the search box. Nothing is uploaded anywhere else, and that folder is gitignored so
        it can't be committed.
      </div>
    </>
  );
}

export default ConnectionsUpload;
