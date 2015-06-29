var request = require('request'),
    fs = require('fs'),
    mkdir = require('mkdirp'),
    fse = require('fs-extra'),
    cheerio = require('cheerio'),
    parse = require('csv-parse'),
    async  = require('async'),
    dots = require('dot').process({ path: "./templates"}),
    database = require('./database.js');

var
    URL_DB_PUBLIC_MEDICAMENT = 'http://m.base-donnees-publique.medicaments.gouv.fr/',

    URL_FICHIER_SPECIALITE = 'http://agence-prd.ansm.sante.fr/php/ecodex/telecharger/lirecis.php',
    URL_FICHIER_SPECIALITE_ADDON = "http://base-donnees-publique.medicaments.gouv.fr/telechargement.php?fichier=CIS_bdpm.txt",
    URL_FICHIER_PRESENTATION = "http://base-donnees-publique.medicaments.gouv.fr/telechargement.php?fichier=CIS_CIP_bdpm.txt",
    URL_FICHIER_COMPOSITION = "http://base-donnees-publique.medicaments.gouv.fr/telechargement.php?fichier=CIS_COMPO_bdpm.txt",
    URL_FICHIER_AVIS_SMR = "http://base-donnees-publique.medicaments.gouv.fr/telechargement.php?fichier=CIS_HAS_SMR_bdpm.txt",
    URL_FICHIER_AVIS_ASMR = "http://base-donnees-publique.medicaments.gouv.fr/telechargement.php?fichier=CIS_HAS_ASMR_bdpm.txt",
    URL_FICHIER_LIENS_AVIS = "http://base-donnees-publique.medicaments.gouv.fr/telechargement.php?fichier=HAS_LiensPageCT_bdpm.txt",
    URL_FICHIER_GENERIQUES = "http://base-donnees-publique.medicaments.gouv.fr/telechargement.php?fichier=CIS_GENER_bdpm.txt",
    URL_CONDITIONS_PRESCRIPTION = "http://base-donnees-publique.medicaments.gouv.fr/telechargement.php?fichier=CIS_CPD_bdpm.txt",

    filesParams = [
        {url: URL_FICHIER_SPECIALITE, filename: "specialites.csv",          dbInsertFunc: "insertSpecialite"},
        {url: URL_FICHIER_SPECIALITE_ADDON, filename: "CIS_bdpm.txt",       dbInsertFunc: "insertSpecialiteAddon"},
        {url: URL_FICHIER_PRESENTATION, filename: "CIS_CIP_bdpm.txt",       dbInsertFunc: "insertPresentation"},
        {url: URL_FICHIER_COMPOSITION, filename: "CIS_COMPO_bdpm.txt",      dbInsertFunc: "insertComposition"},
        {url: URL_FICHIER_AVIS_SMR, filename: "CIS_HAS_SMR_bdpm.txt",       dbInsertFunc: "insertAvisSMR"},
        {url: URL_FICHIER_AVIS_ASMR, filename: "CIS_HAS_ASMR_bdpm.txt",     dbInsertFunc: "insertAvisASMR"},
        {url: URL_FICHIER_LIENS_AVIS, filename: "HAS_LiensPageCT_bdpm.txt", dbInsertFunc: "insertLienAvis"},
        {url: URL_FICHIER_GENERIQUES, filename: "CIS_GENER_bdpm.txt",       dbInsertFunc: "insertGeneriques"},
        {url: URL_CONDITIONS_PRESCRIPTION, filename: "CIS_CPD_bdpm.txt",    dbInsertFunc: "insertPrescription"}
    ]

var DATA_STORAGE = [];


var generalBaseFileDownloader = function(){

    mkdir('./downloaded/', function(err){
        if(err){
            console.log("Error when create -downloaded- folder");
            return true;
        }
        async.eachSeries(filesParams, function(item, callback){
            var filename = item.filename;
            request.get({url: item.url, encoding: 'binary'}, function (err, response, body) {
                fs.writeFile('downloaded/' + filename, body, 'utf-8', function () {
                    console.log(filename + " downloaded");
                    callback();
                });
            });
        })
    });
};

var parseCSV = function(item, callback){
    var stream = fs.createReadStream("downloaded/" + item.filename);
    var csvParser = parse({delimiter: '\t', relax: true});
    DATA_STORAGE[item.filename] = [];

    csvParser.on('readable', function(){
        while(record = csvParser.read()){
            DATA_STORAGE[item.filename].push(record);
        }
    });

    csvParser.on('finish', function(){
        console.log("%s was successfully parsed.", item.filename);
        console.log(database[item.dbInsertFunc]);
        database[item.dbInsertFunc] && database[item.dbInsertFunc](DATA_STORAGE[item.filename], callback);
    });

    stream.pipe(csvParser);
};


var insertInDatabase = function(){
    database.deleteDatabase(function(){
        async.each(filesParams, function(item, callback){
            parseCSV(item, callback);
        }),
            function(err){
                if(err){
                    throw "Erreur in file parsing";
                }
            }
    });
};

var beforeRenderBase = function(doc){
    // Ordonnance
    doc.ordonnance = false;
    doc.remboursable = false;
    if(doc.prescription && doc.prescription.length){
        doc.ordonnance = true;
    }
    if(doc.presentation){
        for(var i = 0, l = doc.presentation.length; i < l; i++){
            if(doc.presentation[i].taux_remboursement.length){
                doc.remboursable = true;
                break;
            }
        }
    }
    doc.isGroupeGenerique = doc.generique.length > 0;
    return doc;
};

var downloadNotice = function(cip, callback){
    var url = URL_DB_PUBLIC_MEDICAMENT + 'notice-' + cip + '-0',
        filename = "./CIPS/" + cip + "/notice.html",
        encoding = 'utf-8';

    request.get({url: url, encoding: encoding}, function (err, response, body) {
        if(err){
            console.log("Erreur in gathering associated files for CIP : %s", cip);
        }
        fs.writeFile(filename, body, encoding, function () {
            console.log("Downloaded notice for cip : %s", cip);
            callback(body);
        });
    });
}
var createInfos = function(CIP, callback){
    cip = CIP.cis;
    database.getAllInfosOnCIP(cip, function(doc){

        mkdir("CIPS/"+doc.cis, function() {
            downloadNotice(cip, function(notice){
                var newDoc = beforeRenderBase(doc);
                console.log("Download notice for ", cip);
                var $ = cheerio.load(notice);

                var tmpl = dots.base(newDoc);

                var notice_indicationTherapeutique = $('#section2 .blocStd').html();

                if(notice_indicationTherapeutique){
                   database.addNoNoticeCIP(cip);
                }


                tmpl = tmpl.replace('%INDICATION_THERAPEUTIQUE%', notice_indicationTherapeutique || "Pas d'indications thérapeutiques");

                fs.writeFile("CIPS/"+doc.cis+"/base.html", tmpl, 'utf-8', function () {
                    console.log("Writted");
                    callback(null, true);
                });
            });
        });
    });
};

var createAllInfos = function () {
    var start = Date.now();

    database.getAllCIP(function (docs) {
        var docLength = docs.length,
            i = 0;
        async.eachSeries(docs, function (cip, callback) {
            console.log(Math.round((i++)*100/docLength) + '%');
            createInfos(cip, callback);
        }, function (err) {
            console.log("Everything ok");
            console.log("Duration : %s",  Date.now() - start);
        });
    });
};

//generalBaseFileDownloader();
//insertInDatabase();
//database.compareSpecialiteAndAddon();

//createInfos("61158602");

createAllInfos();

