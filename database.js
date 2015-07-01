var
    fs = require('fs'),
    parse = require('csv-parse'),
    MongoClient = require('mongodb').MongoClient,
    backup = require('mongodb-backup'),
    async = require('async'),
    database_config = {
        url: 'mongodb://localhost:27017/medicament'
    },
    ALL_CIP_DATAS = null;


var collections_NAMES = ["specialite", "specialiteAddon", "presentation", "composition", "avisSMR", "avisASMR", "liensAvis", "generique", "prescription"];

var backupDatabase = function(callback){
    backup({
        uri: database_config.url, // mongodb://<dbuser>:<dbpassword>@<dbdomain>.mongolab.com:<dbport>/<dbdatabase>
        root: __dirname + '/db/',
        callback: function(){
            console.log("Database was dumped");
            callback(null, true);
        }
    });
};

var deleteDatabase = function(callback){
    MongoClient.connect(database_config.url, function(err, db) {
        db.dropDatabase();
        console.log("Database was dropped");
        db.close();
        callback(null, true);
    });
};

var createDatabase = function(callback){
    MongoClient.connect(database_config.url, function(err, db) {
        var cips = db.collection('cips'),
            datas = [],
            listInsert = [];


        for(var i = 0, l = ALL_CIP_DATAS.length; i < l ; i++){
            datas.push({
                cip: ALL_CIP_DATAS[i][0],
                denomination: ALL_CIP_DATAS[i][1],
                forme: ALL_CIP_DATAS[i][2],
                voies: ALL_CIP_DATAS[i][3],
                statut_AMM: ALL_CIP_DATAS[i][4],
                type_procedure: ALL_CIP_DATAS[i][5],
                etat: ALL_CIP_DATAS[i][6],
                code_rcp_notice: ALL_CIP_DATAS[i][7]
            });
        }

        async.each(datas, function(item, callback){
            cips.insert(item, function(err, result){
                if(err){
                    console.log(err);
                    throw "Erreur in first database insertion";
                }
                callback(null, true);
            });
        }, function(err){
            console.log("All was inserted");
            db.close();
            callback(null, true);
        });
    });
};

var getAllMedicaments = function(callback){
    MongoClient.connect(database_config.url, function(err, db) {
        var collection = db.collection('cips');
        // Find some documents
        collection.find({}).toArray(function(err, docs) {
            db.close();
            callback(docs);
        });
    });
}

var countCipInDB = function(callback){
    MongoClient.connect(database_config.url, function(err, db) {
        var collection = db.collection('cips');
        // Find some documents
        collection.find({}).toArray(function(err, docs) {
            console.log("%d cips in database", docs.length);
            db.close();
            callback(null, true);
        });
    });
};

var getDifferentCIPStates = function(){

    MongoClient.connect(database_config.url, function(err, db) {
        var collection = db.collection('cips');

        collection.group({'statut_AMM':true}, {}, {"count":0}, function (obj, prev) { prev.count++; }, true, function(err, results) {
            console.log(results);
            db.close();
        });
    });
};

var getDenominationStartWith = function(frag){
    console.log("getDenominationStartWith");
    MongoClient.connect(database_config.url, function(err, db) {
        var collection = db.collection('cips');
        // Find some documents
        collection.find({denomination : /ZELITREX.*/}).toArray(function(error, results) {
            if (error) {
                callback(error);
            } else {
                console.log(results);
            }
            db.close();
        });
    });
};

var simpleFindTest = function(){
    console.log("simpleFindTest");
    MongoClient.connect(database_config.url, function(err, db) {
        var collection = db.collection('cips');
        // Find some documents
        collection.find({statut_AMM : /.*suspendue.*/}).toArray(function(error, results) {
            if (error) {
                callback(error);
            } else {
                console.log(results);
            }
            db.close();
        });
    });
};

var insertSpecialite = function(datas, callback){
    console.log("Insert specialite");
    MongoClient.connect(database_config.url, function(err, db) {
        var specialite = db.collection('specialite'),
            datasTab = [];


        for(var i = 0, l = datas.length; i < l ; i++){
            datasTab.push({
                cip: datas[i][0],
                denomination: datas[i][1],
                forme: datas[i][2],
                voies: datas[i][3],
                statut_AMM: datas[i][4],
                type_procedure: datas[i][5],
                etat: datas[i][6],
                code_rcp_notice: datas[i][7]
            });
        }

        async.each(datasTab, function(item, callback){
            specialite.insert(item, function(err, result){
                if(err){
                    console.log(err);
                    throw "Erreur in first database specialite";
                }
                callback(null, true);
            });
        }, function(err){
            specialite.count(function(err, count) {
                console.log("%d specialites in database", count);
                db.close();
                callback(null, true);
            });
        });
    });
};

/**
 * Le nom de ce fichier est : CIS_bdpm.txt
 Il contient la liste des médicaments commercialisés ou en arrêt de commercialisation depuis
 moins de trois ans.
 Les éléments mis à disposition dans ce fichier sont les suivants :
 - Code CIS (Code Identifiant de Spécialité)
 - Dénomination du médicament
 - Forme pharmaceutique
 - Voies d'administration (avec un séparateur « ; » entre chaque valeur quand il y en a
 plusieurs)
 - Statut administratif de l’autorisation de mise sur le marché (AMM)
 - Type de procédure d'autorisation de mise sur le marché (AMM)
 - Etat de commercialisation
 - Date d’AMM (format JJ/MM/AAAA)
 - StatutBdm : valeurs possibles : « Alerte » (icône rouge) ou « Warning disponibilité »
 (icône grise)
 - Numéro de l’autorisation européenne
 - Titulaire(s) : S’il y a plusieurs titulaires, les valeurs seront séparées par des « ; »
 - Surveillance renforcée (triangle noir) : valeurs « Oui » ou « Non »
 * @param datas
 * @param callback
 */
var insertSpecialiteAddon = function(datas, callback){
    console.log("Insert specialiteAddon");
    MongoClient.connect(database_config.url, function(err, db) {
        var specialiteAddon = db.collection('specialiteAddon'),
            datasTab = [];


        for(var i = 0, l = datas.length; i < l ; i++){
            datasTab.push({
                cis: datas[i][0],
                denomination: datas[i][1],
                forme: datas[i][2],
                voies: datas[i][3].split(';'),
                statut_AMM: datas[i][4],
                type_procedure: datas[i][5],
                etat_commercialisation : datas[i][6],
                date_amm: datas[i][7],
                Statut_bdm: datas[i][8],
                numero_autorisation_eur: datas[i][9],
                titulaire: datas[i][10].split(';'),
                surveillance: datas[i][11]
            });
        }

        async.each(datasTab, function(item, callback){
            specialiteAddon.insert(item, function(err, result){
                if(err){
                    console.log(err);
                    throw "Erreur in first database specialiteAddon";
                }
                callback(null, true);
            });
        }, function(err){
            specialiteAddon.count(function(err, count) {
                console.log("%d specialiteAddon in database", count);
                db.close();
                callback(null, true);
            });
        });
    });
};

/**
 * Le nom de ce fichier est : CIS_CIP_bdpm.txt
 Il contient la liste des présentations (boîtes de médicaments) disponibles pour les
 médicaments présents dans le fichier décrit dans le paragraphe 3.1.
 Les éléments mis à disposition dans ce fichier sont les suivants :
 - Code CIS
 - Code CIP7 (Code Identifiant de Présentation à 7 chiffres)
 - Libellé de la présentation
 - Statut administratif de la présentation
 - Etat de commercialisation de la présentation tel que déclaré par le titulaire de l'AMM
 - Date de la déclaration de commercialisation (format JJ/MM/AAAA)
 - Code CIP13 (Code Identifiant de Présentation à 13 chiffres)
 - Agrément aux collectivités ("oui", "non" ou « inconnu »)
 - Taux de remboursement (avec un séparateur « ; » entre chaque valeur quand il y en a
 plusieurs)
 - Prix du médicament en euro
 - Texte présentant les indications ouvrant droit au remboursement par l’assurance
 maladie s’il y a plusieurs taux de remboursement pour la même présentation.
 * @param datas
 * @param callback
 */
var insertPresentation = function(datas, callback){
    console.log("Insert presentation");
    MongoClient.connect(database_config.url, function(err, db) {
        var presentation = db.collection('presentation'),
            datasTab = [];


        for(var i = 0, l = datas.length; i < l ; i++){
            datasTab.push({
                cis: datas[i][0],
                cip7: datas[i][1],
                libelle: datas[i][2],
                statut: datas[i][3],
                etat: datas[i][4],
                date_declaration: datas[i][5],
                cip13: datas[i][6],
                agrement_collectivite: datas[i][7],
                taux_remboursement: datas[i][8].split(';'),
                prix: datas[i][9],
                condition_remboursement: datas[i][10]
            });
        }

        async.each(datasTab, function(item, callback){
            presentation.insert(item, function(err, result){
                if(err){
                    console.log(err);
                    throw "Erreur in first database presentation";
                }
                callback(null, true);
            });
        }, function(err){
            presentation.count(function(err, count) {
                console.log("%d presentation in database", count);
                db.close();
                callback(null, true);
            });
        });
    });
};

/**
 * Le nom de ce fichier est : CIS_COMPO_bdpm.txt
 Il contient la composition qualitative et quantitative en substances actives et fractions
 thérapeutiques (telle que figurant dans le Résumé des Caractéristiques du Produit) des
 médicaments de la BDPM.
 Les éléments mis à disposition dans ce fichier sont les suivants :
 - Code CIS
 - Désignation de l'élément pharmaceutique
 - Code de la substance
 - Dénomination de la substance
 - Dosage de la substance
 - Référence de ce dosage (exemple : "[pour] un comprimé")
 - Nature du composant (principe actif : « SA » ou fraction thérapeutique : « ST »)
 - Numéro permettant de lier, le cas échéant, substances actives et fractions
 thérapeutiques
 * @param datas
 * @param callback
 */

var insertComposition = function(datas, callback){
    console.log("Insert composition");
    MongoClient.connect(database_config.url, function(err, db) {
        var composition = db.collection('composition'),
            datasTab = [];


        for(var i = 0, l = datas.length; i < l ; i++){
            datasTab.push({
                cis: datas[i][0],
                designation_element: datas[i][1],
                code_substance: datas[i][2],
                denomination_substance: datas[i][3],
                dosage_substance: datas[i][4],
                reference_dosage: datas[i][5],
                nature_composant: datas[i][6],
                numero_liaison: parseInt(datas[i][7])
            });
        }

        async.each(datasTab, function(item, callback){
            composition.insert(item, function(err, result){
                if(err){
                    console.log(err);
                    throw "Erreur in first database composition";
                }
                callback(null, true);
            });
        }, function(err){
            composition.count(function(err, count) {
                console.log("%d composition in database", count);
                db.close();
                callback(null, true);
            });
        });
    });
};

/**
 * Le nom de ce fichier est : CIS_HAS_SMR_bdpm.txt
 Il contient l’ensemble des avis de SMR de la HAS postérieurs à l’année 2002.
 Les éléments mis à disposition dans ce fichier sont les suivants :
 - Code CIS
 - Code de dossier HAS
 - Motif d’évaluation
 - Date de l’avis de la Commission de la transparence (format AAAAMMJJ)
 - Valeur du SMR
 - Libellé du SMR
 * @param datas
 * @param callback
 */
var insertAvisSMR = function(datas, callback){
    console.log("Insert avis SMR");
    MongoClient.connect(database_config.url, function(err, db) {
        var avisSMR = db.collection('avisSMR'),
            datasTab = [];


        for(var i = 0, l = datas.length; i < l ; i++){
            datasTab.push({
                cis: datas[i][0],
                code_dossier_HAS: datas[i][1],
                motif_evaluation: datas[i][2],
                date_avis: datas[i][3],
                valeur_SMR: datas[i][4],
                libelle_SMR: datas[i][5]
            });
        }

        async.each(datasTab, function(item, callback){
            avisSMR.insert(item, function(err, result){
                if(err){
                    console.log(err);
                    throw "Erreur in first database avisSMR";
                }
                callback(null, true);
            });
        }, function(err){
            avisSMR.count(function(err, count) {
                console.log("%d avisSMR in database", count);
                db.close();
                callback(null, true);
            });
        });
    });
};

/**
 * Le nom de ce fichier est : CIS_HAS_ASMR_bdpm.txt
 Il contient l’ensemble des avis d’ASMR de la HAS postérieurs à l’année 2002.
 Les éléments mis à disposition dans ce fichier sont les suivants :
 - Code CIS
 - Code de dossier HAS
 - Motif d’évaluation
 - Date de l’avis de la Commission de la transparence (format AAAAMMJJ)
 - Valeur de l’ASMR
 - Libellé de l’ASMR
 * @param datas
 * @param callback
 */
var insertAvisASMR = function(datas, callback){
    console.log("Insert avis ASMR");
    MongoClient.connect(database_config.url, function(err, db) {
        var avisASMR = db.collection('avisASMR'),
            datasTab = [];


        for(var i = 0, l = datas.length; i < l ; i++){
            datasTab.push({
                cis: datas[i][0],
                code_dossier_HAS: datas[i][1],
                motif_evaluation: datas[i][2],
                date_avis: datas[i][3],
                valeur_ASMR: datas[i][4],
                libelle_ASMR: datas[i][5]
            });
        }

        async.each(datasTab, function(item, callback){
            avisASMR.insert(item, function(err, result){
                if(err){
                    console.log(err);
                    throw "Erreur in first database avisASMR";
                }
                callback(null, true);
            });
        }, function(err){
            avisASMR.count(function(err, count) {
                console.log("%d avisASMR in database", count);
                db.close();
                callback(null, true);
            });
        });
    });
};

/**
 * Le nom de ce fichier est : HAS_LiensPageCT_bdpm.txt
 Il contient l’ensemble des liens permettant d’accéder aux avis complets de la commission de
 la transparence pour les SMR et ASMR postérieurs à l’année 2002.
 Les éléments mis à disposition dans ce fichier sont les suivants :
 - Code de dossier HAS
 - Lien vers les pages d’avis de la CT
 * @param datas
 * @param callback
 */
var insertLienAvis = function(datas, callback){
    console.log("Insert liens avis");
    MongoClient.connect(database_config.url, function(err, db) {
        var liensAvis = db.collection('liensAvis'),
            datasTab = [];


        for(var i = 0, l = datas.length; i < l ; i++){
            datasTab.push({
                code_dossier_HAS: datas[i][1],
                url: datas[i][2]
            });
        }

        async.each(datasTab, function(item, callback){
            liensAvis.insert(item, function(err, result){
                if(err){
                    console.log(err);
                    throw "Erreur in first database liensAvis";
                }
                callback(null, true);
            });
        }, function(err){
            liensAvis.count(function(err, count) {
                console.log("%d liensAvis in database", count);
                db.close();
                callback(null, true);
            });
        });
    });
};


/**
 * Le nom de ce fichier est : CIS_GENER_bdpm.txt
 Il contient l’ensemble groupes génériques, avec les médicaments en faisant partie.
 Les éléments mis à disposition dans ce fichier sont les suivants :
 - Identifiant du groupe générique
 - Libellé du groupe générique
 - Code CIS
 - Type de générique, avec les valeurs suivantes :
 o 0 : « princeps »
 o 1 : « générique »
 o 2 : « génériques par complémentarité posologique »
 o 4 : « générique substituable »
 - Numéro permettant de trier les éléments d’un groupe
 * @param datas
 * @param callback
 */
var insertGeneriques = function(datas, callback){
    console.log("Insert générique");
    MongoClient.connect(database_config.url, function(err, db) {
        var generique = db.collection('generique'),
            datasTab = [];


        for(var i = 0, l = datas.length; i < l ; i++){
            datasTab.push({
                identifiant: datas[i][0],
                libelle: datas[i][1],
                cis: datas[i][2],
                type: parseInt(datas[i][3]),
                ordre: parseInt(datas[i][4])
            });
        }

        async.each(datasTab, function(item, callback){
            generique.insert(item, function(err, result){
                if(err){
                    console.log(err);
                    throw "Erreur in first database generique";
                }
                callback(null, true);
            });
        }, function(err){
            generique.count(function(err, count) {
                console.log("%d generique in database", count);
                db.close();
                callback(null, true);
            });
        });
    });
};
/**
 * Le nom de ce fichier est : CIS_CPD_bdpm.txt
 Il contient l’ensemble des conditions de prescription et de délivrance associées à un
 médicament.
 Les éléments mis à disposition dans ce fichier sont les suivants :
 - Code CIS
 - Condition de prescription ou de délivrance
 * @param datas
 * @param callback
 */
var insertPrescription = function(datas, callback){
    console.log("Insert prescription");
    MongoClient.connect(database_config.url, function(err, db) {
        var prescription = db.collection('prescription'),
            datasTab = [];


        for(var i = 0, l = datas.length; i < l ; i++){
            datasTab.push({
                cis: datas[i][0],
                condition: datas[i][1]
            });
        }

        async.each(datasTab, function(item, callback){
            prescription.insert(item, function(err, result){
                if(err){
                    console.log(err);
                    throw "Erreur in first database prescription";
                }
                callback(null, true);
            });
        }, function(err){
            prescription.count(function(err, count) {
                console.log("%d prescription in database", count);
                db.close();
                callback(null, true);
            });
        });
    });
};

var compareSpecialiteAndAddon = function(){
    MongoClient.connect(database_config.url, function(err, db) {
        var specialiteAddon = db.collection('specialiteAddon'),
            specialite = db.collection('specialite'),
            datasTab = [];


        specialiteAddon.find({}, {cis: 1, _id: 0}).toArray(function(err, docs){
            var allAddonsCIS = [];
            for(var i = 0, l = docs.length; i < l; i++){
                allAddonsCIS.push(docs[i].cis);
            }
            specialite.find({'cip': {$nin: allAddonsCIS}}).toArray(function(err, docNotInAddons){
                specialite.count(function(err, count) {
                    console.log("%d specialites", count);
                    specialiteAddon.count(function(err, count) {
                        console.log("%d specialiteAddon", count);
                        db.close();
                    });
                });
            });
        });
    });
};

var getAllCIP = function(callback){
    MongoClient.connect(database_config.url, function(err, db) {
        var specialiteAddons = db.collection(collections_NAMES[1]);

        specialiteAddons.find({}, {_id:0, cis: 1, denomination: 1}).toArray(function(err, docs){
            if(err){
                throw "Erreur on getAllCIP";
            }
            callback && callback(docs);
            db.close();
        });
    });
};

var getAllInfosOnCIP = function(cip, callback){
    MongoClient.connect(database_config.url, function(err, db) {
        var specialiteAddons = db.collection(collections_NAMES[1]),
            presentation = db.collection(collections_NAMES[2]),
            composition = db.collection(collections_NAMES[3]),
            avisSMR = db.collection(collections_NAMES[4]),
            avisASMR = db.collection(collections_NAMES[5]),
            generique = db.collection(collections_NAMES[7]),
            prescription = db.collection(collections_NAMES[8]);

        specialiteAddons.find({cis: cip}).toArray(function(err, docs){
            var doc = docs[0];
            async.each([{
                collection: presentation,
                name : "presentation"
            }, {
                collection: composition,
                name : "composition"
            }, {
                collection: avisSMR,
                name : "avisSMR"
            }, {
                collection: avisASMR,
                name : "avisASMR"
            }, {
                collection: generique,
                name : "generique"
            }, {
                collection: prescription,
                name : "prescription"
            }], function(item, callback){
                if(item.name === "composition"){
                    item.collection.find({cis: cip}).sort({designation_element: 1, numero_liaison: 1, nature_composant: 1}).toArray(function(err, data){
                        doc[item.name] = data;
                        callback(null, true);
                    });
                } else {
                    item.collection.find({cis: cip}).toArray(function(err, data){
                        doc[item.name] = data;
                        callback(null, true);
                    });
                }

            }, function(err){
                db.close();
                if(err){
                    throw "Error in getAllCIPINfos";
                }
                callback(doc);
            });
        });
    });
};

var getGeneriques = function(callbackGeneral){
    console.log("Get all génériques");

    MongoClient.connect(database_config.url, function(err, db){
        var generique = db.collection('generique'),
            specialite = db.collection('specialite'),
            allGeneriques = [];

        generique.find({}, {identifiant: 1, cis: 1, libelle: 1, type: 1, ordre: 1, _id: 0}).sort({identifiant: 1, ordre: 1})/*.limit(100)*/.toArray(function(err, docs){
            var index = 0,
                max = docs.length;
            async.each(docs, function(item, callback){

                specialite.find({cip: item.cis}, {_id: 0, cip: 1, denomination: 1, etat: 1}).toArray(function(err, spec){
                    console.log("Get génériques %s", Math.round((index++)*100/max));
                    item.med = spec[0];
                    allGeneriques.push(item);
                    callback(null, true);
                });
            }, function(err){
                if(err){
                    callbackGeneral && callbackGeneral("erreur getGeneriques", true);
                }

                callbackGeneral && callbackGeneral(allGeneriques);
                db.close();
            });
        });
    });
};

var addNoNoticeCIP = function(item, callback){
    console.log("No notice for CIP %s", item.cip);
    MongoClient.connect(database_config.url, function(err, db) {
        var noNotice = db.collection('noNotice');

            noNotice.insert(item, function(err, result){
                if(err){
                    console.log(err);
                    throw "Erreur in first database noNotice";
                }
                db.close();
                callback && callback(null, true);
            });


    });
};

var getNoNoticeCIP = function(callback){
    console.log("getNoNoticeCIP");
    MongoClient.connect(database_config.url, function(err, db) {
        var noNotice = db.collection('noNotice');

        noNotice.find({}).toArray(function(err, docs){
            if(err){
                throw err;
            }
            callback && callback(null, docs);
            db.close();
        });
    });
};

module.exports = {
    start : function(ALL_CIP){
        ALL_CIP_DATAS = ALL_CIP;
        async.series([backupDatabase, deleteDatabase, createDatabase, countCipInDB], function(){
            console.log("Database make its job well");
            getDenominationStartWith(/dolip/);
        });
    },

    getAllMedicaments: function(callback){
        getAllMedicaments(callback);
    },

    deleteDatabase : deleteDatabase,

    insertSpecialite : insertSpecialite,
    insertSpecialiteAddon: insertSpecialiteAddon,
    insertPresentation: insertPresentation,
    insertComposition: insertComposition,
    insertAvisSMR: insertAvisSMR,
    insertAvisASMR: insertAvisASMR,
    insertLienAvis: insertLienAvis,
    insertGeneriques: insertGeneriques,
    insertPrescription: insertPrescription,

    getAllCIP: getAllCIP,
    getAllInfosOnCIP: getAllInfosOnCIP,
    addNoNoticeCIP: addNoNoticeCIP,
    getGeneriques: getGeneriques,
    getNoNoticeCIP: getNoNoticeCIP,


    compareSpecialiteAndAddon : compareSpecialiteAndAddon
};

var parseCSVToJSON = function(){
    var stream = fs.createReadStream("downloaded/specialites.csv");
    var parser = parse({delimiter: '\t', relax: true});
    var ALL_SPECIALITES_TAB = [];

    parser.on('readable', function(){
        while(record = parser.read()){
            ALL_SPECIALITES_TAB.push(record);
        }
    });

    parser.on('finish', function(){
        console.log("specialites.csv was successfully parsed.");

        module.exports.start(ALL_SPECIALITES_TAB);
        // getCIPInformations();
    });

    stream.pipe(parser);
};
//simpleFindTest();
//module.exports.start();

//parseCSVToJSON();