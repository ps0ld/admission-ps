import { Link } from "react-router-dom";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-ink-100 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-6 text-ink-500">
            Admission PS helps students compare colleges and understand admission routes. It gives guidance, not
            guarantees. Always confirm dates, fees and eligibility on the institution&apos;s official website.
          </p>
        </div>
        <div>
          <h2 className="font-display text-base font-semibold">Explore</h2>
          <ul className="mt-3 space-y-2 text-sm text-ink-700">
            <li>
              <Link className="hover:text-peacock-700" to="/explore">
                Explore Colleges
              </Link>
            </li>
            <li>
              <Link className="hover:text-peacock-700" to="/compare">
                Compare Colleges
              </Link>
            </li>
            <li>
              <Link className="hover:text-peacock-700" to="/predictor">
                Admission Predictor
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="font-display text-base font-semibold">Official portals</h2>
          <ul className="mt-3 space-y-2 text-sm text-ink-700">
            <li>
              <a className="hover:text-peacock-700" href="https://josaa.nic.in" target="_blank" rel="noopener noreferrer">
                JoSAA counselling
              </a>
            </li>
            <li>
              <a className="hover:text-peacock-700" href="https://cuet.nta.nic.in" target="_blank" rel="noopener noreferrer">
                CUET UG
              </a>
            </li>
            <li>
              <a className="hover:text-peacock-700" href="https://aishe.gov.in" target="_blank" rel="noopener noreferrer">
                AISHE
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-100 py-4 text-center text-xs text-ink-500">
        © {new Date().getFullYear()} Admission PS
      </div>
    </footer>
  );
}
