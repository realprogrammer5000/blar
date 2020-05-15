const settings = {"maxUrlLength":5000,"forbiddenSites":["0rz.tw","1-url.net","126.am","1tk.us","1un.fr","1url.com","1url.cz","1wb2.net","2.gp","2.ht","2doc.net","2fear.com","2tu.us","2ty.in","2u.xf.cz","3ra.be","3x.si","4i.ae","5url.net","5z8.info","6fr.ru","6g6.eu","7.ly","77.ai","7li.in","7vd.cn","8u.cz","944.la","98.to","L9.fr","Lvvk.com","a0.fr","ad-med.cz","ad5.eu","ad7.biz","adb.ug","adf.ly","adfa.st","adfly.fr","adv.li","ajn.me","aka.gr","any.gs","aqva.pl","asso.in","ayt.fr","azali.fr","b00.fr","b23.ru","b54.in","baid.us","bc.vc","bee4.biz","bim.im","bit.do","bit.ly","bitw.in","blap.net","ble.pl","blip.tv","boi.re","bote.me","bougn.at","br4.in","brk.to","brzu.net","bul.lu","bxl.me","bzh.me","cbug.cc","cc.cc","ccj.im","cf2.me","cf6.co","cjb.net","cli.gs","cur.lv","curl.im","cut.pe","cutt.eu","cutt.us","cybr.fr","cyonix.to","daa.pl","dai.ly","dd.ma","dft.ba","doiop.com","dopice.sk","droid.ws","dyo.gs","ecra.se","ely.re","erw.cz","ex9.co","ezurl.cc","fff.re","fff.to","fff.wf","filz.fr","foe.hn","freze.it","fur.ly","gg.gg","goo.gl","hide.my","hjkl.fr","hops.me","href.li","ht.ly","i-2.co","icit.fr","ick.li","icks.ro","iiiii.in","iky.fr","ilix.in","is.gd","isra.li","itm.im","ity.im","ix.sk","j.gs","j.mp","jdem.cz","jp22.net","jqw.de","kask.us","kfd.pl","korta.nu","kr3w.de","kratsi.cz","krod.cz","kuc.cz","kxb.me","l-k.be","lc-s.co","lc.cx","lcut.in","libero.it","lien.li","llu.ch","lnk.co","lnk.sk","lnks.fr","m1p.fr","m3mi.com","mcaf.ee","mdl29.net","mic.fr","migre.me","minu.me","more.sh","mut.lu","myurl.in","net46.net","nicou.ch","nig.gr","nq.st","nxy.in","o-x.fr","okok.fr","oua.be","ow.ly","p.pw","parky.tv","past.is","pdh.co","ph.ly","pich.in","pin.st","plots.fr","plots.fr","pm.wu.cz","po.st","ppst.me","ppt.cc","ppt.li","prejit.cz","ptab.it","ptm.ro","q.gs","qbn.ru","qqc.co","qr.net","qrtag.fr","qxp.cz","qxp.sk","rb6.co","rcknr.io","rdz.me","redir.ec","redu.it","ref.so","relink.fr","ri.ms","riz.cz","rod.gs","s-url.fr","safe.mn","sagyap.tk","sdu.sk","sh.st","sh.st","shar.as","short.pk","shrt.in","shy.si","sicax.net","sina.lt","skr.sk","skroc.pl","sn.im","snsw.us","soo.gd","sq6.ru","ssl.gs","surl.me","sy.pe","t.cn","t.co","ta.gd","tabzi.com","tau.pe","tdjt.cz","tin.li","tini.cc","tiny.cc","tiny.lt","tiny.ms","tiny.pl","tinyurl.com","tinyurl.hu","tixsu.com","tldr.sk","tllg.net","tnij.org","tny.cz","to.ly","tohle.de","tpmr.com","tr.im","tr5.in","trck.me","trick.ly","trkr.ws","trunc.it","twet.fr","twlr.me","twurl.nl","u.to","uby.es","ucam.me","ug.cz","upzat.com","ur1.ca","url5.org","urlin.it","urls.fr","urlz.fr","urub.us","utfg.sk","v.gd","v.ht","valv.im","vaza.me","vbly.us","vd55.com","verd.in","vgn.me","vov.li","vsll.eu","vt802.us","vur.me","vv.vg","w1p.fr","waa.ai","web99.eu","wed.li","wp.me","wtc.la","wu.cz","ww7.fr","wwy.me","x.co","x.nu","x10.mx","x2c.eu","xav.cc","xgd.in","xib.me","xl8.eu","xoe.cz","xrl.us","xua.me","xub.me","yagoa.fr","yagoa.me","yeca.eu","yect.com","yep.it","yogh.me","ysear.ch","yyv.co","z9.fr","zSMS.net","zapit.nu","zip.net","zkr.cz","zoodl.com","zpag.es","zti.me","zxq.net","zzb.bz","blar.tk"],"maxPathLength":40,"allowDuplicateDestinations":true,"allowedConsonantLetters":["b","c","d","f","g","h","j","k","m","n","p","q","r","s","t","w","x","y","z"],"allowedVowelLetters":["a","e"],"httpRedirectCode":301,"timeLog":true};

const time = label => {
    if(settings.timeLog){
        console.time(label);
    }
};

const timeEnd = label => {
    if(settings.timeLog){
        console.timeEnd(label);
    }
};

time("setup");
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp({
    credential: admin.credential.cert(functions.config().creds),
    databaseURL: "https://blar-url-shortener.firebaseio.com"
});
const db = admin.firestore();

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

exports.render = functions.https.onRequest(async (request, response) => {
    const url = new URL(request.url, "https://example.org");
    let path = url.pathname;
    if(path.startsWith("/")) path = path.slice(1);
    if(path.endsWith("/")) path = path.slice(0, -1);

    const snapshot = await db.collection("urls").where("path", "==", path).get();
    let data;
    snapshot.forEach(snap => {
        data = snap.data();
    });

    if(!snapshot.empty && data && data.path && data.dest) {
        response.redirect(settings.httpRedirectCode, data.dest);
    }else{
        response.status(404).end("Page not found");
    }
});

const getRandLetterArray = (arr, len) => (new Array(len)).fill(0).map(() => arr[Math.floor(Math.random() * arr.length)]);

const getRandPath = (finalLength = 1) => getRandLetterArray(settings.allowedConsonantLetters, 2).concat(getRandLetterArray(settings.allowedVowelLetters, 1)).concat(getRandLetterArray(settings.allowedConsonantLetters, finalLength)).join("");

exports.shortenUrl = functions.https.onRequest(async (request, response) => {
    const returnError = errors => response.status(400).json({errors});

    time("function");

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
timeEnd("setup");
