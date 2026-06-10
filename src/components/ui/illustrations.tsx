interface IllustrationProps {
  className?: string;
}

export function EmptyVault({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Safe body */}
      <rect
        x="20" y="25" width="80" height="75" rx="8"
        stroke="currentColor" strokeWidth="2"
      />
      {/* Safe door inner border */}
      <rect
        x="28" y="33" width="64" height="59" rx="4"
        stroke="currentColor" strokeWidth="1.5" opacity="0.4"
      />
      {/* Dial circle */}
      <circle
        cx="60" cy="62" r="14"
        stroke="currentColor" strokeWidth="2"
      />
      {/* Dial center dot */}
      <circle cx="60" cy="62" r="2.5" fill="currentColor" opacity="0.5" />
      {/* Dial ticks */}
      <line x1="60" y1="48" x2="60" y2="52" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="60" y1="72" x2="60" y2="76" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="46" y1="62" x2="50" y2="62" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="70" y1="62" x2="74" y2="62" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Handle */}
      <rect
        x="78" y="55" width="8" height="14" rx="3"
        stroke="currentColor" strokeWidth="1.5"
      />
      {/* Keyhole */}
      <circle cx="40" cy="80" r="3" stroke="currentColor" strokeWidth="1.5" />
      <line x1="40" y1="83" x2="40" y2="87" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Top indicator light */}
      <circle cx="60" cy="30" r="2" fill="currentColor" opacity="0.3" />
      {/* Sparkle top-right */}
      <path
        d="M95 18 L97 22 L101 24 L97 26 L95 30 L93 26 L89 24 L93 22 Z"
        fill="currentColor" opacity="0.2"
      />
      {/* Sparkle top-left */}
      <path
        d="M25 15 L26 18 L29 19 L26 20 L25 23 L24 20 L21 19 L24 18 Z"
        fill="currentColor" opacity="0.15"
      />
    </svg>
  );
}

export function EmptyTodo({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Clipboard body */}
      <rect
        x="30" y="22" width="60" height="78" rx="6"
        stroke="currentColor" strokeWidth="2"
      />
      {/* Clipboard clip */}
      <rect
        x="45" y="16" width="30" height="12" rx="4"
        stroke="currentColor" strokeWidth="2"
      />
      {/* Clip circle */}
      <circle cx="60" cy="22" r="3" stroke="currentColor" strokeWidth="1.5" />
      {/* Lines on clipboard */}
      <line x1="42" y1="45" x2="78" y2="45" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      <line x1="42" y1="55" x2="72" y2="55" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      <line x1="42" y1="65" x2="66" y2="65" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      {/* Plus sign in center */}
      <line x1="60" y1="72" x2="60" y2="88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <line x1="52" y1="80" x2="68" y2="80" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

export function EmptyInProgress({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Clock circle */}
      <circle
        cx="60" cy="60" r="32"
        stroke="currentColor" strokeWidth="2"
      />
      {/* Inner circle */}
      <circle
        cx="60" cy="60" r="28"
        stroke="currentColor" strokeWidth="1" opacity="0.2"
      />
      {/* Clock hands */}
      <line x1="60" y1="60" x2="60" y2="40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="60" y1="60" x2="75" y2="65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Center dot */}
      <circle cx="60" cy="60" r="2.5" fill="currentColor" opacity="0.5" />
      {/* Hour marks */}
      <line x1="60" y1="30" x2="60" y2="34" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <line x1="60" y1="86" x2="60" y2="90" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <line x1="30" y1="60" x2="34" y2="60" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <line x1="86" y1="60" x2="90" y2="60" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      {/* Motion lines */}
      <path d="M96 48 Q100 52 96 56" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.25" />
      <path d="M100 44 Q106 52 100 60" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.15" />
    </svg>
  );
}

export function EmptyDone({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Trophy cup */}
      <path
        d="M42 35 H78 V58 C78 72 68 80 60 82 C52 80 42 72 42 58 Z"
        stroke="currentColor" strokeWidth="2" strokeLinejoin="round"
      />
      {/* Trophy handles */}
      <path
        d="M42 42 H32 C32 42 30 42 30 46 C30 52 36 56 42 54"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
      />
      <path
        d="M78 42 H88 C88 42 90 42 90 46 C90 52 84 56 78 54"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
      />
      {/* Trophy base */}
      <line x1="60" y1="82" x2="60" y2="92" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="48" y1="92" x2="72" y2="92" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="46" y="92" width="28" height="6" rx="2" stroke="currentColor" strokeWidth="1.5" />
      {/* Checkmark inside cup */}
      <path
        d="M52 58 L58 64 L70 50"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      />
      {/* Sparkles */}
      <path
        d="M28 28 L30 32 L34 34 L30 36 L28 40 L26 36 L22 34 L26 32 Z"
        fill="currentColor" opacity="0.2"
      />
      <path
        d="M90 22 L91 25 L94 26 L91 27 L90 30 L89 27 L86 26 L89 25 Z"
        fill="currentColor" opacity="0.2"
      />
      <path
        d="M82 75 L83 77 L85 78 L83 79 L82 81 L81 79 L79 78 L81 77 Z"
        fill="currentColor" opacity="0.15"
      />
      {/* Confetti dots */}
      <circle cx="24" cy="50" r="1.5" fill="currentColor" opacity="0.15" />
      <circle cx="96" cy="42" r="1.5" fill="currentColor" opacity="0.15" />
      <circle cx="34" cy="70" r="1" fill="currentColor" opacity="0.1" />
    </svg>
  );
}

export function EmptySearch({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Magnifying glass circle */}
      <circle
        cx="52" cy="52" r="26"
        stroke="currentColor" strokeWidth="2"
      />
      {/* Inner reflection */}
      <path
        d="M38 42 Q42 34 52 34"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.25"
      />
      {/* Handle */}
      <line
        x1="72" y1="72" x2="92" y2="92"
        stroke="currentColor" strokeWidth="3" strokeLinecap="round"
      />
      {/* Handle grip */}
      <line
        x1="86" y1="86" x2="95" y2="95"
        stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.4"
      />
      {/* Question mark inside */}
      <path
        d="M46 46 C46 40 50 38 53 38 C56 38 60 40 60 44 C60 48 54 48 54 52"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      />
      <circle cx="54" cy="58" r="1.5" fill="currentColor" opacity="0.5" />
      {/* Small dots around */}
      <circle cx="22" cy="72" r="1.5" fill="currentColor" opacity="0.15" />
      <circle cx="88" cy="30" r="1.5" fill="currentColor" opacity="0.15" />
      <circle cx="30" cy="88" r="1" fill="currentColor" opacity="0.1" />
    </svg>
  );
}
