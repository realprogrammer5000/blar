const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp({
 credential: admin.credential.cert(functions.config().creds),
 databaseURL: "https://blar-url-shortener.firebaseio.com"
});
const db = admin.firestore();

exports.render = functions.https.onRequest(async (request, response) => {
 const url = new URL(request.url, "https://example.org");
 const path = url.pathname.split("/").join("");

 const doc = await db.collection("urls").doc(path).get();
 const data = doc.data();
 console.log(path);

 if(data && data.path) {
  response.redirect(302, doc.data().path);
 }else{
  response.status(500).end("Internal server error");
 }
});
