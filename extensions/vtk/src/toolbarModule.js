import SlabThicknessToolbarComponent from './toolbarComponents/SlabThicknessToolbarComponent';
import VTKMPRToolbarButton from './toolbarComponents/VTKMPRToolbarButton';
import VTKVolumeToolbarButton from './toolbarComponents/VTKVolumeToolbarButton';

const TOOLBAR_BUTTON_TYPES = {
  COMMAND: 'command',
  SET_TOOL_ACTIVE: 'setToolActive',
};

const definitions = [
  // {
  //   id: 'Views',
  //   label: 'Views',
  //   icon: 'view-multi',
  //   context: 'ACTIVE_VIEWPORT::CORNERSTONE',
  //   //
  //   buttons: [
  //     {
  //       id: 'Axial',
  //       label: 'Axial',
  //       icon: 'axis-z',
  //       //
  //       type: TOOLBAR_BUTTON_TYPES.COMMAND,
  //       commandName: 'axialView',
  //       commandOptions: {},
  //     },
  //     {
  //       id: 'Sagittal',
  //       label: 'Sagittal',
  //       icon: 'axis-x',
  //       //
  //       type: TOOLBAR_BUTTON_TYPES.COMMAND,
  //       commandName: 'sagittalView',
  //       commandOptions: {},
  //     },
  //     {
  //       id: 'Coronal',
  //       label: 'Coronal',
  //       icon: 'axis-y',
  //       //
  //       type: TOOLBAR_BUTTON_TYPES.COMMAND,
  //       commandName: 'coronalView',
  //       commandOptions: {},
  //     },
  //   ],
  // },
  // {
  //   id: 'Crosshairs',
  //   label: 'Crosshairs',
  //   icon: 'crosshairs',
  //   //
  //   type: TOOLBAR_BUTTON_TYPES.SET_TOOL_ACTIVE,
  //   commandName: 'enableCrosshairsTool',
  //   commandOptions: {},
  //   context: 'ACTIVE_VIEWPORT::VTK',
  // },
  // {
  //   id: 'WWWC',
  //   label: 'WWWC',
  //   icon: 'level',
  //   //
  //   type: TOOLBAR_BUTTON_TYPES.SET_TOOL_ACTIVE,
  //   commandName: 'enableLevelTool',
  //   commandOptions: {},
  //   context: 'ACTIVE_VIEWPORT::VTK',
  // },
  // {
  //   id: 'Reset',
  //   label: 'Reset',
  //   icon: 'reset',
  //   //
  //   type: TOOLBAR_BUTTON_TYPES.COMMAND,
  //   commandName: 'resetMPRView',
  //   commandOptions: {},
  //   context: 'ACTIVE_VIEWPORT::VTK',
  // },
  /*
  {
    id: 'Rotate',
    label: 'Rotate',
    icon: '3d-rotate',
    //
    type: TOOLBAR_BUTTON_TYPES.SET_TOOL_ACTIVE,
    commandName: 'enableRotateTool',
    commandOptions: {},
  },
  */
  /*
  {
    id: 'setBlendModeToComposite',
    label: 'Disable MIP',
    icon: 'times',
    //
    type: TOOLBAR_BUTTON_TYPES.COMMAND,
    commandName: 'setBlendModeToComposite',
    commandOptions: {},
  },
  {
    id: 'setBlendModeToMaximumIntensity',
    label: 'Enable MIP',
    icon: 'soft-tissue',
    //
    type: TOOLBAR_BUTTON_TYPES.COMMAND,
    commandName: 'setBlendModeToMaximumIntensity',
    commandOptions: {},
  },

  {
    id: 'increaseSlabThickness',
    label: 'Increase Slab Thickness',
    icon: 'caret-up',
    //
    type: TOOLBAR_BUTTON_TYPES.COMMAND,
    commandName: 'increaseSlabThickness',
    commandOptions: {},
  },
  {
    id: 'decreaseSlabThickness',
    label: 'Decrease Slab Thickness',
    icon: 'caret-down',
    //
    type: TOOLBAR_BUTTON_TYPES.COMMAND,
    commandName: 'decreaseSlabThickness',
    commandOptions: {},
  },
  */
  // {
  //   id: 'changeSlabThickness',
  //   label: 'Slab Thickness',
  //   icon: 'soft-tissue',
  //   CustomComponent: SlabThicknessToolbarComponent,
  //   context: 'ACTIVE_VIEWPORT::VTK',
  //   commandName: 'setSlabThickness',
  //   actionButton: {
  //     id: 'setSlabThickness',
  //     label: 'slider',
  //     type: TOOLBAR_BUTTON_TYPES.COMMAND,
  //     commandName: 'setSlabThickness',
  //     commandOptions: {},
  //   },
  //   deactivateButton: {
  //     id: 'setBlendModeToComposite',
  //     type: TOOLBAR_BUTTON_TYPES.SET_TOOL_ACTIVE,
  //     commandName: 'setBlendModeToComposite',
  //     commandOptions: {},
  //   },
  //   operationButtons: [
  //     {
  //       id: 'setBlendModeToMaximumIntensity',
  //       label: 'MIP',
  //       type: TOOLBAR_BUTTON_TYPES.SET_TOOL_ACTIVE,
  //       commandName: 'setBlendModeToMaximumIntensity',
  //       commandOptions: {},
  //     },
  //     {
  //       id: 'setBlendModeToMinimumIntensity',
  //       label: 'MinIP',
  //       type: TOOLBAR_BUTTON_TYPES.SET_TOOL_ACTIVE,
  //       commandName: 'setBlendModeToMinimumIntensity',
  //       commandOptions: {},
  //     },
  //     {
  //       id: 'setBlendModeToAverageIntensity',
  //       label: 'AvgIP',
  //       type: TOOLBAR_BUTTON_TYPES.SET_TOOL_ACTIVE,
  //       commandName: 'setBlendModeToAverageIntensity',
  //       commandOptions: {},
  //     },
  //   ],
  // },
  {
    id: '2DMPR',
    label: '2D MPR',
    icon: 'cube',
    //
    CustomComponent: VTKMPRToolbarButton,
    type: TOOLBAR_BUTTON_TYPES.COMMAND,
    commandName: 'mpr2d',
    context: 'ACTIVE_VIEWPORT::CORNERSTONE',
  },
  {
    id: '3DView',
    label: '3D View',
    icon: 'cube-colorblue',
    //
    CustomComponent: VTKVolumeToolbarButton,
    type: TOOLBAR_BUTTON_TYPES.COMMAND,
    commandName: 'volume3d',
    context: 'ACTIVE_VIEWPORT::CORNERSTONE',
  },
];

export default {
  definitions,
  //defaultContext: 'ACTIVE_VIEWPORT::VTK',
};
