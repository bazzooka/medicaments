var request = require('request'),
    http = require('http'),
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
    URL_DB_PUBLIC_MEDICAMENT = 'http://m.base-donnees-publique.medicaments.gouv.fr/',
    URL_DB_PUBLIC_MEDICAMENT_INFO = URL_DB_PUBLIC_MEDICAMENT + 'info-',
    CIP_TAB = [],
    CIP_TAB_LENGTH = 0,
    CIP_TAB_CONTENT = [],
    REQUEST_TAB = [];


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
                    console.log("Construct URL for CIP %s %d/%d", CIP, i, CIP_TAB_LENGTH);
                    REQUEST_TAB.push({cip: CIP, url : URL_DB_PUBLIC_MEDICAMENT_INFO + CIP});

                    finishCreatingUrl();
                    //(function(cip1){
                    //    request.get({url: URL_DB_PUBLIC_MEDICAMENT_INFO + cip1, encoding: 'binary'}, function (err, response, body) {
                    //        if(cip1 === 64542736){
                    //            console.log(body);
                    //        }
                    //        CIP_TAB_CONTENT.push({
                    //            cip: cip1,
                    //            content: body
                    //        });
                    //        finishAllGather();
                    //    });
                    //})(CIP);
                });
            })(CIP_TAB[i], i);
        }
    })
};

var finishCreatingUrl = function(force){
    if(!force && REQUEST_TAB.length < CIP_TAB_LENGTH){
        return 0;
    }
    var url = REQUEST_TAB.pop();
    request.get({url: url.url, encoding: 'binary'}, function (err, response, body) {
        console.log("GET REQUEST DATAS FOR CIP", url.cip);
        CIP_TAB_CONTENT.push({
            cip: url.cip,
            content: body
        });
        finishCreatingUrl(true);
        createFile({
            cip: url.cip,
            content: body
        });
        //finishAllGather();
    });
}

var createFile = function(item){
    fs.writeFile(FILE_FICHIER_CIP_BASE + item.cip + "/index.html", item.content, 'utf8', function () {
        console.log("CIP %s written. Rest %d request to do", item.cip, REQUEST_TAB.length);
    });
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

    // Read all CIP directories in CIPS

    fs.readdir(FILE_FICHIER_CIP_BASE, function(error, cip_path_array){
        for(var i = 0, l = cip_path_array.length; i<l; i++){
            (function(cip_path){
                fs.readFile(FILE_FICHIER_CIP_BASE + cip_path + '/index.html', {encoding: 'utf8'}, function (err, data){
                    var $ = cheerio.load(data),
                        pageTitle = $("title").text(),
                        pdfLinkCount = $('.pdfLink').length,
                        isSumRcpId = $('#sumRcp').length,
                        isSumNoticeId = $('#sumNotice').length;

                    // TITLE IS EMPTY
                    if(pageTitle === 'Fiche info -  -  - BDM ANSM'){
                        console.log("Empty page for CIP : ", cip_path);
                        return true;
                    }

                    // RCP IN HTML FORMAT
                    if(isSumRcpId > 0){
                        (function(cip2) {
                            var filename = 'rcp.html';
                            var file = fs.createWriteStream(FILE_FICHIER_CIP_BASE + cip2 + '/' + filename);
                            request.get(URL_DB_PUBLIC_MEDICAMENT + 'rcp-' + cip2+'-0').pipe(file);
                            console.log('Find RCP HTML FOR %s', cip2);
                        })(cip_path);
                    }

                    // NOTICE IN HTML FORMAT
                    if(isSumNoticeId > 0){
                        (function(cip2) {
                            var filename = 'notice.html';
                            var file = fs.createWriteStream(FILE_FICHIER_CIP_BASE + cip2 + '/' + filename);
                            request.get(URL_DB_PUBLIC_MEDICAMENT + 'notice-' + cip2+'-0').pipe(file);
                            console.log('Find NOTICE HTML FOR %s', cip2);
                        })(cip_path);
                    }

                    // PDF TO DOWNLOAD
                    if(pdfLinkCount > 0){
                        console.log("PDF FIND FOR ", cip_path);
                        for(var i = 0, l = pdfLinkCount; i < l; i++){
                            (function(cip, pdfLink) {
                                var filename = pdfLink.match('rcp')? 'rpc.pdf': 'notice.pdf';
                                var file = fs.createWriteStream(FILE_FICHIER_CIP_BASE + cip + '/' + filename);
                                request.get(URL_DB_PUBLIC_MEDICAMENT + pdfLink).pipe(file);
                            })(cip_path, $('.pdfLink a')[i].attribs.href);
                        }
                    }
                });
            })(cip_path_array[i]);
        }


    })
};

// 1. Download specialite file
//getSpecialites();
// 2. convert CSV to JSON data
parseCSVToJSON();
// 3. Get RCP / Notice files
//parseHTML();
// 4. Construct the final page



