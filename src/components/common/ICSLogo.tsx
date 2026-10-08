type ICSLogoProps = {
  className?: string;
};

export default function ICSLogo({ className }: ICSLogoProps) {
  return (
    <svg
      aria-label="ICS Digital Twin logo"
      className={className}
      fill="none"
      role="img"
      viewBox="0 0 540 220"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill="currentColor">
        <path d="M139 28 118 77C78 64 48 63 27 72 15 58 20 36 40 25c23-13 58-11 99 3Z" />
        <path d="M28 73c21-9 51-9 89 3L88 129C48 113 20 92 28 73Z" />
        <path d="m120 79 42 21c32 17 52 36 46 51-5 13-25 19-52 17-9-22-36-42-68-57l21-46c4 2 7 4 11 6Z" />
        <path d="m91 132 65 35c10 13 12 27 3 37-17 18-63 15-113 1l21-47 24-26Z" />
      </g>
      <text
        fill="currentColor"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="170"
        fontWeight="800"
        letterSpacing="-8"
        x="230"
        y="174"
      >
        ICS
      </text>
      <circle cx="159" cy="63" r="21" fill="#35DDF4" />
    </svg>
  );
}
