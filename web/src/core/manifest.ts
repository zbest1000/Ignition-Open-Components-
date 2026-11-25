import manifest from '../../../common/src/main/resources/components.manifest.json';
import type { ChartManifestEntry } from '../chartDef';

/** Every component of the module, from the manifest shared with the Java descriptors. */
export const MANIFEST: ChartManifestEntry[] = manifest.components;
