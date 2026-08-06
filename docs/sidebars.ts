import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

/**
 * Two documents at the top, then four categories. The split is meant to be
 * mutually exclusive and collectively exhaustive: what the thing is, how it is
 * built, how you operate it, what proves it works, and what the project itself
 * is made of. Nothing belongs in two places, and nothing is left over.
 *
 * The order is also an argument. "How it works" opens with the golden rule
 * rather than with the architecture, because every architectural decision in
 * this project exists to serve that rule.
 */
const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    'context',
    {
      type: 'category',
      label: 'How it works',
      collapsed: false,
      items: [
        'how-it-works/the-golden-rule',
        'how-it-works/architecture',
        'how-it-works/security',
      ],
    },
    {
      type: 'category',
      label: 'Using it',
      collapsed: false,
      items: [
        'using-it/user-flows',
        'using-it/deployment',
        'using-it/reproducibility',
      ],
    },
    {
      // Kept apart from "How it works" on purpose: a design decision and the
      // evidence that the decision survived contact with real money are two
      // different kinds of claim, and readers come looking for them separately.
      type: 'category',
      label: 'Evidence',
      collapsed: false,
      items: ['evidence/validation', 'evidence/bugs-found'],
    },
    {
      type: 'category',
      label: 'Project',
      collapsed: false,
      items: ['project/design-system', 'project/team'],
    },
  ],
};

export default sidebars;
