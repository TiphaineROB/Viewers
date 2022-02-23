const commandsModule = ({ servicesManager }) => {
  const { UINotificationService } = servicesManager.services;

  const GirderRadiomicsMessage = (message, type = 'success', debug = true) => {
    if (debug) {
      console.debug('Girder Radiomics - ' + message);
    }
    if (UINotificationService) {
      UINotificationService.show({
        title: 'Girder Radiomics',
        message: message,
        type: type,
      });
    }
  };

  const actions = {
    segmentation: ({ model_name }) => {
      GirderRadiomicsMessage('Running segmentation API with ' + model_name);
    },
    radiomics: ({ model_name }) => {
      GirderRadiomicsMessage('Running radiomics extraction API');
    },
  };

  const definitions = {
    segmentation: {
      commandFn: actions.segmentation,
      storeContexts: ['viewports'],
      options: {},
    },
    radiomics: {
      commandFn: actions.deepgrow,
      storeContexts: ['viewports'],
      options: {},
    },
  };

  return {
    definitions,
    defaultContext: 'ACTIVE_VIEWPORT::CORNERSTONE',
  };
};

export default commandsModule;
