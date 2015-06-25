var request = require('request'),
    http = require('http'),
    fs = require('fs'),
    mkdir = require('mkdirp'),
    fse = require('fs-extra'),
    cheerio = require('cheerio'),
    parse = require('csv-parse'),
    async  = require('async');
    //path = require('path'),
    //express = require('express'),
    //bodyParser = require('body-parser'),
    //app = express();

/// CONST
var PWD = process.cwd(),
    URL_FICHIER_SPECIALITE = 'http://agence-prd.ansm.sante.fr/php/ecodex/telecharger/lirecis.php',
    FILE_FICHIER_SPECIALITE = "./downloaded/specialites.csv",
    URL_FICHIER_CIP_BASE = 'http://agence-prd.ansm.sante.fr/php/ecodex/extrait.php?specid=',
    URL_ANSM_SOURCE = "http://agence-prd.ansm.sante.fr/php/ecodex/",
    FILE_FICHIER_CIP_BASE = './CIPS/',
    URL_DB_PUBLIC_MEDICAMENT = 'http://m.base-donnees-publique.medicaments.gouv.fr/',
    URL_DB_PUBLIC_MEDICAMENT_INFO = URL_DB_PUBLIC_MEDICAMENT + 'info-',
    CIP_TAB = [],
    CIP_TAB_LENGTH = 0,
    CIP_TAB_CONTENT = [],
    REQUEST_TAB = [],
    REQUEST_TAB2 = [],
    CIP_NOT_IN_DB_PUBLIC_MEDICAMENT = [];


/// CREATE SERVER
//app.use('/', express.static(path.join(__dirname, '')));
//app.use(bodyParser.json());
//app.use(bodyParser.urlencoded({extended:true}));


var getSpecialites = function(nextStepCallback){
    mkdir('./downloaded/', function(err){
        if(err){
            console.log("Error when create -downloaded- folder");
            return true;
        }
        request.get({url: URL_FICHIER_SPECIALITE, encoding: 'binary'}, function (err, response, body) {
            fs.writeFile(FILE_FICHIER_SPECIALITE, body, 'utf-8', function () {
                console.log("Spécialités are downloaded");
                nextStepCallback && nextStepCallback();
            });
        });
    });
};

var parseCSVToJSON = function(){
    var stream = fs.createReadStream("downloaded/specialites.csv");
    var parser = parse({delimiter: '\t', relax: true});

    parser.on('readable', function(){
        while(record = parser.read()){
            CIP_TAB.push(record);
        }
    });

    parser.on('finish', function(){
        console.log("specialites.csv was successfully parsed.");
        getCIPInformations();
    });

    stream.pipe(parser);
};

var deleteAllCIPSDirectories = function(callback){
    console.log("Cleaning directories");
    fse.emptyDir(FILE_FICHIER_CIP_BASE, function(err){
        callback(null, true);
    });
};

var createDirectories = function(callback0){
    async.each(CIP_TAB, function(item, callback1){
        mkdir(FILE_FICHIER_CIP_BASE+item+'/', function(err) {
            console.log("Creating directories for %s", item);
            if (err) {
                console.log("Error when create -CIP- folder %s", item);
                callback1("Errror mkdir", false);
            }
            callback1(null, true);
        });
    }, function(err){
        callback0(null, true);
    });
};

var downloadDBPublicInfos = function(callback){
    // Download from database public medicament
    var nbJobToDo = CIP_TAB.length;
    // Treat all CIP in parallel
    async.eachSeries(CIP_TAB, function(item, callback1){
        // Download and write in serie
        async.waterfall([
            // Download files info
            function(callback2){
                var CIP = this.cip;
                request.get({url: URL_DB_PUBLIC_MEDICAMENT_INFO + CIP, encoding: 'binary'}, function (err, response, body) {
                    if(err){
                        console.log("Erreur in gathering CIP infos for CIP ", CIP);
                        callback2("Erreur in gathering CIP infos for CIP "+ CIP);
                    }
                    console.log("GET RESPONSE DATAS FOR CIP", CIP);
                    callback2(null, CIP, body);
                });
            }.bind({cip: item}),
            function(cip, body, callback2){
                var CIP = cip;
                // Write file
                fs.writeFile(FILE_FICHIER_CIP_BASE + CIP + "/infos.html", body, 'utf8', function () {
                    nbJobToDo--;
                    console.log("CIP %s written. %d jobs to do.", CIP, nbJobToDo);
                    callback2(null, true);
                });
            }
        ], function(err){
            callback1(null, true);
        });

    }, function(err){
        callback(null, true);
    });
};

var downloadANSMInfos = function(callback0){
    // Download from database public medicament
    var nbJobToDo = CIP_TAB.length;
    // Treat all CIP in parallel
    async.eachSeries(CIP_TAB, function(item, callback1){
        // Download and write in serie
        async.waterfall([
            // Download files info
            function(callback2){
                var CIP = this.cip;
                request.get({url: URL_FICHIER_CIP_BASE + CIP, encoding: 'binary'}, function (err, response, body) {
                    if(err){
                        console.log("Erreur in gathering ANSM CIP infos for CIP ", CIP);
                        callback2("Erreur in gathering ANSM CIP infos for CIP "+ CIP);
                    }
                    console.log("GET RESPONSE DATAS FOR ANSM CIP", CIP);
                    callback2(null, CIP, body);
                });
            }.bind({cip: item}),
            function(cip, body, callback2){
                var CIP = cip;
                // Write file
                fs.writeFile(FILE_FICHIER_CIP_BASE + CIP + "/infosANSM.html", body, 'utf8', function () {
                    nbJobToDo--;
                    console.log("CIP %s written. %d jobs to do.", CIP, nbJobToDo);
                    callback2(null, true);
                });
            }
        ], function(err){
            callback1(null, true);
        });

    }, function(err){
        callback0(null, true);
    });
};

//var downloadDBPublicInfos = function(callback){
//    callback(null, true);
//}

var downloadAndWriteCIPInfos = function(callback0){
    async.parallel([downloadDBPublicInfos, downloadANSMInfos], function(err){
        callback0(null, true);
    });
};

var getCIPInformations = function(){
    // JOB 0. DELETE ALL DIRECTORIES
    // JOB 1. Create directories for each CIP
    // JOB 2. Download all infos.html

    async.series([deleteAllCIPSDirectories, createDirectories, downloadAndWriteCIPInfos], function(){
        console.log("getCIPInformations is done");
        parseHTML();
    });
};

var downloadAssociatedFiles = function(){
    //var item = REQUEST_TAB.pop();
    //
    //if(item) {
    //    var file = fs.createWriteStream(item.filename);
    //    request.get(item.url).pipe(file);
    //    console.log('Downloaded %s HTML FOR %s', item.filename, item.cip);
    //} else {
    //    console.log("Finish downloading associated files");
    //}


    var nbJobToDo = REQUEST_TAB2.length;
    // Treat all CIP in parallel
    async.eachSeries(REQUEST_TAB2, function(item, callback1){
        // Download and write in serie
        async.waterfall([
            // Download files info
            function(callback2){
                var CIP = this.item.cip,
                    item = this.item;
                request.get({url: this.item.url, encoding: 'binary'}, function (err, response, body) {
                    if(err){
                        console.log("Erreur in gathering associated files for CIP ", CIP);
                        callback2("Erreur in gathering CIP infos for CIP "+ CIP);
                    }
                    console.log("GET RESPONSE DATAS FOR CIP", CIP);
                    callback2(null, CIP, body, item);
                });
            }.bind({item: item}),
            function(cip, body, item, callback2){
                var CIP = cip;
                // Write file
                fs.writeFile(item.filename, body, 'utf8', function () {
                    nbJobToDo--;
                    console.log("Associated files for %s written. %d jobs to do.", CIP, nbJobToDo);
                    callback2(null, true);
                });
            }
        ], function(err){
            callback1(null, true);
        });

    }, function(err){
        console.log("Downloading associated files finished");
    });
};

var readInfosHtmlFile = function(){
    var nbJobToDo = REQUEST_TAB.length;
    async.each(REQUEST_TAB, function(item, callback){
        fs.readFile(item.url, {encoding: 'utf8'}, function (err, data){

            if(data) {
                var $ = cheerio.load(data),
                    pageTitle = $("title").text(),
                    pdfLinkCount = $('.pdfLink').length,
                    isSumRcpId = $('#sumRcp').length,
                    isSumNoticeId = $('#sumNotice').length,
                    isANSMRCPNotice = $('a.leftMenu').length;

                // TITLE IS EMPTY
                if (pageTitle === 'Fiche info -  -  - BDM ANSM') {
                    CIP_NOT_IN_DB_PUBLIC_MEDICAMENT.push(item.cip);
                    console.log("Empty page for CIP : ", item.cip);
                }

                if(isANSMRCPNotice > 0){
                    for(i = 0, l = isANSMRCPNotice; i < l; i++){
                        var url = $('a.leftMenu')[i].attribs.href,
                            isRPC = url.match('typedoc=R'),
                            filename = url.match('typedoc=R') ? 'rcpANSM.html' : 'noticeANSM.html',
                            url_fragment = url.match(/ref=.*.htm/)[0].split('=')[1];

                        REQUEST_TAB2.push({
                            title: '',
                            cip: item.cip,
                            data: data,
                            filename: FILE_FICHIER_CIP_BASE + item.cip + '/' + filename,
                            url: URL_ANSM_SOURCE + (isRPC ? 'rcp/' : 'notice/') + url_fragment
                        });
                    }
                }

                // RCP IN HTML FORMAT
                if (isSumRcpId > 0) {
                    REQUEST_TAB2.push({
                        title: pageTitle,
                        cip: item.cip,
                        data: data,
                        filename: FILE_FICHIER_CIP_BASE + item.cip + '/rcp.html',
                        url: URL_DB_PUBLIC_MEDICAMENT + 'rcp-' + item.cip + '-0'
                    });

                    //(function(cip2) {
                    //    var filename = 'rcp.html';
                    //    var file = fs.createWriteStream(FILE_FICHIER_CIP_BASE + cip2 + '/' + filename);
                    //    request.get(URL_DB_PUBLIC_MEDICAMENT + 'rcp-' + cip2+'-0').pipe(file);
                    //    console.log('Find RCP HTML FOR %s', cip2);
                    //})(item.cip);
                }

                // NOTICE IN HTML FORMAT
                if (isSumNoticeId > 0) {
                    REQUEST_TAB2.push({
                        title: pageTitle,
                        cip: item.cip,
                        data: data,
                        filename: FILE_FICHIER_CIP_BASE + item.cip + '/notice.html',
                        url: URL_DB_PUBLIC_MEDICAMENT + 'notice-' + item.cip + '-0'
                    });


                    //(function(cip2) {
                    //    var filename = 'notice.html';
                    //    var file = fs.createWriteStream(FILE_FICHIER_CIP_BASE + cip2 + '/' + filename);
                    //    request.get(URL_DB_PUBLIC_MEDICAMENT + 'notice-' + cip2+'-0').pipe(file);
                    //    console.log('Find NOTICE HTML FOR %s', cip2);
                    //})(item.cip);
                }

                // PDF TO DOWNLOAD
                if (pdfLinkCount > 0) {
                    console.log("PDF FIND FOR ", item.cip);
                    for (var i = 0, l = pdfLinkCount; i < l; i++) {
                        var filename = $('.pdfLink a')[i].attribs.href.match('rcp') ? 'rpc.pdf' : 'notice.pdf';
                        REQUEST_TAB2.push({
                            title: pageTitle,
                            cip: item.cip,
                            data: data,
                            filename: filename,
                            url: FILE_FICHIER_CIP_BASE + item.cip + '/' + filename
                        })

                        //(function(cip, pdfLink) {
                        //    var filename = pdfLink.match('rcp')? 'rpc.pdf': 'notice.pdf';
                        //    var file = fs.createWriteStream(FILE_FICHIER_CIP_BASE + cip + '/' + filename);
                        //    request.get(URL_DB_PUBLIC_MEDICAMENT + pdfLink).pipe(file);
                        //})(item.cip, $('.pdfLink a')[i].attribs.href);
                    }
                }
            }
            console.log("%d infos.html to parse", nbJobToDo);
            callback(null, true);
        });
    }, function(err){
        console.log("readInfosHtmlFile ended");
        downloadAssociatedFiles();
    });
};

var parseHTML = function(){

    // Read all CIP directories in CIPS

    fs.readdir(FILE_FICHIER_CIP_BASE, function(error, cip_path_array) {
        REQUEST_TAB = [];
        for (var i = 0, l = cip_path_array.length; i < l; i++) {
            if(fs.existsSync(FILE_FICHIER_CIP_BASE + cip_path_array[i] + '/infos.html')){
                REQUEST_TAB.push({
                    type: "infos.html",
                    cip: cip_path_array[i],
                    url: FILE_FICHIER_CIP_BASE + cip_path_array[i] + '/infos.html'
                });
            }
            if(fs.existsSync(FILE_FICHIER_CIP_BASE + cip_path_array[i] + '/infosANSM.html')){
                REQUEST_TAB.push({
                    type: "infosANSM.html",
                    cip: cip_path_array[i],
                    url: FILE_FICHIER_CIP_BASE + cip_path_array[i] + '/infosANSM.html'
                });
            }
            else {
                console.log("No informations on %s", cip_path_array[i]);
            }

        }
        readInfosHtmlFile();
    });
};

var constructPage = function(){

};

var start = function(){
  getSpecialites(parseCSVToJSON);
};
// 0. Start
//start();
// 1. Download specialite file
//getSpecialites();
// 2. convert CSV to JSON data
//parseCSVToJSON();
// 3. Get RCP / Notice files
//parseHTML();
// 4. Construct the final page
//constructPage();


start();



