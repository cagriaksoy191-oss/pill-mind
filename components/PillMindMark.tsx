import type { SVGProps } from "react";

/** Shared vector mark for the brand and every medicine icon. */
export default function PillMindMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 250" fill="none" width="44" height="50" aria-hidden="true" focusable="false" {...props}>
      <g transform="translate(52 10) rotate(24 58 114)">
        <path d="M8 112V60a50 50 0 0 1 100 0v52H8Z" fill="#1b7ec1" />
        <path d="M23 85V61c0-18 11-32 27-37" stroke="#f4fbff" strokeWidth="6.5" strokeLinecap="round" />
        <path d="M11.5 125h93v50a46.5 46.5 0 0 1-93 0v-50Z" stroke="#4ea74b" strokeWidth="6.5" />
        <g stroke="#4ea74b" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M53 128c1 15-7 23-20 27-7 2-14-1-19-4" />
          <path d="M42 151c-2-7-8-10-18-10" />
          <path d="M43 151c-3 11-8 17-15 21" />
          <path d="M44 153c8 11 9 23 4 34" />
          <path d="M63 128c1 14 9 22 24 30" />
          <path d="M76 149c-9 5-13 13-13 23" />
          <path d="M77 150c3 17 0 32-11 45-6 8-10 15-11 23" />
          <path d="M76 174c5 3 9 7 12 13" />
          <path d="M66 195c6 3 10 7 12 12" />
        </g>
        <g fill="#4ea74b">
          <circle cx="24" cy="141" r="5.8" /><circle cx="28" cy="172" r="5.5" />
          <circle cx="48" cy="187" r="6" /><circle cx="87" cy="158" r="5.9" />
          <circle cx="63" cy="172" r="5.1" /><circle cx="88" cy="187" r="5.2" />
          <circle cx="78" cy="207" r="4.6" />
        </g>
      </g>
    </svg>
  );
}
