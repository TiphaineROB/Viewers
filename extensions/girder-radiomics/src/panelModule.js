import GirderRadiomicsPanel from './components/GirderRadiomicsPanel.js';

const panelModule = ({ commandsManager }) => {
  return {
    menuOptions: [
      {
        icon: 'list',
        label: 'Girder Radiomics',
        from: 'right',
        target: 'girder-radiomics-panel',
      },
    ],
    components: [
      {
        id: 'girder-radiomics-panel',
        component: GirderRadiomicsPanel,
      },
    ],
    defaultContext: ['VIEWER'],
  };
};

export default panelModule;
