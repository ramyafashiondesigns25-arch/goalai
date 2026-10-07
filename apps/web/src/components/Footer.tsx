import Link from "next/link";
import { GoalaiMark } from "@goalai/core/components/Logo";
import { SITE } from "@goalai/core/lib/site";

export function Footer({ whatsapp }: { whatsapp: string }) {
  return (
    <>
      <footer>
        <div className="wrap">
          <span className="fbrand"><GoalaiMark id="gmk-f" /><span>© {new Date().getFullYear()} Goalai · {SITE.locality}</span></span>
          <span>
            <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link> · <Link href="/track">Track order</Link> · <Link href="/account">My account</Link>
          </span>
        </div>
      </footer>
      <a className="wa-float" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener" aria-label="Chat on WhatsApp">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.3.5-.4.5c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.1 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.6-.1l2 .9c.3.1.5.2.5.3.1.2.1.7-.1 1.3Z" /></svg>
      </a>
    </>
  );
}
