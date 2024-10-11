import * as tokenHandler from "./token-handler.js"
import { log } from "./main.js"
import Cookies from 'js-cookie'

const clientId = "c51c8fdaa8434884896fee43825e36c0";
const clientSecret = "1b2fde74a4b543abaae0d258ae500ee3"; //damn free secret for a free API yippee

async function fetchWebApi(endpoint, method, body) {
    const res = await fetch(`https://api.spotify.com/${endpoint}`, {
        headers: {
            //Authorization: `Bearer ${await tokenHandler.getAccessTokenViaRefreshToken(clientId, clientSecret, localStorage.getItem("refreshToken"))}`,
            Authorization: `Bearer ${await tokenHandler.getAccessTokenViaRefreshToken(clientId, clientSecret, Cookies.get("refreshToken"))}`,
        },
        method,
        body:JSON.stringify(body)
    });
    return await res.json();
}

export async function getUserPlaylists() {
    return (await fetchWebApi(
        'v1/me/playlists', 'GET'
    )).items;
}

async function getTopTracks(limit){
    // Endpoint reference : https://developer.spotify.com/documentation/web-api/reference/get-users-top-artists-and-tracks
    return (await fetchWebApi(
        `v1/me/top/tracks?time_range=short_term&limit=${limit.toString()}`, 'GET'
    )).items;
}

async function createPlaylist(tracksUri, playlistName){
    const { id: user_id } = await fetchWebApi('v1/me', 'GET')
    const playlist = await fetchWebApi(
        `v1/users/${user_id}/playlists`, 'POST', {
            "name": playlistName,
            "description": "Daily/generated recommendations playlist",
            "public": false
        })

    await fetchWebApi(
        `v1/playlists/${playlist.id}/tracks?uris=${tracksUri.join(',')}`,
        'POST'
    );

    return playlist;
}

async function getRecommendations(topTracksIds, limit){
    // Endpoint reference : https://developer.spotify.com/documentation/web-api/reference/get-recommendations
    return (await fetchWebApi(
        `v1/recommendations?limit=${limit}&seed_tracks=${topTracksIds.join(',')}`, 'GET'
    )).tracks;
}

async function getSnapshot(playlistId) {
    return (await fetchWebApi(`v1/playlists/${playlistId}`, 'GET')).snapshot_id;
}

async function refreshRecommendations(tracksUri, playlistId) {
    const playlistTracks = (await fetchWebApi(`v1/playlists/${playlistId}/tracks`, "GET")).items;
    let playlistTracksUri = [];
    playlistTracks.forEach((track) => {
        playlistTracksUri.push({"uri" : track.track.uri});
    });
    await fetchWebApi(`v1/playlists/${playlistId}/tracks`, 'DELETE', {
        "tracks": playlistTracksUri,
        "snapshot_id": await getSnapshot(playlistId)
    })
    await fetchWebApi(`v1/playlists/${playlistId}/tracks`, 'POST', {
        "uris": tracksUri
    })
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        let temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

export async function generateRecommendations(amount, playlistName, type) {
    if(type == 1) {
        log("generating " + amount.toString() + " tracks...");
    } else {
        log("generating " + amount.toString() + ' "shuffled" tracks...');
    }
    const topTracks = await getTopTracks(amount);
    let topTracksIds = [];
    log("fetched top tracks...");
    topTracks.forEach((track) => {
        topTracksIds.push(track.id);
    });
    if(type == 2) {
        shuffle(topTracks);
    }
    const recommendedTracks = [];
    for (let i = 0; i < amount; i += 5) {
        const recommended = await getRecommendations(topTracksIds.slice(i, i + 5), 5);
        recommended.forEach((track) => {
            recommendedTracks.push(track);
        })
    }
    let tracksUri = [];
    recommendedTracks.forEach((track) => {
        tracksUri.push(track.uri);
    })
    log("fetched recommendations, adding to playlist...");
    const playlists = await getUserPlaylists();
    let playlistPresent = "";
    playlists.forEach((playlist) => {
        if (playlist.name == playlistName)
            playlistPresent = playlist;
    })
    if (playlistPresent) {
        log("found existing playlist, refreshing...");
        await refreshRecommendations(tracksUri, playlistPresent.id);
    } else {
        log("creating the recommendations playlist...");
        await createPlaylist(tracksUri, playlistName);
    }
    log("generated recommendations");
    return true;
}