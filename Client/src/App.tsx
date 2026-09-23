import React, { useEffect, useState } from 'react';

interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
}

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch('http://localhost:4000/health')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data: HealthResponse) => {
        setHealth(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <h1>Dhaka Tesla Pool</h1>
      <p>Share a seat. Split the fare. Survive Dhaka traffic.</p>
      <div>
        <h2>System Status</h2>
        {loading && <p>Checking backend connection...</p>}
        {error && <p>Backend offline or unreachable: {error}</p>}
        {health && (
          <div style={{ textAlign: 'left', background: '#1e293b', padding: '1rem', borderRadius: '8px' }}>
            <p><strong>Status:</strong> {health.status}</p>
            <p><strong>Service:</strong> {health.service}</p>
            <p><strong>Backend Timestamp:</strong> {health.timestamp}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
