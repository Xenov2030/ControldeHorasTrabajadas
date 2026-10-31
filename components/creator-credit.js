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
      <span className="creator-copy">
        <span>
          JornadApp es propiedad de <strong>{CREATOR.name}</strong>.
        </span>
        <small>
          © {CREATOR.copyrightYear} {CREATOR.name}. Todos los derechos
          reservados.
        </small>
        <span className="creator-portfolio">
          Creado por {CREATOR.name} · Ver portfolio
        </span>
      </span>
      <Icon name="arrow" size={13} />
    </a>
  ) : null;
}
