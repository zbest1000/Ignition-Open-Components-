import { ComponentRegistry } from '@inductiveautomation/perspective-client';

import { MANIFEST } from './core/manifest';
import { makeMeta } from './core/meta';
import { INDUSTRIAL_BEHAVIORS } from './industrial';
import { registerBuiltInThemes } from './themes';

import './css/styles.css';

export { TEMPLATES } from './templates';
export { BUILT_IN_THEMES } from './themes';

registerBuiltInThemes();

// The manifest is the single list of components; a row's behaviour, if it has one, is looked up by id.
MANIFEST.forEach(row => ComponentRegistry.register(makeMeta(row, INDUSTRIAL_BEHAVIORS[row.id])));
