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

    // Ordonnance ?
    if(doc.prescription && doc.prescription.length){
        doc.ordonnance = true;
    }

    // Remboursable ?
    if(doc.presentation){
        for(var i = 0, l = doc.presentation.length; i < l; i++){
            if(doc.presentation[i].taux_remboursement.length){
                doc.remboursable = true;
                break;
            }
        }
    }

    // Generique ?
    doc.isGroupeGenerique = doc.generique.length > 0;


    // Reformat composition
    var compositions = [];
    console.log("Composition pour cip %s", doc.cis);
    for( var i = 0, l = doc.composition.length; i < l ; i++) {
        var elt = doc.composition[i],
            designation = elt.designation_element; // + " composition pour " + elt.reference_dosage;

        if (!compositions[designation]) {
            compositions[designation] = [];
        }
        if (elt.nature_composant === "FT") {
            elt.ft = [];
            compositions[designation].push(elt);
            continue;
        } else if(elt.nature_composant !== "FT"){
            var ftTrouve = false;
            for(var j = 0, k = doc.composition.length; j < k; j++){
                elt2 = doc.composition[j];
                if(elt.designation_element === elt2.designation_element && elt2.numero_liaison === elt.numero_liaison && elt2.nature_composant === "FT"){
                    elt2.ft.push(elt);
                    elt2.reference_dosage = elt.reference_dosage;
                    ftTrouve = true;
                    break;
                }
            }
            if(ftTrouve){
                continue;
            }
        }
        compositions[designation].push(elt);
    }
    doc.composition_formatted = compositions;

    // Format SMR / ASMR date
   if(doc.avisSMR && doc.avisSMR.length){
       for(var i = 0, l = doc.avisSMR.length; i < l; i++){
         if(doc.avisSMR[i].date_avis){
            doc.avisSMR[i].date_avis = doc.avisSMR[i].date_avis.replace(/([0-9]{4})([0-9]{2})([0-9]{2})/, "$3/$2/$1");

         }
       }
   }

    if(doc.avisASMR && doc.avisASMR.length){
        for(var i = 0, l = doc.avisASMR.length; i < l; i++){
            if(doc.avisASMR[i].date_avis){
                doc.avisASMR[i].date_avis = doc.avisASMR[i].date_avis.replace(/([0-9]{4})([0-9]{2})([0-9]{2})/, "$3/$2/$1")
            }
        }
    }

    return doc;
};

var createGeneriques = function(generalCallback){
    var generiques = {};
    database.getGeneriques(function(allGeneriques){

        for(var i = 0, l = allGeneriques.length; i < l; i++){
            var item = allGeneriques[i];
            if(!generiques["_"+item.identifiant]){
                generiques["_"+item.identifiant] = [];
            }
            generiques["_"+item.identifiant].push(item);
        }

        async.forEachOf(generiques, function(item, key, callback){
            var html = dots.generique(item);
            fs.writeFile("GENERIQUES/generique-" + item[0].identifiant + ".html", html, 'utf-8', function () {
                callback && callback(null, true);
            });

        }, function(err){
            if(err){
                throw "Erreur in createGeneriques";
            }
            console.log("End of createGeneriques");
            generalCallback && generalCallback(null, true);
        })
    });
};

var downloadNotice = function(cip, callback){
    var url = URL_DB_PUBLIC_MEDICAMENT + 'notice-' + cip + '-0',
        filename = "./CIPS/" + cip + "/notice.html",
        encoding = 'utf-8';

    request.get({url: url, encoding: encoding}, function (err, response, body) {
        if(err){
            console.log("Erreur in gathering notice file for CIP : %s", cip);
        }
        callback(body);
        //fs.writeFile(filename, body, encoding, function () {
        //    console.log("Downloaded notice for cip : %s", cip);
        //    callback(null, body);
        //});
    });
};

var downloadRCP = function(cip, callback){
    var url = URL_DB_PUBLIC_MEDICAMENT + 'rcp-' + cip + '-0',
        filename = "./CIPS/" + cip + "/rcp.html",
        encoding = 'utf-8';

    request.get({url: url, encoding: encoding}, function (err, response, body) {
        if(err){
            console.log("Erreur in gathering rcp file for CIP : %s", cip);
        }

        callback(body);
        //fs.writeFile(filename, body, encoding, function () {
        //    console.log("Downloaded rcp for cip : %s", cip);
        //    callback(body);
        //});
    });
};

var createInfos = function(CIP, generalCallback){
    cip = CIP.cis;
    database.getAllInfosOnCIP(cip, function(doc){
        var rcpContent = '',
            noticeContent = '';
        mkdir("CIPS/"+doc.cis, function() {
            async.parallel([
                function(callback){
                    downloadRCP(cip, function(rcp){
                        rcpContent = rcp;
                        callback(null, true);
                    });
                },
                function(callback) {
                    downloadNotice(cip, function (notice) {
                        noticeContent = notice;
                        callback(null, true);
                    })
                }
            ], function(err) {
                if(err){
                    console.log("ERRRREUUUUUR", err);
                }

                // Prepare document
                var newDoc = beforeRenderBase(doc);
                var tmpl = dots.base(newDoc);


                var $notice = cheerio.load(noticeContent),
                    $rcp = cheerio.load(rcpContent),
                    notice_indicationTherapeutique = $notice('#section2 .blocStd').html();

                if(!notice_indicationTherapeutique){
                    database.addNoNoticeCIP({cip: cip, num: doc.numero_autorisation_eur});
                }

                // Add RCP informations
                if($rcp('section').length > 0){
                    tmpl = tmpl.replace('%RCP_CURSOR%', $rcp('#section1').parent().html());
                }

                // Add Notice informations
                if($notice('section').length > 0){
                    tmpl = tmpl.replace('%NOTICE_CURSOR%', $notice('#section1').parent().html());
                }

                tmpl = tmpl.replace('%INDICATION_THERAPEUTIQUE%', notice_indicationTherapeutique || "Pas d'indications thérapeutiques");

                fs.writeFile("CIPS/"+doc.cis+"/base.html", tmpl, 'utf-8', function () {
                    console.log("Writted");
                    generalCallback && generalCallback(null, true);
                    console.log("Create Infos ok");
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

var downloadPDFFiles = function(){
    database.getNoNoticeCIP(function(err, docs){
        async.each(docs, function(item, callback){
            if(item.num) {
                var urls= [
                    URL_DB_PUBLIC_MEDICAMENT + "www/pdf/rcp/rcp-" + item.num.split('/')[3] + ".pdf",
                    URL_DB_PUBLIC_MEDICAMENT + "www/pdf/notice/notice-" + item.num.split('/')[3] + ".pdf"
                ];

                async.each(urls, function(url, callback2){
                    console.log("Download ", url, item.cip);
                    request.get({url: url, encoding: 'binary'}, function (err, response, body) {
                        if (err) {
                            console.log("PDF file download error for CIP ");
                            callback2(true);
                        }
                        if(body.indexOf("Erreur 404") < 0){
                            console.log("Write for CIP", item.cip);
                            var isRcp = url.indexOf('rcp') >= 0 ? "rcp" : "notice";
                            fs.writeFile("./CIPS/"+item.cip + "/" + isRcp + ".pdf", body, 'binary', function () {
                                callback2(null, true);
                            });
                        }

                    });
                }, function(err){
                    if(err){
                        throw err;
                    }
                    console.log("Fin download ");
                });
            }
        }, function(err){
            if(err){
                throw err;
            }
            console.log("downloadPDFFiles ended");
        })
    });
};

//createInfos

//generalBaseFileDownloader();
//insertInDatabase();
database.compareSpecialiteAndAddon();

//createInfos({cis: "63104382"});

//createAllInfos();

//createGeneriques();

//downloadPDFFiles();

