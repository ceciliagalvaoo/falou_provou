import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

/**
 * The documentation lives under /docs, so the site root can be a front page
 * that states the golden rule before anything else. Everything that used to
 * sit at the root is redirected below rather than silently 404'd.
 */
const config: Config = {
  title: 'Falou e Provou',
  tagline: 'Anyone can claim. The chain proves.',
  favicon: 'img/favicon.svg',

  future: {
    v4: true,
  },

  url: 'https://ceciliagalvaoo.github.io',
  baseUrl: '/falou_provou/',

  organizationName: 'ceciliagalvaoo',
  projectName: 'falou_provou',
  deploymentBranch: 'gh-pages',
  trailingSlash: false,

  onBrokenLinks: 'throw',
  onBrokenAnchors: 'throw',

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  // The product is Brazilian and its users read Portuguese. The bounty is
  // judged on a global listing and its write-up is English. So the site is
  // both, and the reader picks in the navbar rather than being guessed at.
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'pt-BR'],
    localeConfigs: {
      en: {label: 'English', htmlLang: 'en'},
      'pt-BR': {label: 'Português', htmlLang: 'pt-BR'},
    },
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: 'docs',
          editUrl: 'https://github.com/ceciliagalvaoo/falou_provou/tree/master/docs/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    [
      '@docusaurus/plugin-client-redirects',
      {
        // These eight pages were the whole site before it was reorganised into
        // categories. Links to them are already out in the world, so they keep
        // working rather than becoming a 404 for the sake of a tidier tree.
        redirects: [
          {from: '/architecture', to: '/docs/how-it-works/architecture'},
          {from: '/security', to: '/docs/how-it-works/security'},
          {from: '/user-flows', to: '/docs/using-it/user-flows'},
          {from: '/deployment', to: '/docs/using-it/deployment'},
          {from: '/reproducibility', to: '/docs/using-it/reproducibility'},
          {from: '/validation', to: '/docs/evidence/validation'},
          {from: '/limitations', to: '/docs/evidence/bugs-found'},
          {from: '/intro', to: '/docs/intro'},
        ],
      },
    ],
  ],

  themeConfig: {
    colorMode: {
      // The product is ink on cream. The documentation follows it rather than
      // defaulting to a dark theme that would misrepresent the thing it
      // describes, but a reader who has asked their system for dark gets it.
      defaultMode: 'light',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Falou e Provou',
      logo: {
        alt: 'Falou e Provou',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          href: 'https://falou-provou.onrender.com',
          label: 'Landing page',
          position: 'right',
        },
        {
          href: 'https://t.me/falouprovou_bot',
          label: 'Message the bot',
          position: 'right',
        },
        {
          href: 'https://github.com/ceciliagalvaoo/falou_provou',
          label: 'GitHub',
          position: 'right',
        },
        {
          type: 'localeDropdown',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'light',
      links: [
        {
          title: 'Understand',
          items: [
            {label: 'Overview', to: '/docs/intro'},
            {label: 'The context', to: '/docs/context'},
            {label: 'The golden rule', to: '/docs/how-it-works/the-golden-rule'},
            {label: 'Architecture', to: '/docs/how-it-works/architecture'},
          ],
        },
        {
          title: 'Verify',
          items: [
            {label: 'Security & custody', to: '/docs/how-it-works/security'},
            {label: 'Real-world validation', to: '/docs/evidence/validation'},
            {label: 'Bugs found & fixed', to: '/docs/evidence/bugs-found'},
          ],
        },
        {
          title: 'Use',
          items: [
            {label: 'User flows', to: '/docs/using-it/user-flows'},
            {label: 'Deployment', to: '/docs/using-it/deployment'},
            {label: 'Reproducibility', to: '/docs/using-it/reproducibility'},
          ],
        },
        {
          title: 'Project',
          items: [
            {label: 'Landing page', href: 'https://falou-provou.onrender.com'},
            {label: 'GitHub repository', href: 'https://github.com/ceciliagalvaoo/falou_provou'},
            {label: 'Cecília Galvão (@ceciliagalvaoo)', href: 'https://github.com/ceciliagalvaoo'},
            {label: 'Pablo Azevedo (@zzaved)', href: 'https://github.com/zzaved'},
          ],
        },
      ],
      copyright:
        'Falou e Provou: built for the Superteam Brasil bounty "Build Solana-native plugins for Zeroclaw."',
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
