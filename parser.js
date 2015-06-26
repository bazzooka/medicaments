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
    URL_CONDITIONS_PRESCRIPTION = "http://base-donnees-publique.medicaments.gouv.fr/telechargement.php?fichier=CIS_CPD_bdpm.txt";


var generalBaseFileDownloader = function(){
    var all_url = [
        URL_FICHIER_SPECIALITE,
        URL_FICHIER_SPECIALITE_ADDON,
        URL_FICHIER_PRESENTATION,
        URL_FICHIER_COMPOSITION,
        URL_FICHIER_AVIS_SMR,
        URL_FICHIER_AVIS_ASMR,
        URL_FICHIER_LIENS_AVIS,
        URL_FICHIER_GENERIQUES,
        URL_CONDITIONS_PRESCRIPTION
    ];
    mkdir('./downloaded/', function(err){
        if(err){
            console.log("Error when create -downloaded- folder");
            return true;
        }
        async.eachSeries(all_url, function(url, callback){
            var filename = url.match(/=.*/);
            filename = filename ? filename[0].replace('=', '/') : "specialites.csv";
            request.get({url: url, encoding: 'binary'}, function (err, response, body) {
                fs.writeFile('downloaded' + filename, body, 'utf-8', function () {
                    console.log(filename + " downloaded");
                    callback();
                });
            });
        })
    });
};

generalBaseFileDownloader();

