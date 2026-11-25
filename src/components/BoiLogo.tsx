interface BoiLogoProps {
  className?: string;
}

export function BoiLogo({ className = 'h-7 w-7' }: BoiLogoProps) {
  return (
    <svg
      viewBox="0 0 512 512"
      aria-hidden="true"
      className={`shrink-0 rounded-lg ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="512" height="512" rx="112" fill="#1D63ED" />
      <g transform="translate(80 96)">
        <path
          d="M22 46H8V270H150L164 284H188L202 270H344V46H330"
          stroke="#FFFFFF"
          strokeWidth="20"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
        <path
          d="M36 22C82 28 128 42 164 68V250C128 228 82 216 36 210V22Z"
          fill="#FFFFFF"
        />
        <path
          d="M316 22C270 28 224 42 188 68V250C224 228 270 216 316 210V22Z"
          fill="#FFFFFF"
        />
        <path
          d="M232 34L276 26V138L254 118L232 138V34Z"
          fill="#1D63ED"
        />
        <path
          d="M242 32L266 28V118L254 107L242 118V32Z"
          fill="#FFFFFF"
        />
      </g>
    </svg>
  );
}
