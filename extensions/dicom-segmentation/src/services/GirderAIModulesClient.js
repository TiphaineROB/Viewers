import axios from 'axios';

export default class GirderAIModulesClient {
  constructor(server_url) {
    this.server_url = new URL(server_url);
  }

  async info() {

    let url = new URL('aimodulesOHIF', this.server_url);
    return await GirderAIModulesClient.api_get(url.toString(), {});
  }

  async segmentation(params) {
    let url = new URL('aimodulesOHIF/segmentation', this.server_url);
    return await GirderAIModulesClient.api_post(url.toString(), params);
  }

  async callback(params) {
    let url = new URL('aimodulesOHIF/callback', this.server_url);
    return await GirderAIModulesClient.api_post(url.toString(), params);
  }

  // async get_radiomics(params){
  //   let url = new URL('radiomicsOHIF', this.server_url);
  //   return await GirderRadiomicsClient.api_post(
  //     url.toString(),
  //     params,
  //   );
  // }

  static api_get(url, params) {
    console.debug('GET:: ' + url);
    //console.debug(params)
    return axios
      .get(url, {params: params})
      .then(function(response) {
        console.debug(response);
        return response;
      })
      .catch(function(error) {
        return error;
      })
      .finally(function() {});
  }

  static api_post(url, params) {
    console.debug('POST:: ' + url);
    //console.debug(params)
    return axios
      .post(url, null, {params: params})
      .then(function(response) {
        console.debug(response);
        return response;
      })
      .catch(function(error) {
        return error;
      })
      .finally(function() {});
  }


  static api_delete(url) {
    console.debug('DELETE:: ' + url);
    return axios
      .delete(url)
      .then(function(response) {
        console.debug(response);
        return response;
      })
      .catch(function(error) {
        return error;
      })
      .finally(function() {});
  }

}
