var request = require('request'),
    fs = require('fs'),
    mkdir = require('mkdirp'),
    fse = require('fs-extra'),
    cheerio = require('cheerio'),
    parse = require('csv-parse'),
    async  = require('async'),
    database = require('./database.js');

var
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

var createInfos = function(){

}

//generalBaseFileDownloader();
//insertInDatabase();
//database.compareSpecialiteAndAddon();
//createInfos();

