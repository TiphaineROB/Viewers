import init from './init';


export default {
  id: 'com.ohif.authentication-form',

  preRegistration({ servicesManager, configuration = {} }) {
    init({ servicesManager, configuration });
  },
};
