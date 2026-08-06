import React from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Mark from '@site/src/components/ink/Mark';
import Lockup from '@site/src/components/ink/Lockup';
import BrushStroke from '@site/src/components/ink/BrushStroke';
import TallyMarks from '@site/src/components/ink/TallyMarks';
import styles from './index.module.css';

/**
 * The front page opens with the three states, because that is the whole
 * product argument: a claim is registered, a source is queried, and only the
 * source can stamp it. Everything below is a route into the documentation,
 * one card per top-level thing a reader could want.
 */

const ROUTES = [
  {
    to: '/docs/intro',
    eyebrow: 'Start here',
    title: 'What this is',
    body:
      'The agent, the two Telegram bots, the two rails, and a map of everything else on this site.',
  },
  {
    to: '/docs/how-it-works/the-golden-rule',
    eyebrow: 'The rule',
    title: 'FALOU, PROVOU, NÃO PROVOU',
    body:
      'The three states, what earns each one, and why the rule is enforced by deterministic scripts rather than by asking a model nicely.',
  },
  {
    to: '/docs/how-it-works/architecture',
    eyebrow: 'How it is built',
    title: 'Architecture',
    body:
      'SOPs, skills, maintenance jobs, the Solana rail and the Pix rail, and where each one draws its trust boundary.',
  },
  {
    to: '/docs/how-it-works/security',
    eyebrow: 'The custody',
    title: 'Security, and real attacks',
    body:
      'Three custody patterns, a live prompt-injection campaign against the running agent, and the model swap that broke the golden rule once.',
  },
  {
    to: '/docs/evidence/validation',
    eyebrow: 'The evidence',
    title: 'Real mainnet, real money',
    body:
      'Actual signatures on Solana mainnet-beta you can open in a block explorer, not a devnet screenshot, and not a simulation.',
  },
  {
    to: '/docs/using-it/reproducibility',
    eyebrow: 'Run your own',
    title: 'Reproducibility',
    body:
      'Everything needed to stand this up on another machine, including the one hardcoded path and the script that rewrites it.',
  },
];

const STATES = [
  {
    tag: 'FALOU',
    tagClass: styles.falouTag,
    body:
      'Someone alleged it, including the owner, typing it in by hand. Registered immediately, and weightless on its own.',
  },
  {
    tag: 'PROVOU',
    tagClass: styles.provouTag,
    body:
      'A confirmed signature read directly off Solana, or a transaction read directly off the real bank statement. The only state nobody can fake.',
  },
  {
    tag: 'NÃO PROVOU',
    tagClass: styles.naoTag,
    body:
      'Claimed, and the source was actually checked and did not confirm it, a stronger, more specific statement than “we could not check.”',
  },
];

const BOTS = [
  {
    img: 'img/qr-dono.svg',
    handle: '@falouprovou_bot',
    href: 'https://t.me/falouprovou_bot',
    role: 'Owner, billing, subscriptions, Pix',
    alt: 'QR code linking to the owner bot on Telegram, @falouprovou_bot',
  },
  {
    img: 'img/qr-contador.svg',
    handle: '@falouprovou_contador_bot',
    href: 'https://t.me/falouprovou_contador_bot',
    role: 'Accountant, read-only dossier',
    alt: 'QR code linking to the accountant bot on Telegram, @falouprovou_contador_bot',
  },
];

function Bot({bot}: {bot: (typeof BOTS)[number]}): React.ReactElement {
  return (
    <div className={styles.qrCard}>
      <img src={useBaseUrl(bot.img)} alt={bot.alt} width={220} height={220} />
      <span className={styles.qrLabel}>
        <span className={styles.qrRole}>{bot.role}</span>
        <Link className={styles.qrHandle} to={bot.href}>
          {bot.handle}
        </Link>
      </span>
    </div>
  );
}

export default function Home(): React.ReactElement {
  return (
    <Layout
      title="Anyone can claim. The chain proves."
      description="Falou e Provou: an operator-hosted ZeroClaw agent that bills in USDC on Solana and Pix in BRL, and never records anything it did not verify at the source."
    >
      <header className={styles.hero}>
        <BrushStroke variant={3} className={styles.strokeTop} />
        <BrushStroke variant={4} className={styles.strokeBottom} />

        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <span className={styles.badge}>
              <span className={styles.dot} /> Live on Solana mainnet-beta · running 24/7
            </span>

            <h1>
              <Lockup />
            </h1>

            <p className={styles.claim}>Anyone can claim. The chain proves.</p>

            <p className={styles.lead}>
              An operator-hosted <Link to="https://github.com/zeroclaw-labs/zeroclaw">ZeroClaw</Link>{' '}
              agent that bills in two rails, USDC on Solana and Pix in Brazilian reais, and
              refuses to record anything it cannot independently verify at the source. This is its
              documentation: the architecture, the custody model, the attacks it survived, and the
              real mainnet signatures behind every claim on this page.
            </p>

            <div className={styles.actions}>
              <Link className={styles.primary} to="/docs/intro">
                Read the documentation
              </Link>
              <Link className={styles.secondary} to="https://falou-provou.onrender.com">
                Visit the landing page
              </Link>
            </div>

            <p className={styles.byline}>
              <TallyMarks count={2} />
              Built by Cecília Galvão and Pablo Azevedo for the Superteam Brasil ZeroClaw bounty.
            </p>
          </div>

          <div className={styles.heroMark}>
            <Mark size={240} title="Falou e Provou: a claw holding a proof seal" />
            <p className={styles.markCaption}>
              A claw holding a seal. Only the seal can stamp an entry, and only the source can
              hand over the seal.
            </p>
          </div>
        </div>
      </header>

      <section className={styles.states}>
        <div className={styles.statesInner}>
          <span className={styles.eyebrow}>The golden rule</span>
          <h2 className={styles.sectionTitle}>Three states. No fourth way to prove anything.</h2>
          <div className={styles.stateGrid}>
            {STATES.map((state) => (
              <div key={state.tag} className={styles.stateCard}>
                <span className={`${styles.stateName} ${state.tagClass}`}>{state.tag}</span>
                <p className={styles.stateBody}>{state.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <main className={styles.main}>
        <div className={styles.grid}>
          {ROUTES.map((route) => (
            <Link key={route.to} to={route.to} className={styles.card}>
              <span className={styles.cardEyebrow}>{route.eyebrow}</span>
              <h2 className={styles.cardTitle}>{route.title}</h2>
              <p className={styles.cardBody}>{route.body}</p>
            </Link>
          ))}
        </div>
      </main>

      <section className={styles.bots}>
        <div className={styles.botsInner}>
          <span className={styles.eyebrow}>Try it yourself</span>
          <h2 className={styles.sectionTitle}>Both bots are live right now.</h2>
          <div className={styles.qrGrid}>
            {BOTS.map((bot) => (
              <Bot key={bot.handle} bot={bot} />
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
