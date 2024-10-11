import Cookies from 'js-cookie'

const redirect = 'https://localhost:5173/callback'

const permissions = [ // will delete unnecessary later
    "user-read-private",               //read/modify private playlists
    "ugc-image-upload",                //update artwork on  gen. playlists
    "playlist-read-private",           // ] both for checking if
    "playlist-read-collaborative",     // ] gen. playlists are there
    "playlist-modify-public",          // } for creating playlists
    "playlist-modify-private",         // }
    "user-top-read",                   //read history to get recommendations
    "user-library-read",               //???
    "user-library-modify"              //???
];

export async function getAccessTokenViaRefreshToken(clientId, clientSecret, refreshToken) { //to fix
    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("grant_type", "refresh_token");
    params.append("refresh_token", refreshToken);

    const result = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {"Authorization": "Basic " +
                btoa(clientId + ":" + clientSecret),
            "Content-Type": "application/x-www-form-urlencoded"},
        body: params
    });
    const { access_token, refresh_token } = await result.json();
    //localStorage.setItem("refreshToken", refresh_token);
    Cookies.set("refreshToken", refresh_token, {expires: 14});
    return access_token;
}

export async function redirectToAuthCodeFlow(clientId) {
    const verifier = generateCodeVerifier(128);
    const challenge = await generateCodeChallenge(verifier);
    localStorage.setItem("verifier", verifier);

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("response_type", "code");
    params.append("redirect_uri", redirect);
    params.append("scope", permissions.join(" "));
    params.append("code_challenge_method", "S256");
    params.append("code_challenge", challenge);


    document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

function generateCodeVerifier(length) {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

async function generateCodeChallenge(codeVerifier) {
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);

    return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

export async function getRefreshToken(clientId, code) {
    const verifier = localStorage.getItem("verifier");

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", redirect);
    params.append("code_verifier", verifier);

    const result = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {"Content-Type": "application/x-www-form-urlencoded"},
        body: params
    });

    const res = await result.json();
    const { refresh_token } = res;
    return refresh_token;
}

export async function fetchProfile(token) {
    const result = await fetch("https://api.spotify.com/v1/me", {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });

    return await result.json();
}

export function populateUI(profile) {
    document.getElementById("login").innerText = profile.display_name;
    document.getElementById("login").setAttribute("href", profile.external_urls.spotify);
}