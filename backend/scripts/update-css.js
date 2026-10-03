const fs = require('fs');

const CSS_CONTENT = `
.stat-text strong {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--red);
  line-height: 1.1;
}

.stat-text span {
  font-size: 0.8rem;
  color: var(--muted);
  font-weight: 500;
  margin-top: 2px;
}

/* ================================================================
   RESPONSIVE
   ================================================================ */

@media (max-width: 900px) {
  .hero-slide {
    display: flex;
    flex-direction: column;
  }
  .hero-image-wrap {
    position: relative;
    width: 100%;
    height: 45vh;
    min-height: 350px;
    border-radius: 0 0 32px 32px;
    box-shadow: none;
    overflow: hidden;
  }
  .hero-img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .hero-overlay-gradient {
    display: none;
  }
  .hero-copy {
    position: relative;
    max-width: 100%;
    padding: 32px 20px;
    color: var(--ink);
    text-align: center;
    background: #fff;
  }
  .hero-slide h1 {
    color: var(--ink);
    text-shadow: none;
    font-size: 2.2rem;
  }
  .hero-desc {
    color: var(--muted);
  }
  .hero-tagline {
    justify-content: center;
    color: var(--gold);
    font-weight: 700;
  }
  .ht-icon {
    display: none;
  }
  .hero-feature-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin: 24px 0;
    justify-content: center;
  }
  .hero-feature {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    max-width: none;
  }
  .hf-badge {
    background: #fff;
    color: var(--ink);
    border: 1px solid var(--line);
    box-shadow: 0 4px 12px rgba(0,0,0,0.03);
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
  }
  .hf-label {
    color: var(--ink);
    font-size: 0.7rem;
    font-weight: 600;
    margin-top: 8px;
    line-height: 1.2;
  }
  .hero-meta {
    justify-content: center;
    flex-wrap: wrap;
    color: var(--muted);
    font-weight: 600;
    font-size: 0.9rem;
  }
  .hero-meta .hm-item svg {
    color: var(--muted);
  }
  .hero-buttons {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 24px;
  }
  .hero-btn-primary {
    background: var(--red);
    color: #fff;
    width: 100%;
    justify-content: center;
  }
  .hero-btn-secondary {
    border: 1.5px solid var(--red);
    color: var(--red);
    width: 100%;
    justify-content: center;
  }
  .hero-btn-secondary:hover {
    background: var(--red-soft);
  }
  
  .stats-bar {
    margin-top: -10px;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.05);
    border: 1px solid var(--line);
    background: #fff;
    margin-left: 16px;
    margin-right: 16px;
    position: relative;
    z-index: 5;
    padding: 24px 0;
  }
  .stats-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    padding: 0 16px;
  }
  .stat-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  .stat-icon {
    background: var(--red-soft);
    width: 44px;
    height: 44px;
  }
  .stat-icon svg {
    width: 22px;
    height: 22px;
  }
  .stat-text strong {
    font-size: 1.1rem;
  }
  .hero-swipe {
    display: none;
  }
  .hero-arrow {
    display: none;
  }
}

.hero-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 5;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255,255,255,0.15);
  border: 1.5px solid rgba(255,255,255,0.4);
  color: #fff;
  font-size: 1.8rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
}

.hero-arrow:hover {
  background: rgba(255,255,255,0.3);
}

.hero-arrow-prev { left: 24px; }
.hero-arrow-next { right: 24px; }
`;

let lines = fs.readFileSync('frontend/assets/css/hero.css', 'utf8').split('\\n');
lines = lines.slice(0, 521); // Keep everything above line 521
fs.writeFileSync('frontend/assets/css/hero.css', lines.join('\\n') + '\\n' + CSS_CONTENT);
