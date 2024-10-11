import * as tokenHandler from './token-handler.js'

const clientId = "c51c8fdaa8434884896fee43825e36c0";
const clientSecret = "1b2fde74a4b543abaae0d258ae500ee3";

tokenHandler.redirectToAuthCodeFlow(clientId);

window.location.replace('/');