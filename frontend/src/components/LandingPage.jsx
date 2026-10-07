import React from 'react';
import { ArrowRight, BrainCircuit, History, ImageUp, Leaf, ScanSearch, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import heroImage from '../assets/hero.png';

const features = [
  [BrainCircuit, 'AI disease detection', 'Analyze leaf imagery with the project’s trained Custom CNN.'],
  [ScanSearch, '38 disease classes', 'Classify common crop diseases and healthy leaf conditions.'],
  [ShieldCheck, 'Explainable AI', 'Inspect the regions that informed a prediction with real Grad-CAM.'],
  [History, 'Prediction history', 'Keep a private, timestamped record of your analyses.'],
];

export default function LandingPage() {
  const { setAuthModalOpen } = useApp();
  const openAuth = () => setAuthModalOpen(true);

  return (
    <main className="landing-page">
      <section className="landing-hero" id="home">
        <div className="landing-copy">
          <div className="landing-eyebrow"><Leaf size={16} /> PlantGuard AI</div>
          <h1>AI-powered plant disease detection for clearer next steps.</h1>
          <p>Upload a clear leaf image to receive a Custom CNN prediction, confidence score, and Grad-CAM explanation—all in one focused workspace.</p>
          <div className="landing-actions">
            <button className="btn btn-primary" onClick={openAuth}>Get started <ArrowRight size={17} /></button>
            <a className="btn btn-secondary" href="#technology">Explore the technology</a>
          </div>
          <p className="landing-note">Academic project prototype · Not a substitute for professional agricultural diagnosis.</p>
        </div>
        <div className="landing-visual" aria-hidden="true">
          <img src={heroImage} alt="" />
          <div className="visual-badge"><ScanSearch size={17} /> 38-class leaf analysis</div>
        </div>
      </section>

      <section className="landing-stats" aria-label="Model highlights">
        <div><strong>38</strong><span>Disease classes</span></div>
        <div><strong>97.35%</strong><span>Test accuracy</span></div>
        <div><strong>224 × 224</strong><span>Input resolution</span></div>
        <div><strong>Custom CNN</strong><span>Deep learning model</span></div>
      </section>

      <section className="landing-section" id="features">
        <span className="section-kicker">Intelligent plant health analysis</span>
        <h2>Designed around evidence, not guesswork.</h2>
        <div className="landing-feature-grid">
          {features.map(([Icon, title, text]) => <article className="landing-feature-card" key={title}><Icon size={22} /><h3>{title}</h3><p>{text}</p></article>)}
        </div>
      </section>

      <section className="landing-section landing-process" id="how-it-works">
        <span className="section-kicker">How it works</span>
        <h2>From leaf image to interpretable result.</h2>
        <div className="process-grid">
          {['Create an account', 'Upload a leaf', 'Run AI analysis', 'Understand the result'].map((item, index) => <div key={item}><b>0{index + 1}</b><h3>{item}</h3><p>{['Securely access your private analysis workspace.', 'Choose one clear, well-focused leaf image.', 'The Custom CNN produces a 38-class prediction.', 'Review confidence, Grad-CAM, and saved history.'][index]}</p></div>)}
        </div>
      </section>

      <section className="landing-section landing-model" id="technology">
        <span className="section-kicker">About the model</span>
        <h2>A purpose-built Custom CNN.</h2>
        <p>224 × 224 input → augmentation → rescaling → Conv2D (32) → Conv2D (64) → Conv2D (128) → Dense (512) → Dropout (0.5) → 38-class output.</p>
        <p>Test-set metrics: 97.35% accuracy, 96.78% precision, 95.97% recall, and 96.27% macro F1-score. These describe test performance, not the confidence of every individual prediction.</p>
        <button className="btn btn-primary" onClick={openAuth}><ImageUp size={17} /> Analyze a leaf</button>
      </section>
    </main>
  );
}
