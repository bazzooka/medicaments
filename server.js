var request = require('request'),
    fs = require('fs'),
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
    FILE_FICHIER_CIP_BASE = './downloaded/',
    CIP_TAB = [];

/// CREATE SERVER
//app.use('/', express.static(path.join(__dirname, '')));
//app.use(bodyParser.json());
//app.use(bodyParser.urlencoded({extended:true}));


var getSpecialites = function(){
    request.get({url: URL_FICHIER_SPECIALITE, encoding: 'utf8'}, function (err, response, body) {
        fs.writeFile(FILE_FICHIER_SPECIALITE, body, 'utf8', function () {
            console.log("Spécialités are downloaded");
        });
    });
};

var parseCSVToJSON = function(body){
    var stream = fs.createReadStream("downloaded/specialites.csv");
    var csvStream = csv()
        .on("data", function(data){
            if(data.join(',').match('Autorisation active')){
                CIP_TAB.push(data[0].split('\t')[0]);
            }
        })
        .on("end", function(){
            console.log("Parsing done : ", CIP_TAB.length, ' CIP');
            getCIPInformations();
        });

    stream.pipe(csvStream);
};

var getCIPInformations = function(){

    for(var i = 0, l = CIP_TAB.length; i < l; i++){
        (function(CIP){
            request.get({url: URL_FICHIER_CIP_BASE + CIP, encoding: 'utf8'}, function (err, response, body) {
                fs.writeFile(FILE_FICHIER_CIP_BASE + CIP + '.html', body, 'utf8', function () {
                    // console.log(body);
                    console.log("CIP file written ", CIP);
                });
            });
        })(CIP_TAB[i]);

    }
};

parseCSVToJSON();




