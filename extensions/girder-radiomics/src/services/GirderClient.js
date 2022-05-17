import axios from 'axios';

export default class GirderClient {
  constructor(server_url) {
    this.server_url = new URL(server_url);
  }

  async info(params) {

    let url = new URL('radiomicsOHIF', this.server_url);
    return await GirderClient.api_get(url.toString(), params);
  }

  async infoDiagnosisPanel(params) {

    let url = new URL('aimodulesOHIF', this.server_url);
    return await GirderClient.api_get(url.toString(), params);
  }

  async get_radiomics(params){
    let url = new URL('radiomicsOHIF', this.server_url);
    return await GirderClient.api_post(
      url.toString(),
      params,
    );
  }

  async diagnosis(params) {
    let url = new URL('aimodulesOHIF/diagnosis', this.server_url);
    return await GirderClient.api_post(url.toString(), params);
  }

  // async downloadItem(params, idItem) {
  //   let url = new URL('item/'+idItem+'/download', this.server_url);
  //   return await GirderClient.api_get(url.toString());
  // }
  async downloadItem(params) {
    let url = new URL('radiomicsOHIF/download', this.server_url);
    return await GirderClient.api_get(url.toString(params));
  }

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
