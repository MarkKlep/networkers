function ConnectionList({ connections }) {
  return (
    <div>
      {connections.map((person) => (
        <div className="Person" key={person.url || `${person.firstName}-${person.lastName}`}>
          <div className="Person-name">
            {`${person.firstName} ${person.lastName}`.trim()}
          </div>
          <div className="Person-role">
            {[person.position, person.company].filter(Boolean).join(' @ ')}
          </div>
          <div className="Person-meta">
            {person.connectedOn && `connected ${person.connectedOn}`}
            {person.url && (
              <>
                {person.connectedOn && ' · '}
                <a href={person.url} target="_blank" rel="noreferrer">
                  profile
                </a>
              </>
            )}
            {person.email && ` · ${person.email}`}
          </div>
        </div>
      ))}
    </div>
  );
}

export default ConnectionList;
