import GirderRadiomicsPanel from './components/GirderRadiomicsPanel.js';
import GirderDiagnosisPanel from './components/GirderAIModules_Diagnosis.js'

const panelModule = ({ commandsManager }) => {
  return {
    menuOptions: [
      {
        icon: 'list',
        label: 'Girder Radiomics',
        from: 'right',
        target: 'girder-radiomics-panel',
      },
      {
        icon: 'list',
        label: 'Patient Diagnosis',
        from: 'right',
        target: 'girder-aimodules-diagnosis',
      },
    ],
    components: [
      {
        id: 'girder-radiomics-panel',
        component: GirderRadiomicsPanel,
      },
      {
        id: 'girder-aimodules-diagnosis',
        component: GirderDiagnosisPanel,
      },
    ],
    defaultContext: ['VIEWER'],
  };
};

export default panelModule;
