import { ComponentMeta, ComponentRegistry } from '@inductiveautomation/perspective-client';
import { registerBuiltInThemes } from './themes';

// Universal
import { EChartMeta }              from './components/EChart';

// Basic 2D
import { LineChartMeta }           from './components/LineChart';
import { BarChartMeta }            from './components/BarChart';
import { PieChartMeta }            from './components/PieChart';
import { ScatterChartMeta }        from './components/ScatterChart';
import { EffectScatterChartMeta }  from './components/EffectScatterChart';

// KPI / proportion
import { GaugeChartMeta }          from './components/GaugeChart';
import { FunnelChartMeta }         from './components/FunnelChart';

// Financial / statistical
import { CandlestickChartMeta }    from './components/CandlestickChart';
import { BoxplotChartMeta }        from './components/BoxplotChart';
import { HeatmapChartMeta }        from './components/HeatmapChart';

// Hierarchy
import { TreeChartMeta }           from './components/TreeChart';
import { TreemapChartMeta }        from './components/TreemapChart';
import { SunburstChartMeta }       from './components/SunburstChart';

// Relations / flow
import { GraphChartMeta }          from './components/GraphChart';
import { SankeyChartMeta }         from './components/SankeyChart';

// Specialty 2D
import { RadarChartMeta }          from './components/RadarChart';
import { ParallelChartMeta }       from './components/ParallelChart';
import { ThemeRiverChartMeta }     from './components/ThemeRiverChart';
import { CalendarChartMeta }       from './components/CalendarChart';
import { PictorialBarChartMeta }   from './components/PictorialBarChart';
import { CustomChartMeta }         from './components/CustomChart';
import { GraphicChartMeta }        from './components/GraphicChart';
import { DatasetChartMeta }        from './components/DatasetChart';

// Geo / map 2D
import { MapChartMeta }            from './components/MapChart';
import { LinesChartMeta }          from './components/LinesChart';

// 3D charts (echarts-gl)
import { Bar3DChartMeta }          from './components/Bar3DChart';
import { Line3DChartMeta }         from './components/Line3DChart';
import { Scatter3DChartMeta }      from './components/Scatter3DChart';
import { SurfaceChartMeta }        from './components/SurfaceChart';
import { Map3DChartMeta }          from './components/Map3DChart';
import { GlobeChartMeta }          from './components/GlobeChart';
import { Lines3DChartMeta }        from './components/Lines3DChart';
import { Polygons3DChartMeta }     from './components/Polygons3DChart';

// WebGL-accelerated 2D (echarts-gl)
import { ScatterGLChartMeta }      from './components/ScatterGLChart';
import { GraphGLChartMeta }        from './components/GraphGLChart';
import { FlowGLChartMeta }         from './components/FlowGLChart';

// Industrial — core
import { IndustrialTrendMeta }     from './components/IndustrialTrend';
import { IndustrialOEEMeta }       from './components/IndustrialOEE';
import { IndustrialParetoMeta }    from './components/IndustrialPareto';
import { IndustrialSPCMeta }       from './components/IndustrialSPC';

// Industrial — scheduling & timelines
import { IndustrialStateTimelineMeta }     from './components/IndustrialStateTimeline';
import { IndustrialGanttMeta }             from './components/IndustrialGantt';
import { IndustrialScheduleCalendarMeta }  from './components/IndustrialScheduleCalendar';
import { IndustrialShiftCalendarMeta }     from './components/IndustrialShiftCalendar';
import { IndustrialDowntimeTrackerMeta }   from './components/IndustrialDowntimeTracker';
import { IndustrialBatchTimelineMeta }     from './components/IndustrialBatchTimeline';
import { IndustrialResourceHeatmapMeta }   from './components/IndustrialResourceHeatmap';

export { TEMPLATES } from './templates';
export { BUILT_IN_THEMES } from './themes';

import './css/styles.css';

registerBuiltInThemes();

const components: Array<ComponentMeta> = [
    // Universal
    new EChartMeta(),
    // Basic 2D
    new LineChartMeta(),
    new BarChartMeta(),
    new PieChartMeta(),
    new ScatterChartMeta(),
    new EffectScatterChartMeta(),
    // KPI
    new GaugeChartMeta(),
    new FunnelChartMeta(),
    // Financial / statistical
    new CandlestickChartMeta(),
    new BoxplotChartMeta(),
    new HeatmapChartMeta(),
    // Hierarchy
    new TreeChartMeta(),
    new TreemapChartMeta(),
    new SunburstChartMeta(),
    // Relations
    new GraphChartMeta(),
    new SankeyChartMeta(),
    // Specialty 2D
    new RadarChartMeta(),
    new ParallelChartMeta(),
    new ThemeRiverChartMeta(),
    new CalendarChartMeta(),
    new PictorialBarChartMeta(),
    new CustomChartMeta(),
    new GraphicChartMeta(),
    new DatasetChartMeta(),
    // Geo 2D
    new MapChartMeta(),
    new LinesChartMeta(),
    // 3D
    new Bar3DChartMeta(),
    new Line3DChartMeta(),
    new Scatter3DChartMeta(),
    new SurfaceChartMeta(),
    new Map3DChartMeta(),
    new GlobeChartMeta(),
    new Lines3DChartMeta(),
    new Polygons3DChartMeta(),
    // GL-accelerated
    new ScatterGLChartMeta(),
    new GraphGLChartMeta(),
    new FlowGLChartMeta(),
    // Industrial — core
    new IndustrialTrendMeta(),
    new IndustrialOEEMeta(),
    new IndustrialParetoMeta(),
    new IndustrialSPCMeta(),
    // Industrial — scheduling & timelines
    new IndustrialStateTimelineMeta(),
    new IndustrialGanttMeta(),
    new IndustrialScheduleCalendarMeta(),
    new IndustrialShiftCalendarMeta(),
    new IndustrialDowntimeTrackerMeta(),
    new IndustrialBatchTimelineMeta(),
    new IndustrialResourceHeatmapMeta(),
];

components.forEach((c: ComponentMeta) => ComponentRegistry.register(c));
