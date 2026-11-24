import type { ComponentMeta, PComponent, PropertyTree } from '@inductiveautomation/perspective-client';

import type { ChartBehavior, ChartManifestEntry } from '../chartDef';
import { ChartConfig, ChartProps, OpenEChartComponent } from './EChartComponent';

/**
 * Reads the props shared by every chart. The names and defaults are part of
 * the saved-view format: do not rename them.
 */
function readSharedProps(tree: PropertyTree, defaultOption: object): ChartProps {
    return {
        option:           tree.read('option', defaultOption),
        theme:            tree.readString('theme', ''),
        renderer:         tree.readString('renderer', 'canvas'),
        autoResize:       tree.readBoolean('autoResize', true),
        resizeDebounceMs: tree.readNumber('resizeDebounceMs', 150),
        notMerge:         tree.readBoolean('notMerge', false),
        lazyUpdate:       tree.readBoolean('lazyUpdate', true),
        showLoading:      tree.readBoolean('showLoading', false),
        loadingOptions:   tree.read('loadingOptions', {}),
        sanitizeTooltip:  tree.readBoolean('sanitizeTooltip', true),
        ariaLabel:        tree.readString('ariaLabel', ''),
        maps:             tree.read('maps', {}),
    };
}

/**
 * Builds the Perspective registration for one manifest row.
 *
 * @param behavior  for components that derive their option from domain props.
 *                  The props reducer only reads those props; the option is
 *                  built inside the component, where a failure can be shown.
 */
export function makeMeta(row: ChartManifestEntry, behavior?: ChartBehavior): ComponentMeta {
    const defaultOption = behavior ? {} : row.defaultOption || {};
    const config: ChartConfig = { cssClass: row.cssClass, gl: row.gl === true, behavior, defaultOption };
    const size = { width: row.size.width, height: row.size.height };

    class ManifestChart extends OpenEChartComponent {
        static displayName = row.metaName;
        protected readonly config = config;
    }

    return {
        getComponentType: () => row.id,
        getViewComponent: () => ManifestChart as PComponent,
        getDefaultSize: () => ({ ...size }),
        getPropsReducer: (tree: PropertyTree): ChartProps => {
            const props = readSharedProps(tree, defaultOption);
            if (behavior) props.domain = behavior.readProps(tree);
            return props;
        },
    };
}
