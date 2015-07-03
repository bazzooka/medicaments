var request = require('request'),
    fs = require('fs'),
    mkdir = require('mkdirp'),
    fse = require('fs-extra'),
    cheerio = require('cheerio'),
    parse = require('csv-parse'),
    async  = require('async'),
    dots = require('dot').process({ path: "./templates"}),
    database = require('./db.js');

var
    URL_DB_PUBLIC_MEDICAMENT = 'http://m.base-donnees-publique.medicaments.gouv.fr/',

    URL_FICHIER_SPECIALITE_ANSM = 'http://agence-prd.ansm.sante.fr/php/ecodex/telecharger/lirecis.php',
    URL_FICHIER_COMPOSITION_ANSM = 'http://agence-prd.ansm.sante.fr/php/ecodex/telecharger/lirecomp.php',
    URL_FICHIER_PRESENTATION_ANSM = 'http://agence-prd.ansm.sante.fr/php/ecodex/telecharger/lirecip.php',
    URL_FICHIER_SPECIALITE_ADDON = "http://base-donnees-publique.medicaments.gouv.fr/telechargement.php?fichier=CIS_bdpm.txt",
    URL_FICHIER_PRESENTATION = "http://base-donnees-publique.medicaments.gouv.fr/telechargement.php?fichier=CIS_CIP_bdpm.txt",
    URL_FICHIER_COMPOSITION = "http://base-donnees-publique.medicaments.gouv.fr/telechargement.php?fichier=CIS_COMPO_bdpm.txt",
    URL_FICHIER_AVIS_SMR = "http://base-donnees-publique.medicaments.gouv.fr/telechargement.php?fichier=CIS_HAS_SMR_bdpm.txt",
    URL_FICHIER_AVIS_ASMR = "http://base-donnees-publique.medicaments.gouv.fr/telechargement.php?fichier=CIS_HAS_ASMR_bdpm.txt",
    URL_FICHIER_LIENS_AVIS = "http://base-donnees-publique.medicaments.gouv.fr/telechargement.php?fichier=HAS_LiensPageCT_bdpm.txt",
    URL_FICHIER_GENERIQUES = "http://base-donnees-publique.medicaments.gouv.fr/telechargement.php?fichier=CIS_GENER_bdpm.txt",
    URL_CONDITIONS_PRESCRIPTION = "http://base-donnees-publique.medicaments.gouv.fr/telechargement.php?fichier=CIS_CPD_bdpm.txt",
    URL_INFOS_IMPORTANTES = "http://base-donnees-publique.medicaments.gouv.fr/telechargement.php?fichier=CIS_InfoImportantes.txt",

    sources = [
        {url: URL_FICHIER_SPECIALITE_ANSM,      filename: "specialites.csv",        dbInsertFunc: "insertSpecialite"},
        {url: URL_FICHIER_COMPOSITION_ANSM,     filename: "composition.csv",        dbInsertFunc: "insertComposition"},
        {url: URL_FICHIER_PRESENTATION_ANSM,    filename: "presentation.csv",       dbInsertFunc: "insertPresentation"},
        {url: URL_FICHIER_SPECIALITE_ADDON,     filename: "specialiteAddon.txt",    dbInsertFunc: "insertSpecialiteAddon"},
        {url: URL_FICHIER_PRESENTATION,         filename: "presentationAddon.txt",  dbInsertFunc: "insertPresentationAddon"},
        {url: URL_FICHIER_COMPOSITION,          filename: "compositionAddon.txt",   dbInsertFunc: "insertCompositionAddon"},
        {url: URL_FICHIER_AVIS_SMR,             filename: "avisSMRAddon.txt",       dbInsertFunc: "insertAvisSMRAddon"},
        {url: URL_FICHIER_AVIS_ASMR,            filename: "avisASMRAddon.txt",      dbInsertFunc: "insertAvisASMRAddon"},
        {url: URL_FICHIER_LIENS_AVIS,           filename: "liensAvisAddon.txt",     dbInsertFunc: "insertLienAvisAddon"},
        {url: URL_FICHIER_GENERIQUES,           filename: "generiqueAddon.txt",     dbInsertFunc: "insertGeneriquesAddon"},
        {url: URL_CONDITIONS_PRESCRIPTION,      filename: "prescriptionAddon.txt",  dbInsertFunc: "insertPrescriptionAddon"},
        {url: URL_INFOS_IMPORTANTES,            filename: "infosImportantes.txt",   dbInsertFunc: "insertInfosImportantesAddon"}
    ];

var DATA_STORAGE = [];

var generalBaseFileDownloader = function(){

    mkdir('./downloaded/', function(err){
        if(err){
            console.log("Error when create -downloaded- folder");
            return true;
        }
        async.eachSeries(sources, function(item, callback){
            var filename = item.filename;
            request.get({url: item.url, encoding: 'binary'}, function (err, response, body) {
                fs.writeFile('downloaded/' + filename, body, 'utf-8', function () {
                    console.log(filename + " downloaded");
                    callback();
                });
            });
        }, function(err){
            if(err){
                throw err;
                console.log("Erreur in general download");
            }
            console.log("Finish general downloading");
        })
    });
};

var sourcesToCSV = function(item, callback){
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
        async.each(sources, function(item, callback){
            sourcesToCSV(item, callback);
        }),
        function(err){
            if(err){
                throw "Erreur in file parsing";
            }
            console.log("Insert in database ended");
        }
    });
};

var downloadImagesFromFiles = function(body, cis, callbackG){
    var $ = cheerio.load(body),
        images = $('img, images, pictures'),
        base = "http://agence-prd.ansm.sante.fr/php/ecodex/";

    async.each(images, function(img, callback){
        var src = img.attribs.src,
            url = src.replace('../', base),
            filenameArray = src.split("/");

        console.log(filenameArray);
        request.get({url: url, encoding: "binary"}, function (err, response, body) {
            if(err){
                console.log("Fichier non disponible");
                callback(null, body);
            } else{
                mkdir("CIPS/images/" + filenameArray[2], function(){
                    fs.writeFile("CIPS/images/" + filenameArray[2] +"/" + filenameArray[3], body, "binary", function () {
                        console.log("Downloaded %s for cip : %s", filenameArray[3], cis);
                        callback(null, body);
                    });
                });
            }
//            callback(body);

        });
        //callback(null, true);
    }, function(err){
        if(err) throw err;
        console.log("Finished download images for %s", cis);
        callbackG(null, true);
    });
};

var downloadFromANSM = function(datas, callbackG){
    var base = "http://agence-prd.ansm.sante.fr/php/ecodex/";
    var urls = [
        {cis: datas.cis, type: "rcp", url: base + "rcp/R" + datas.code_rcp_notice + ".htm"},
        {cis: datas.cis, type: "notice", url: base + "notice/N" + datas.code_rcp_notice + ".htm"}
    ];
    async.each(urls, function(item, callback){
        request.get({url: item.url, encoding: "binary"}, function (err, response, body) {
            if(err) throw err;
//            callback(body);
            var filename = item.type === "rcp" ? "/rcp.html": "/notice.html";
            mkdir("CIPS/" + item.cis, function(){
                fs.writeFile("CIPS/" + item.cis + filename, body, "binary", function () {
                    console.log("Downloaded %s for cip : %s", filename, datas.cis);
                    //callback(null, body);
                    downloadImagesFromFiles(body, datas.cis, callback);
                });
            });
        });
    }, function(err){
        if(err) throw err;
        console.log("Finished download for ", datas.cis);
        callbackG && callbackG(null, true);
    });
};

var downloadFromBDPM = function(datas, callbackG){
    var base = "http://m.base-donnees-publique.medicaments.gouv.fr/www/pdf/";
    var urls = [
        {cis: datas.cis, type: "rcp", url: base + "rcp/rcp-" + datas.specialiteAddon.numero_autorisation_eur.split('/')[3] + ".pdf"},
        {cis: datas.cis, type: "notice", url: base + "notice/notice-" + datas.specialiteAddon.numero_autorisation_eur.split('/')[3] + ".pdf"}
    ];
    async.each(urls, function(item, callback){
        request.get({url: item.url, encoding: "binary"}, function (err, response, body) {
            if(err) throw err;
//            callback(body);
            var filename = item.type === "rcp" ? "/rcp.pdf": "/notice.pdf";
            mkdir("CIPS/" + item.cis, function(){
                fs.writeFile("./CIPS/" + item.cis + filename, body, "binary", function () {
                    console.log("Downloaded %s for cip : %s", filename, datas.cis);
                    callback(null, body);
                });
            });
        });
    }, function(err){
        if(err) throw err;
        console.log("Finished download for ", datas.cis);
        callbackG(null, true);
    })
};


var downloadFilesFrom = function(source, datas, callback){
    if(source === "ANSM"){
        downloadFromANSM(datas, callback);
    } else if(source == "BDPM"){
        downloadFromBDPM(datas, callback);
    }
};

var downloadRcpNotice = function(response, callback){
    if(response.code_rcp_notice){    // CIS : 69643760
        if(response.code_rcp_notice){                                   // CIS : 69724187
            downloadFilesFrom("ANSM", response, callback);
            response.isHTMLFiles = true;
        } else if(response.specialiteAddon.numero_autorisation_eur) {    // CIS : 69643760
            downloadFilesFrom("BDPM", response, callback);
            response.isPDFFiles = true;
        }
    } else {                                                            // CIS : 65877011
        if(response.code_rcp_notice){                                   // CIS :
            downloadFilesFrom("ANSM", response, callback);
            response.isHTMLFiles = true;
        } else {
            callback && callback(null, true);
        }
    }
};

var constructPage = function(datas, callbackG){
    callbackG(null, true);
};

var downloadAllOf = function(cis, callbackG){
    database.collectDatasOnCIS(cis, function(response){

        //async.series([
        //    function(callback){
        downloadRcpNotice(response, callbackG);
            //}, function(callback){
            //    constructPage(response, callback);
            //}
        //], function(err){
        //    if(err) throw err;
        //    console.log("Finished downloadAllOf");
        //    callbackG(null, true);
        //})
    });
};

var startDownload = function(){
    database.getAllCIS(function(docs){
        var i = 0, max = docs.length, startTime = Date.now();
       async.eachSeries(docs, function(item, callback){
           console.log("Progression : ...................... %d", Math.round((i++)*100/max));
           downloadAllOf(item.cis, callback);
       }, function(err){
          if(err) throw err;
           console.log("Finished to download all CIS in %d", Date.now()-startTime);
       });
    });
};

//generalBaseFileDownloader();      // Download all files
//insertInDatabase();               // Parse them & insert them in DB
//downloadAllOf("67728393");
startDownload();