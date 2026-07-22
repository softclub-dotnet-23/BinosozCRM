import { useState } from "react";
import { Building2, ChartNoAxesCombined, UsersRound } from "lucide-react";
import type { LoginStrings } from "./loginTranslations";

const FEATURE_ICONS = [Building2, UsersRound, ChartNoAxesCombined];

interface LoginVisualPanelProps {
  strings: LoginStrings;
}

/**
 * Falls back to a crafted SVG scene in the same mood if the login photograph
 * fails to load, so a broken asset never leaves the panel blank.
 */
function HeroFallback() {
  return (
    <svg
      viewBox="0 0 800 1000"
      preserveAspectRatio="xMidYMid slice"
      className="login-visual__image"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2b2440" />
          <stop offset="38%" stopColor="#7a3d3a" />
          <stop offset="62%" stopColor="#e08a3e" />
          <stop offset="100%" stopColor="#8a5a2e" />
        </linearGradient>
        <radialGradient id="sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffd58a" stopOpacity="0.95" />
          <stop offset="60%" stopColor="#ff9d4d" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#ff9d4d" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="1000" fill="url(#sky)" />
      <circle cx="560" cy="330" r="150" fill="url(#sun)" />
      <circle cx="560" cy="330" r="46" fill="#ffe3b0" opacity="0.9" />

      {/* distant skyline */}
      <g opacity="0.35" fill="#1a1420">
        <rect x="0" y="560" width="70" height="260" />
        <rect x="80" y="600" width="55" height="220" />
        <rect x="640" y="580" width="60" height="240" />
        <rect x="710" y="620" width="70" height="200" />
      </g>

      {/* unfinished building under construction */}
      <g fill="#15111b">
        <rect x="180" y="420" width="300" height="400" />
        {Array.from({ length: 6 }).map((_, row) =>
          Array.from({ length: 5 }).map((_, col) => (
            <rect
              key={`w-${row}-${col}`}
              x={200 + col * 56}
              y={440 + row * 60}
              width="34"
              height="38"
              fill="#2b2440"
              opacity="0.6"
            />
          )),
        )}
        {/* rebar sticking out of the unfinished top floor */}
        {Array.from({ length: 10 }).map((_, i) => (
          <rect key={`rebar-${i}`} x={190 + i * 30} y="384" width="4" height="40" fill="#3a3040" />
        ))}
      </g>

      {/* tower crane */}
      <g stroke="#12101a" strokeWidth="6" fill="none" strokeLinecap="round">
        <line x1="120" y1="900" x2="120" y2="160" />
        <line x1="120" y1="160" x2="560" y2="160" />
        <line x1="120" y1="160" x2="70" y2="200" />
        <line x1="150" y1="180" x2="120" y2="360" />
        <line x1="150" y1="180" x2="360" y2="200" />
        <line x1="420" y1="165" x2="420" y2="330" />
        <line x1="80" y1="500" x2="160" y2="500" />
        <line x1="90" y1="640" x2="150" y2="640" />
      </g>

      {/* ground */}
      <rect x="0" y="900" width="800" height="100" fill="#0f0c14" opacity="0.9" />
    </svg>
  );
}

/**
 * Real HTML text/icons rendered on top of a plain photo (no baked-in text),
 * so every string here re-localizes instantly with the rest of the form
 * instead of being frozen inside a flattened marketing image.
 */
export function LoginVisualPanel({ strings }: LoginVisualPanelProps) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <section className="login-visual" aria-label={strings.welcomeTitle}>
      {imageFailed ? (
        <HeroFallback />
      ) : (
        <img
          className="login-visual__image"
          src="/images/construction-login-v2.png"
          alt=""
          aria-hidden="true"
          onError={() => setImageFailed(true)}
        />
      )}

      <div className="login-visual__overlay" aria-hidden="true" />

      <div className="login-visual__content">
        <div className="login-visual__brand">
          <img src="/images/binosoz-mark.svg" alt="" className="login-visual__logo" />
          <div>
            <p className="login-visual__brand-name">BINOSOZ</p>
            <p className="login-visual__brand-tag">Construction Management CRM</p>
          </div>
        </div>

        <div className="login-visual__heading">
          <h1>{strings.headline}</h1>
          <p>{strings.subheadline}</p>
        </div>

        <div className="login-visual__features">
          {strings.features.map((feature, i) => {
            const Icon = FEATURE_ICONS[i];
            return (
              <div key={feature.title} className="login-visual__feature">
                <div className="login-visual__feature-icon">
                  <Icon size={18} />
                </div>
                <div>
                  <p className="login-visual__feature-title">{feature.title}</p>
                  <p className="login-visual__feature-desc">{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        <p className="login-visual__copyright">{strings.copyright}</p>
      </div>
    </section>
  );
}
