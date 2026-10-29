// Aleksandr Akimov, the shift foreman who gives the control-room briefing (owner, 2026-10-29: the illustrated prototype): white coat,
// the flat white cap from the show, one hand raised. He bobs and blinks, his mouth moves while his words type out, and
// mirrored he gestures the other way. Purely decorative; the briefing's text carries the meaning.
export default function TutorialEngineer({ talking, flip = false, className = "" }: { talking: boolean; flip?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 170 240" aria-hidden="true" className={`block ${className}`} style={flip ? { transform: "scaleX(-1)" } : undefined}>
      <ellipse cx="80" cy="233" rx="46" ry="5" fill="rgba(0,0,0,0.35)" />
      <g className="cr-eng-bob">
        {/* Legs and shoes */}
        <rect x="58" y="176" width="19" height="52" rx="5" fill="#e4e0d4" stroke="#9d978a" strokeWidth="2" />
        <rect x="83" y="176" width="19" height="52" rx="5" fill="#e4e0d4" stroke="#9d978a" strokeWidth="2" />
        <path d="M52 224h26v9H48q0-9 4-9z" fill="#26231f" />
        <path d="M82 224h26q4 0 4 9H82z" fill="#26231f" />
        {/* Arm at his side */}
        <path d="M50 102 Q38 142 44 176" fill="none" stroke="#9d978a" strokeWidth="19" strokeLinecap="round" />
        <path d="M50 102 Q38 142 44 176" fill="none" stroke="#f6f4ec" strokeWidth="15" strokeLinecap="round" />
        <circle cx="44" cy="182" r="7" fill="#efc19c" />
        {/* Coat: collar, shirt, buttons, pocket with a dosimeter pen, and his pass */}
        <path d="M46 98 Q80 86 114 98 L120 190 Q80 198 40 190 Z" fill="#f6f4ec" stroke="#9d978a" strokeWidth="2" />
        <path d="M68 92 L80 110 L92 92 Z" fill="#4d6275" />
        <path d="M64 90 L80 112 L96 90" fill="none" stroke="#9d978a" strokeWidth="2" />
        <line x1="80" y1="112" x2="80" y2="192" stroke="#cdc8ba" strokeWidth="2" />
        <circle cx="85" cy="124" r="2.2" fill="#8d887c" />
        <circle cx="85" cy="144" r="2.2" fill="#8d887c" />
        <circle cx="85" cy="164" r="2.2" fill="#8d887c" />
        <rect x="92" y="126" width="16" height="15" rx="2" fill="#efece2" stroke="#b5afa2" strokeWidth="1.5" />
        <rect x="98" y="114" width="4.5" height="18" rx="2" fill="#3d3d3b" />
        <rect x="55" y="124" width="16" height="11" rx="1.5" fill="#d9c37c" stroke="#a48f4e" strokeWidth="1" />
        {/* Raised arm, an open hand */}
        <g className="cr-eng-wave">
          <path d="M110 104 Q130 94 140 77" fill="none" stroke="#9d978a" strokeWidth="19" strokeLinecap="round" />
          <path d="M110 104 Q130 94 140 77" fill="none" stroke="#f6f4ec" strokeWidth="15" strokeLinecap="round" />
          <path d="M141 63 L139 56 M145 61 L145 53 M149 61 L151 54 M152 65 L156 60 M139 70 L134 66" stroke="#c9906c" strokeWidth="6" strokeLinecap="round" />
          <circle cx="145" cy="69" r="8.6" fill="#c9906c" />
          <path d="M141 63 L139 56 M145 61 L145 53 M149 61 L151 54 M152 65 L156 60 M139 70 L134 66" stroke="#efc19c" strokeWidth="4" strokeLinecap="round" />
          <circle cx="145" cy="69" r="7.6" fill="#efc19c" />
        </g>
        {/* Head */}
        <rect x="72" y="78" width="16" height="16" fill="#e2ad88" />
        <circle cx="58" cy="60" r="5" fill="#e8b590" />
        <circle cx="102" cy="60" r="5" fill="#e8b590" />
        <ellipse cx="80" cy="58" rx="22" ry="25" fill="#f2c7a3" />
        {/* Flat white cap */}
        <path d="M57 46 L55 32 Q80 28 105 32 L103 46 Q80 42 57 46 Z" fill="#fdfcf7" stroke="#9d978a" strokeWidth="2" />
        <ellipse cx="80" cy="32" rx="25" ry="3.5" fill="#f3f1e9" stroke="#9d978a" strokeWidth="2" />
        <path d="M57 46 Q80 42 103 46 L103 49 Q80 45 57 49 Z" fill="#e2ddcf" />
        <path d="M68 35 Q69 40 68 45 M92 35 Q91 40 92 45" fill="none" stroke="#e6e2d6" strokeWidth="1.5" />
        {/* Brows, eyes, nose, moustache, mouth */}
        <path d="M66 54 l9 -2 M85 52 l9 2" stroke="#5a3e2b" strokeWidth="2.4" strokeLinecap="round" />
        <g className="cr-eng-blink" fill="#2a211b">
          <ellipse cx="71" cy="60" rx="2.4" ry="3" />
          <ellipse cx="89" cy="60" rx="2.4" ry="3" />
        </g>
        <path d="M80 62 q-3 7 0 9" fill="none" stroke="#d29b78" strokeWidth="2" strokeLinecap="round" />
        <path d="M69 73 Q80 66 91 73 Q80 77 69 73 Z" fill="#6b4a33" />
        <ellipse className={talking ? "cr-eng-talk" : undefined} cx="80" cy="78.5" rx="4" ry="1.6" fill="#7a3b2e" />
      </g>
    </svg>
  )
}
