import Image from "next/image";

export default function BrandLogo({ tone = "auto" }) {
  const alt = "JornadApp · Tu tiempo bien contado";
  return (
    <span className={`brand-mark brand-mark--${tone}`}>
      <Image
        className="brand-mark-light"
        src="/brand/jornadapp-light.png"
        alt={alt}
        loading="eager"
        width={2208}
        height={736}
        sizes="(max-width: 640px) 190px, 300px"
      />
      <Image
        className="brand-mark-dark"
        src="/brand/jornadapp-dark.png"
        alt={alt}
        loading="eager"
        width={2208}
        height={736}
        sizes="(max-width: 640px) 190px, 300px"
      />
    </span>
  );
}
