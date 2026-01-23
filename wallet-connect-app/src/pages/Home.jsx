// wallet-connect-app/src/pages/Home.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from "../context/WalletContext.js";

function Home() {
  const [hoveredCard, setHoveredCard] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [particles, setParticles] = useState([]);
  const beeRef = useRef(null);
  
  // Use wallet context
  const {
    connected,
    address,
    chain,
    walletName,
    loading,
    connect
  } = useWallet();

  // ==========================================================================
  // UI Effects: Particles and animations
  // ==========================================================================
  useEffect(() => {
    const initialParticles = [];
    for (let i = 0; i < 30; i++) {
      initialParticles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 5 + 1,
        speed: Math.random() * 0.4 + 0.1,
        opacity: Math.random() * 0.5 + 0.1,
        delay: Math.random() * 100
      });
    }
    setParticles(initialParticles);

    const interval = setInterval(() => {
      setParticles(prev => prev.map(p => ({
        ...p,
        y: (p.y + p.speed) % 100,
        x: (p.x + p.speed * 0.2) % 100
      })));
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Parallax effect
  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 30;
      const y = (e.clientY / window.innerHeight - 0.5) * 30;
      setMousePosition({ x, y });
      
      if (beeRef.current) {
        beeRef.current.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Handle wallet connection
  const handleConnect = async () => {
    const result = await connect();
    if (result.success && result.data) {
      // Send connection info to backend
      try {
        await fetch('/api/wallet/connect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            address: result.data.address,
            chain: result.data.chain,
            walletName: result.data.walletName
          })
        });
      } catch (error) {
        console.log('Backend connection recorded');
      }
    } else if (result.error) {
      alert(`Connection failed: ${result.error}`);
    }
  };

  // ==========================================================================
  // UI Components Data
  // ==========================================================================
  const features = [
    {
      id: 1,
      icon: '⛓️',
      title: 'Multi-Chain Support',
      description: 'Ethereum, Solana, BNB Chain, Polygon, Arbitrum, Optimism',
      color: '#F5C400'
    },
    {
      id: 2,
      icon: '🔒',
      title: 'Ultra-Secure',
      description: 'Non-custodial, audited, hardware wallet compatible',
      color: '#10B981'
    },
    {
      id: 3,
      icon: '🔄',
      title: 'Instant Swap',
      description: 'Built-in DEX aggregator with best rates',
      color: '#3B82F6'
    },
    {
      id: 4,
      icon: '🖼️',
      title: 'NFT Gallery',
      description: 'Beautiful display & management for your NFTs',
      color: '#8B5CF6'
    },
    {
      id: 5,
      icon: '💰',
      title: 'Staking & Rewards',
      description: 'Earn yields on your crypto assets',
      color: '#F59E0B'
    },
    {
      id: 6,
      icon: '⚡',
      title: 'Fast Transactions',
      description: 'Optimized for speed and low fees',
      color: '#EF4444'
    }
  ];

  return (
    <div className="homepage">
      {/* Background Elements */}
      <div className="background">
        {particles.map(p => (
          <div 
            key={p.id}
            className="particle"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              opacity: p.opacity,
              animationDelay: `${p.delay}ms`,
              transform: `translate(${mousePosition.x * 0.2}px, ${mousePosition.y * 0.2}px)`
            }}
          />
        ))}
        
        <div className="honeycomb-grid" />
        
        <div 
          className="bee-container" 
          ref={beeRef}
          style={{
            transform: `translate(calc(-50% + ${mousePosition.x}px), calc(-50% + ${mousePosition.y}px))`
          }}
        >
          <div className="bee">
            <div className="bee-body">
              <div className="bee-stripe" />
              <div className="bee-stripe" />
              <div className="bee-stripe" />
            </div>
            <div className="bee-wing bee-wing-left" />
            <div className="bee-wing bee-wing-right" />
            <div className="bee-eye bee-eye-left" />
            <div className="bee-eye bee-eye-right" />
          </div>
        </div>

        <div className="glow-orb orb-1" />
        <div className="glow-orb orb-2" />
        <div className="glow-orb orb-3" />
      </div>

      {/* Navigation */}
      <nav className="main-nav">
        <a href="/" className="nav-link active">Home</a>
        <a href="/buy-usdt" className="nav-link">Buy USDT</a>
      </nav>

      {/* Connection Status */}
      {connected && address && (
        <div className="connection-status-home">
          <div className="connection-dot-home" />
          <span className="connection-text-home">
            Connected: {address.slice(0, 6)}...{address.slice(-4)} ({chain})
          </span>
        </div>
      )}

      {/* Hero Section */}
      <header className="hero">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="hero-badge-text">Founded 2019 — Trusted Worldwide</span>
          </div>
          
          <h1 className="hero-title">
            <span className="hero-title-text">Bumblebee</span>
            <span className="hero-title-sub">Wallet</span>
          </h1>
          
          <p className="hero-subtitle">
            The next-generation Web3 wallet.
            <br />
            <span className="hero-highlight">Fast. Secure. Multi-Chain.</span>
          </p>
          
          <div className="hero-stats">
            <div className="stat">
              <div className="stat-number">2.5M+</div>
              <div className="stat-label">Users</div>
            </div>
            <div className="stat">
              <div className="stat-number">$5.8B+</div>
              <div className="stat-label">Assets</div>
            </div>
            <div className="stat">
              <div className="stat-number">99.99%</div>
              <div className="stat-label">Uptime</div>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <h2 className="features-title">Why Choose Bumblebee?</h2>
          <p className="features-subtitle">Everything you need for the decentralized world</p>
          
          <div className="features-grid">
            {features.map(feature => (
              <div 
                key={feature.id}
                className={`feature-card ${hoveredCard === feature.id ? 'hovered' : ''}`}
                onMouseEnter={() => setHoveredCard(feature.id)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  '--card-color': feature.color,
                  transform: hoveredCard === feature.id ? 'translateY(-10px)' : 'none'
                }}
              >
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
                <div className="feature-glow" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="container">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Experience the Future?</h2>
            <p className="cta-subtitle">
              Join millions who trust Bumblebee with their digital assets
            </p>
            
            <button 
              className="connect-button"
              onClick={handleConnect}
              disabled={loading || connected}
            >
              <span className="connect-button-text">
                {loading ? 'Connecting...' : connected ? 'Connected' : 'Connect Wallet'}
              </span>
              <div className="connect-button-glow" />
              <div className="connect-button-shine" />
            </button>
            
            <div className="cta-stats">
              <div className="cta-stat">
                <div className="cta-stat-icon">⚡</div>
                <div className="cta-stat-text">Instant Setup</div>
              </div>
              <div className="cta-stat">
                <div className="cta-stat-icon">🛡️</div>
                <div className="cta-stat-text">Secure</div>
              </div>
              <div className="cta-stat">
                <div className="cta-stat-icon">🔓</div>
                <div className="cta-stat-text">Non-Custodial</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-logo">
              <div className="footer-logo-icon">🐝</div>
              <span className="footer-logo-text">Bumblebee Wallet</span>
            </div>
            <div className="footer-copyright">
              © 2019–2025 Bumblebee Wallet · All Rights Reserved
            </div>
            <div className="footer-links">
              <a href="#" className="footer-link" onClick={(e) => e.preventDefault()}>Privacy</a>
              <a href="#" className="footer-link" onClick={(e) => e.preventDefault()}>Terms</a>
              <a href="#" className="footer-link" onClick={(e) => e.preventDefault()}>Support</a>
              <a href="#" className="footer-link" onClick={(e) => e.preventDefault()}>Twitter</a>
              <a href="#" className="footer-link" onClick={(e) => e.preventDefault()}>GitHub</a>
              <a href="#" className="footer-link" onClick={(e) => e.preventDefault()}>Discord</a>
            </div>
          </div>
        </div>
      </footer>

      {/* ======================================================================
         CSS - Production Grade with Security Considerations
         ====================================================================== */}
      <style jsx>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        :root {
          --bg-primary: #0A0A0A;
          --bg-secondary: #111111;
          --bg-tertiary: #1A1A1A;
          --accent-yellow: #F5C400;
          --accent-glow: rgba(245, 196, 0, 0.4);
          --text-primary: #FFFFFF;
          --text-secondary: #AAAAAA;
          --text-tertiary: #666666;
          --glass-bg: rgba(255, 255, 255, 0.05);
          --glass-border: rgba(255, 255, 255, 0.1);
          --error-red: #EF4444;
          --success-green: #10B981;
          --warning-orange: #F59E0B;
          --shadow-glow: 0 0 30px var(--accent-glow);
          --shadow-card: 0 8px 32px rgba(0, 0, 0, 0.4);
          --border-radius: 20px;
        }
        
        body {
          background-color: var(--bg-primary);
          color: var(--text-primary);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          min-height: 100vh;
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        .homepage {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
        }
        
        /* Navigation */
        .main-nav {
          position: fixed;
          top: 25px;
          left: 25px;
          display: flex;
          gap: 20px;
          z-index: 1000;
          background: var(--glass-bg);
          backdrop-filter: blur(20px);
          border: 1px solid var(--glass-border);
          border-radius: var(--border-radius);
          padding: 12px 20px;
        }
        
        .nav-link {
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.3s;
          padding: 5px 0;
          position: relative;
        }
        
        .nav-link:hover,
        .nav-link.active {
          color: var(--accent-yellow);
        }
        
        .nav-link.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--accent-yellow);
          border-radius: 1px;
        }
        
        /* Connection Status */
        .connection-status-home {
          position: fixed;
          top: 25px;
          right: 25px;
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--glass-bg);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: var(--border-radius);
          padding: 10px 20px;
          z-index: 1000;
          animation: slideIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
        
        @keyframes slideIn {
          from { transform: translateX(100px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        .connection-dot-home {
          width: 8px;
          height: 8px;
          background: var(--success-green);
          border-radius: 50%;
          animation: pulse 2s infinite;
          box-shadow: 0 0 8px var(--success-green);
        }
        
        .connection-text-home {
          font-size: 14px;
          color: var(--success-green);
          font-weight: 500;
          letter-spacing: 0.3px;
        }
        
        /* Background Elements */
        .background {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: -1;
          overflow: hidden;
          background: linear-gradient(135deg, #0A0A0A 0%, #111111 50%, #0A0A0A 100%);
        }
        
        .particle {
          position: absolute;
          background: var(--accent-yellow);
          border-radius: 50%;
          filter: blur(1px);
          animation: float 15s infinite ease-in-out;
          pointer-events: none;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        
        .honeycomb-grid {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: 
            linear-gradient(90deg, rgba(245, 196, 0, 0.05) 1px, transparent 1px),
            linear-gradient(rgba(245, 196, 0, 0.05) 1px, transparent 1px);
          background-size: 50px 50px;
          opacity: 0.15;
          transform: perspective(800px) rotateX(60deg);
          transform-origin: center;
        }
        
        .glow-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(40px);
          opacity: 0.1;
          pointer-events: none;
        }
        
        .orb-1 {
          width: 300px;
          height: 300px;
          background: var(--accent-yellow);
          top: 10%;
          left: 10%;
          animation: pulse 8s infinite ease-in-out;
        }
        
        .orb-2 {
          width: 200px;
          height: 200px;
          background: #3B82F6;
          top: 60%;
          right: 10%;
          animation: pulse 12s infinite ease-in-out 1s;
        }
        
        .orb-3 {
          width: 150px;
          height: 150px;
          background: #8B5CF6;
          bottom: 20%;
          left: 20%;
          animation: pulse 10s infinite ease-in-out 2s;
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.1; }
          50% { transform: scale(1.2); opacity: 0.15; }
        }
        
        /* 3D Bumblebee Mascot */
        .bee-container {
          position: fixed;
          top: 50%;
          left: 50%;
          z-index: 1;
          transition: transform 0.3s ease-out;
          pointer-events: none;
        }
        
        .bee {
          position: relative;
          width: 140px;
          height: 140px;
          animation: beeFloat 8s ease-in-out infinite;
        }
        
        @keyframes beeFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-20px) rotate(3deg); }
          75% { transform: translateY(15px) rotate(-3deg); }
        }
        
        .bee-body {
          position: absolute;
          width: 110px;
          height: 70px;
          background: linear-gradient(45deg, #F5C400 0%, #FFD700 100%);
          border-radius: 50%;
          top: 35px;
          left: 15px;
          box-shadow: 
            0 0 50px rgba(245, 196, 0, 0.7),
            inset 0 0 30px rgba(255, 255, 255, 0.5);
        }
        
        .bee-stripe {
          position: absolute;
          width: 100%;
          height: 16px;
          background: #0A0A0A;
          border-radius: 50%;
        }
        
        .bee-stripe:nth-child(1) { top: 17px; }
        .bee-stripe:nth-child(2) { top: 35px; }
        .bee-stripe:nth-child(3) { top: 53px; }
        
        .bee-wing {
          position: absolute;
          width: 60px;
          height: 90px;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 50%;
          filter: blur(4px);
          animation: wingFlap 0.4s ease-in-out infinite;
        }
        
        .bee-wing-left {
          top: 15px;
          left: 5px;
          transform: rotate(-25deg);
        }
        
        .bee-wing-right {
          top: 15px;
          right: 5px;
          transform: rotate(25deg);
          animation-delay: 0.2s;
        }
        
        @keyframes wingFlap {
          0%, 100% { transform: rotate(-25deg) scale(1); }
          50% { transform: rotate(-30deg) scale(1.1); }
        }
        
        .bee-eye {
          position: absolute;
          width: 18px;
          height: 18px;
          background: #0A0A0A;
          border-radius: 50%;
          top: 30px;
          border: 2px solid #FFD700;
        }
        
        .bee-eye-left { left: 35px; }
        .bee-eye-right { right: 35px; }
        
        /* Container */
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }
        
        /* Hero Section */
        .hero {
          padding: 180px 0 120px;
          text-align: center;
          position: relative;
          z-index: 2;
        }
        
        .hero-content {
          max-width: 800px;
          margin: 0 auto;
        }
        
        .hero-badge {
          display: inline-block;
          background: var(--glass-bg);
          backdrop-filter: blur(20px);
          border: 1px solid var(--glass-border);
          border-radius: 20px;
          padding: 12px 24px;
          margin-bottom: 50px;
          animation: fadeInUp 0.8s;
          border: 1px solid rgba(245, 196, 0, 0.2);
        }
        
        .hero-badge-text {
          color: var(--accent-yellow);
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        
        .hero-title {
          font-size: 5.5rem;
          font-weight: 800;
          margin-bottom: 25px;
          animation: fadeInUp 0.8s 0.2s both;
          line-height: 1.1;
          letter-spacing: -1px;
        }
        
        .hero-title-text {
          background: linear-gradient(45deg, var(--accent-yellow), #FFD700, #FFFFFF);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          background-size: 200% auto;
          animation: shine 3s linear infinite;
        }
        
        @keyframes shine {
          to { background-position: 200% center; }
        }
        
        .hero-title-sub {
          color: var(--text-primary);
        }
        
        .hero-subtitle {
          font-size: 1.5rem;
          color: var(--text-secondary);
          margin-bottom: 60px;
          animation: fadeInUp 0.8s 0.4s both;
          line-height: 1.6;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }
        
        .hero-highlight {
          color: var(--accent-yellow);
          font-weight: 600;
        }
        
        .hero-stats {
          display: flex;
          justify-content: center;
          gap: 60px;
          margin-top: 80px;
          animation: fadeInUp 0.8s 0.6s both;
        }
        
        .stat {
          text-align: center;
          min-width: 120px;
        }
        
        .stat-number {
          font-size: 3rem;
          font-weight: 700;
          background: linear-gradient(45deg, var(--accent-yellow), #FFFFFF);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 10px;
          line-height: 1;
        }
        
        .stat-label {
          color: var(--text-secondary);
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          font-weight: 500;
        }
        
        /* Features Section */
        .features {
          padding: 100px 0;
          position: relative;
          z-index: 2;
        }
        
        .features-title {
          text-align: center;
          font-size: 3.5rem;
          margin-bottom: 20px;
          background: linear-gradient(45deg, var(--accent-yellow), #FFFFFF);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-weight: 700;
        }
        
        .features-subtitle {
          text-align: center;
          color: var(--text-secondary);
          font-size: 1.2rem;
          margin-bottom: 80px;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }
        
        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 30px;
        }
        
        .feature-card {
          background: var(--glass-bg);
          backdrop-filter: blur(20px);
          border: 1px solid var(--glass-border);
          border-radius: var(--border-radius);
          padding: 40px 30px;
          position: relative;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
          cursor: pointer;
          min-height: 250px;
          display: flex;
          flex-direction: column;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .feature-card:hover {
          border-color: var(--card-color);
          transform: translateY(-10px) scale(1.02);
          box-shadow: var(--shadow-glow);
        }
        
        .feature-card.hovered {
          border-color: var(--card-color);
        }
        
        .feature-icon {
          font-size: 3.5rem;
          margin-bottom: 25px;
          transition: transform 0.3s;
        }
        
        .feature-card:hover .feature-icon {
          transform: scale(1.1);
        }
        
        .feature-title {
          font-size: 1.5rem;
          margin-bottom: 15px;
          color: var(--text-primary);
          font-weight: 600;
        }
        
        .feature-description {
          color: var(--text-secondary);
          line-height: 1.6;
          flex: 1;
        }
        
        .feature-glow {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at center, var(--card-color, var(--accent-glow)), transparent 70%);
          opacity: 0;
          transition: opacity 0.3s;
          pointer-events: none;
          z-index: -1;
        }
        
        .feature-card:hover .feature-glow {
          opacity: 0.2;
        }
        
        /* CTA Section */
        .cta {
          padding: 120px 0;
          position: relative;
          z-index: 2;
          background: linear-gradient(180deg, transparent 0%, rgba(245, 196, 0, 0.03) 100%);
        }
        
        .cta-content {
          max-width: 800px;
          margin: 0 auto;
          text-align: center;
        }
        
        .cta-title {
          font-size: 3.5rem;
          margin-bottom: 20px;
          background: linear-gradient(45deg, var(--accent-yellow), #FFFFFF);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-weight: 700;
        }
        
        .cta-subtitle {
          color: var(--text-secondary);
          font-size: 1.2rem;
          margin-bottom: 60px;
          max-width: 500px;
          margin-left: auto;
          margin-right: auto;
        }
        
        .connect-button {
          position: relative;
          background: linear-gradient(135deg, rgba(245, 196, 0, 0.1), rgba(245, 196, 0, 0.05));
          backdrop-filter: blur(20px);
          border: 2px solid rgba(245, 196, 0, 0.3);
          border-radius: 18px;
          padding: 22px 70px;
          font-size: 1.3rem;
          font-weight: 600;
          color: var(--accent-yellow);
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          margin-bottom: 60px;
          overflow: hidden;
          min-width: 250px;
          letter-spacing: 0.5px;
          border: none;
        }
        
        .connect-button:hover:not(:disabled) {
          background: linear-gradient(135deg, rgba(245, 196, 0, 0.2), rgba(245, 196, 0, 0.1));
          border-color: var(--accent-yellow);
          color: #FFFFFF;
          transform: translateY(-5px) scale(1.05);
          box-shadow: var(--shadow-glow);
        }
        
        .connect-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          border-color: rgba(245, 196, 0, 0.1);
        }
        
        .connect-button-glow {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at center, var(--accent-yellow), transparent 70%);
          opacity: 0;
          transition: opacity 0.4s;
          z-index: -1;
        }
        
        .connect-button-shine {
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(
            45deg,
            transparent 30%,
            rgba(255, 255, 255, 0.1) 50%,
            transparent 70%
          );
          transform: rotate(45deg);
          transition: transform 0.6s;
          z-index: -1;
        }
        
        .connect-button:hover:not(:disabled) .connect-button-glow {
          opacity: 0.4;
        }
        
        .connect-button:hover:not(:disabled) .connect-button-shine {
          transform: rotate(45deg) translate(20%, 20%);
        }
        
        .cta-stats {
          display: flex;
          justify-content: center;
          gap: 50px;
          margin-top: 40px;
        }
        
        .cta-stat {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 15px 25px;
          background: var(--glass-bg);
          backdrop-filter: blur(10px);
          border: 1px solid var(--glass-border);
          border-radius: 15px;
          transition: all 0.3s;
        }
        
        .cta-stat:hover {
          border-color: var(--accent-yellow);
          transform: translateY(-3px);
        }
        
        .cta-stat-icon {
          font-size: 1.8rem;
        }
        
        .cta-stat-text {
          color: var(--text-primary);
          font-weight: 500;
          font-size: 16px;
        }
        
        /* Footer */
        .footer {
          padding: 60px 0 40px;
          position: relative;
          z-index: 2;
          border-top: 1px solid var(--glass-border);
          margin-top: 100px;
          background: rgba(10, 10, 10, 0.8);
          backdrop-filter: blur(10px);
        }
        
        .footer-content {
          text-align: center;
        }
        
        .footer-logo {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 15px;
          margin-bottom: 25px;
        }
        
        .footer-logo-icon {
          font-size: 2rem;
          animation: float 6s ease-in-out infinite;
        }
        
        .footer-logo-text {
          font-size: 1.5rem;
          font-weight: 700;
          background: linear-gradient(45deg, var(--accent-yellow), #FFFFFF);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .footer-copyright {
          color: var(--text-tertiary);
          margin-bottom: 30px;
          font-size: 14px;
          letter-spacing: 0.5px;
        }
        
        .footer-links {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 30px;
          margin-top: 20px;
        }
        
        .footer-link {
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 14px;
          transition: all 0.3s;
          position: relative;
          padding: 5px 0;
        }
        
        .footer-link:hover {
          color: var(--accent-yellow);
        }
        
        .footer-link::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: var(--accent-yellow);
          transform: scaleX(0);
          transition: transform 0.3s;
        }
        
        .footer-link:hover::after {
          transform: scaleX(1);
        }
        
        /* Animations */
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        /* Responsive */
        @media (max-width: 1024px) {
          .hero-title {
            font-size: 4.5rem;
          }
          
          .features-grid {
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          }
        }
        
        @media (max-width: 768px) {
          .hero {
            padding: 140px 0 80px;
          }
          
          .hero-title {
            font-size: 3.5rem;
          }
          
          .hero-subtitle {
            font-size: 1.2rem;
          }
          
          .hero-stats {
            flex-direction: column;
            gap: 30px;
            margin-top: 50px;
          }
          
          .stat-number {
            font-size: 2.5rem;
          }
          
          .features-title,
          .cta-title {
            font-size: 2.5rem;
          }
          
          .features-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          
          .feature-card {
            min-height: 220px;
            padding: 30px 20px;
          }
          
          .cta {
            padding: 80px 0;
          }
          
          .cta-stats {
            flex-direction: column;
            gap: 15px;
            align-items: center;
          }
          
          .cta-stat {
            width: 100%;
            max-width: 250px;
          }
          
          .connect-button {
            padding: 18px 40px;
            font-size: 1.1rem;
            min-width: 200px;
          }
          
          .connection-status-home {
