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

const time = label => {
    if(settings && settings.timeLog){
        console.time(label);
    }
};

const timeEnd = label => {
    if(settings && settings.timeLog){
        console.timeEnd(label);
    }
};

const setupPromise = setup();

db.collection("settings").doc("settings").onSnapshot(async doc => {
    await procNewSettings(doc.data());
});

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

    time("function");

    time("setup");
    // ensure we've setup before running
    await setupPromise;
    timeEnd("setup");

    let {path, dest} = request.query;

    const hasPath = request.query.path !== undefined;

    time("validate");
    if((!hasPath || validatePath(path)) && validateDest(dest)){
        timeEnd("validate");
        if(!settings.allowDuplicateDestinations) {
            time("duplicateDestCalc");
            const matchingDestDocs = await db.collection("urls").where("dest", "==", dest).get();

            if (!matchingDestDocs.empty) {
                return response.status(400).json({
                    errors: ["dest already exists"],
                    path: matchingDestDocs.docs[0].data().path
                });
            }
            timeEnd("duplicateDestCalc");
        }

        if(!hasPath) path = getRandPath();

        // find other entries with the same path
        let isValidPath = false;
        let isExactlyTheSame = false;

        time("pathLoopTotal");
        do{
            time("pathLoop");
            // make a new path if we don't have one
            // look up the docs with the same path

            // eslint-disable-next-line no-await-in-loop
            const matchingPathDocs = await db.collection("urls").where("path", "==", path).get();

            isValidPath = matchingPathDocs.empty;

            isExactlyTheSame = !matchingPathDocs.empty && matchingPathDocs.docs[0].data().dest === dest;

            if(!isValidPath && !isExactlyTheSame){
                path = getRandPath();
            }
            timeEnd("pathLoop");
        }while(!isValidPath && !isExactlyTheSame);
        timeEnd("pathLoopTotal");

        path = path.toLowerCase();

        time("sameCheck");
        if(!isExactlyTheSame) await db.collection("urls").doc().set({path, dest, createdAt: admin.firestore.FieldValue.serverTimestamp()});
        timeEnd("sameCheck");

        timeEnd("function");
        return response.json({errors: null, path});
    }else{
        console.log(validatePath(path), validateDest(dest));
        return returnError(["bad path or dest"]);
    }
});
