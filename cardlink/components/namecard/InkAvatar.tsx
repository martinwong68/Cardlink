import { getAvatarInitials } from "./utils";

type InkAvatarProps = {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
};

export default function InkAvatar({
  name,
  src,
  size = 96,
  className = "",
}: InkAvatarProps) {
  const initials = getAvatarInitials(name);
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        boxShadow: "0 0 0 2px var(--paper-elevated, #fafbfc)",
      }}
      aria-label={`${name} 的頭像`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center text-white"
          style={{
            background: "var(--avatar-fallback)",
            fontFamily: "var(--ink-font-display)",
            fontWeight: 600,
            fontSize: size >= 90 ? 28 : 18,
          }}
        >
          {initials}
        </div>
      )}
    </div>
  );
}
