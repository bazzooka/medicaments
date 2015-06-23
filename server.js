var request = require('request'),
    fs = require('fs'),
    mkdir = require('mkdirp'),
    fse = require('fs-extra'),
    cheerio = require('cheerio'),
    csv = require('fast-csv'),
    csvStream = csv.format({delimiter: '	', objectMode: true, headers: false, quoteColumns: false});
    //path = require('path'),
    //express = require('express'),
    //bodyParser = require('body-parser'),
    //app = express();

/// CONST
var PWD = process.cwd(),
    URL_FICHIER_SPECIALITE = 'http://agence-prd.ansm.sante.fr/php/ecodex/telecharger/lirecis.php',
    FILE_FICHIER_SPECIALITE = "./downloaded/specialites.csv",
    URL_FICHIER_CIP_BASE = 'http://agence-prd.ansm.sante.fr/php/ecodex/extrait.php?specid=',
    FILE_FICHIER_CIP_BASE = './CIPS/',
    URL_DB_PUBLIC_MEDICAMENT = 'http://m.base-donnees-publique.medicaments.gouv.fr/info-',
    CIP_TAB = [],
    CIP_TAB_LENGTH = 0,
    CIP_TAB_CONTENT = [];

/// CREATE SERVER
//app.use('/', express.static(path.join(__dirname, '')));
//app.use(bodyParser.json());
//app.use(bodyParser.urlencoded({extended:true}));


var getSpecialites = function(){
    mkdir('./downloaded/', function(err){
        if(err){
            console.log("Error when create -downloaded- folder");
            return true;
        }
        request.get({url: URL_FICHIER_SPECIALITE, encoding: 'utf8'}, function (err, response, body) {
            fs.writeFile(FILE_FICHIER_SPECIALITE, body, 'utf8', function () {
                console.log("Spécialités are downloaded");
            });
        });
    });
};

var parseCSVToJSON = function(body){
    var stream = fs.createReadStream("downloaded/specialites.csv");
    console.log("Parsing CSV...");
    var csvStream = csv()
        .on("data", function(data){
            if(data.join(',').match('Autorisation active')){
                CIP_TAB.push(data[0].split('\t')[0]);
            }
        })
        .on("end", function(){
            console.log("Parsing done : ", CIP_TAB.length, ' CIP');
            CIP_TAB_LENGTH = CIP_TAB.length;
            getCIPInformations();
        });

    stream.pipe(csvStream);
};

var getCIPInformations = function(){

    console.log("Cleaning directories");
    fse.emptyDir(FILE_FICHIER_CIP_BASE, function(err){
        if(err){
            console.log("Error when delete CIPS folder");
            return true;
        }

        for(var i = 0, l = CIP_TAB.length; i < l; i++){
            (function(CIP, i){
                console.log("Creating directories tree for %s %d/%d", CIP, i, CIP_TAB_LENGTH);
                // Create directory for each CIP
                mkdir(FILE_FICHIER_CIP_BASE+CIP+'/', function(err){
                    if(err){
                        console.log("Error when create -CIP- folder %s", CIP);
                        return true;
                    }
                    console.log("Getting file for CIP %s %d/%d", CIP, i, CIP_TAB_LENGTH);
                    request.get({url: URL_DB_PUBLIC_MEDICAMENT + CIP, encoding: 'binary'}, function (err, response, body) {
                        CIP_TAB_CONTENT.push({
                            cip: CIP,
                            content: body
                        });
                        finishAllGather();
                    });
                });
            })(CIP_TAB[i], i);
        }
    })
};

var finishAllGather = function(){
    if(CIP_TAB_CONTENT.length < CIP_TAB_LENGTH){
        return 0;
    }
    for(var i = 0, l = CIP_TAB_CONTENT.length; i < l; i++){
        (function(index) {
            fs.writeFile(FILE_FICHIER_CIP_BASE + CIP_TAB_CONTENT[index].cip + "/index.html", CIP_TAB_CONTENT[index].content, 'utf8', function () {
                console.log("CIP %s, %d/%d written", CIP_TAB_CONTENT[index].cip, i, CIP_TAB_CONTENT.length);
            });
        })(i);
    }
};

var parseHTML = function(){

};

// 1. getSpecialites();
// 2. parseCSVToJSON();

parseHTML();



