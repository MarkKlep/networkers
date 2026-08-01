// A real table, distinct from ConnectionList's stacked card layout (used on
// company pages, where there's rarely more than a handful of people at
// once) - here the point is scanning/filtering potentially hundreds of rows.
function ConnectionsTable({ connections }) {
  if (!connections.length) {
    return <p className="Empty">No connections match that filter.</p>;
  }

  return (
    <div className="ConnectionsTable-wrap">
      <table className="ConnectionsTable">
        <thead>
          <tr>
            <th>Name</th>
            <th>Position</th>
            <th>Company</th>
            <th>Connected</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {connections.map((person) => (
            <tr key={person.url || `${person.firstName}-${person.lastName}-${person.company}`}>
              <td>{`${person.firstName} ${person.lastName}`.trim()}</td>
              <td>{person.position || <span className="ConnectionsTable-empty">—</span>}</td>
              <td>{person.company || <span className="ConnectionsTable-empty">—</span>}</td>
              <td>{person.connectedOn || <span className="ConnectionsTable-empty">—</span>}</td>
              <td>
                {person.url && (
                  <a href={person.url} target="_blank" rel="noreferrer">
                    profile
                  </a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ConnectionsTable;
