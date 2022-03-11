import csTools from 'cornerstone-tools';
import DICOMSegTempCrosshairsTool from './tools/DICOMSegTempCrosshairsTool';

/**
 *
 * @param {object} configuration
 * @param {Object|Array} configuration.csToolsConfig
 */
export default function init({ servicesManager, configuration = {} }) {
  const {
    BrushTool,
    SphericalBrushTool,
    CorrectionScissorsTool,
    CircleScissorsTool,
    FreehandScissorsTool,
    RectangleScissorsTool,
  } = csTools;

  const tools = [
    BrushTool,
    SphericalBrushTool,
    CorrectionScissorsTool,
    CircleScissorsTool,
    FreehandScissorsTool,
    RectangleScissorsTool,
  ];

  tools.forEach(tool => csTools.addTool(tool));

  csTools.addTool(BrushTool, {
    name: 'BrushEraser',
    configuration: {
      alwaysEraseOnClick: true,
    },
  });
  csTools.addTool(CircleScissorsTool, {
    name: 'CircleScissorsEraser',
    defaultStrategy: 'ERASE_INSIDE',
  });
  csTools.addTool(FreehandScissorsTool, {
    name: 'FreehandScissorsEraser',
    defaultStrategy: 'ERASE_INSIDE',
  });
  csTools.addTool(RectangleScissorsTool, {
    name: 'RectangleScissorsEraser',
    defaultStrategy: 'ERASE_INSIDE',
  });

  csTools.addTool(DICOMSegTempCrosshairsTool);
}
