import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Falou e Provou',
  tagline: 'An agent that only records what it can actually prove',
  favicon: 'img/logo.svg',

  future: {
    v4: true,
  },

  url: 'https://ceciliagalvaoo.github.io',
  baseUrl: '/falou_provou/',

  organizationName: 'ceciliagalvaoo',
  projectName: 'falou_provou',
  deploymentBranch: 'gh-pages',
  trailingSlash: false,

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
          editUrl: 'https://github.com/ceciliagalvaoo/falou_provou/tree/master/docs/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
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
          href: 'https://github.com/ceciliagalvaoo/falou_provou',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {label: 'Overview', to: '/'},
            {label: 'Architecture', to: '/architecture'},
            {label: 'User flows', to: '/user-flows'},
            {label: 'Security', to: '/security'},
          ],
        },
        {
          title: 'Project',
          items: [
            {label: 'GitHub repository', href: 'https://github.com/ceciliagalvaoo/falou_provou'},
          ],
        },
        {
          title: 'Authors',
          items: [
            {label: 'Cecília Galvão (@ceciliagalvaoo)', href: 'https://github.com/ceciliagalvaoo'},
            {label: 'Pablo Azevedo (@zzaved)', href: 'https://github.com/zzaved'},
          ],
        },
      ],
      copyright: `Falou e Provou — Superteam Brasil, Build Solana-native plugins for Zeroclaw.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
