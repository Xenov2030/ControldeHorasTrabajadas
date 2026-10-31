import { CREATOR, portfolioLink } from "../lib/branding.mjs";
import Icon from "./icon";
export default function CreatorCredit() {
  const href = portfolioLink(CREATOR.portfolioUrl);
  return href && CREATOR.name ? (
    <a
      className="creator-credit"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Portfolio de ${CREATOR.name} (abre en otra pestaña)`}
    >
      <span className="creator-mark" aria-hidden="true">
        ✦
      </span>
      <span>
        Hecho por <strong>{CREATOR.name}</strong>
      </span>
      <Icon name="arrow" size={13} />
    </a>
  ) : null;
}
