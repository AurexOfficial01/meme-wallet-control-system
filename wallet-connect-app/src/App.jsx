// src/App.jsx

import { useState } from 'react';

function App() {
  const [isConnected, setIsConnected] = useState(false);

  const handleConnect = () => {
    setIsConnected(!isConnected);
  };

  return (
    <div>
      <header>
        <h1>Wallet Connect System</h1>
      </header>

      <main>
        {isConnected ? (
          <div>
            <p>Wallet Connected</p>
            <button onClick={handleConnect}>Disconnect</button>
          </div>
        ) : (
          <div>
            <p>Wallet Not Connected</p>
            <button onClick={handleConnect}>Connect Wallet</button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
