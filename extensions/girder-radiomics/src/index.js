import panelModule from './panelModule.js';
import init from './init';


export default {
  id: 'com.ohif.girder-radiomics',

  preRegistration({ servicesManager, configuration = {} }) {
    init({ servicesManager, configuration });
  },

  getPanelModule({ servicesManager, commandsManager }) {
    return panelModule({ servicesManager, commandsManager });
  },
};
