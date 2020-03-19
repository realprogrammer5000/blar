const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp({
    credential: admin.credential.cert(functions.config().creds),
    databaseURL: "https://blar-url-shortener.firebaseio.com"
});
const db = admin.firestore();

let settings;


const validatePath = path => typeof path === "string" && path.length > 0 && path.length < settings.maxPathLength;
const validateDest = url => {
    try {
        if (typeof url !== "string") return false;
        if(url.length > settings.maxUrlLength) return false;
        if(url.includes(" ")) return false;
        const urlObj = new URL(url);
        if (!["http:", "https:"].includes(urlObj.protocol)) return false;
        return !settings.forbiddenSites.includes(urlObj.hostname);
    }catch(e){
        return false;
    }
};

const setup = async () => {
    const settingsDoc = await db.collection("settings").doc("settings").get();
    const settings = settingsDoc.data();
    await procNewSettings(settings);
};

const setupPromise = setup();

db.collection("settings").doc("settings").onSnapshot(doc => procNewSettings(doc.data()));

const procNewSettings = async newSettings => {
    settings = newSettings;
};

// exports.updateList = functions.https.onRequest(async (request, response) => db.collection("settings").doc("settings").set({forbiddenSites: require("fs").readFileSync("/home/max/Documents/node-projects/vpn/filtered").toString().split("\n")}, {merge: true}));

exports.render = functions.https.onRequest(async (request, response) => {
    // ensure we've setup before running
    await setupPromise;

    const url = new URL(request.url, "https://example.org");
    const path = url.pathname.split("/").join("");

    const snapshot = await db.collection("urls").where("path", "==", path).get();
    let data;
    snapshot.forEach(snap => {
        data = snap.data();
    });

    if(!snapshot.empty && data && data.path && data.dest) {
        response.redirect(settings.httpRedirectCode, data.dest);
    }else{
        response.status(500).end("Internal server error");
    }
});

const getRandLetterArray = (arr, len) => (new Array(len)).fill(0).map(() => arr[Math.floor(Math.random() * arr.length)]);

const getRandPath = (finalLength = 1) => getRandLetterArray(settings.allowedConsonantLetters, 2).concat(getRandLetterArray(settings.allowedVowelLetters, 1)).concat(getRandLetterArray(settings.allowedConsonantLetters, finalLength)).join("");

exports.shortenUrl = functions.https.onRequest(async (request, response) => {
    const returnError = errors => response.status(400).json({errors});

    // ensure we've setup before running
    await setupPromise;

    let {path, dest} = request.query;

    const hasPath = request.query.path !== undefined;

    if((!hasPath || validatePath(path)) && validateDest(dest)){
        if(!settings.allowDuplicateDestinations) {
            const matchingDestDocs = await db.collection("urls").where("dest", "==", dest).get();

            if (!matchingDestDocs.empty) {
                return response.status(400).json({
                    errors: ["dest already exists"],
                    path: matchingDestDocs.docs[0].data().path
                });
            }
        }

        if(!hasPath) path = getRandPath();

        // find other entries with the same path
        let isValidPath = false;
        do{
            // make a new path if we don't have one
            // look up the docs with the same path

            // eslint-disable-next-line no-await-in-loop
            const matchingPathDocs = await db.collection("urls").where("path", "==", path).get();
            isValidPath = matchingPathDocs.empty;

            if(!isValidPath){
                path = getRandPath();
            }
        }while(!isValidPath);

        path = path.toLowerCase();

        await db.collection("urls").doc().set({path, dest, createdAt: admin.firestore.FieldValue.serverTimestamp()});

        return response.json({errors: null, path});
    }else{
        console.log(validatePath(path), validateDest(dest));
        return returnError(["bad path or dest"]);
    }
});
