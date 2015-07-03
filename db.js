var
    fs = require('fs'),
    parse = require('csv-parse'),
    MongoClient = require('mongodb').MongoClient,
    backup = require('mongodb-backup'),
    async = require('async'),
    database_config = {
        url: 'mongodb://localhost:27017/medicament'
    };

var deleteDatabase = function(callback){
    MongoClient.connect(database_config.url, function(err, db) {
        db.dropDatabase();
        console.log("Database was dropped");
        db.close();
        callback(null, true);
    });
};

var insertSpecialite = function(datas, callback){
    console.log("Insert specialite");
    MongoClient.connect(database_config.url, function(err, db) {
        var specialite = db.collection('specialite'),
            datasTab = [];


        for(var i = 0, l = datas.length; i < l ; i++){
            datasTab.push({
                cis: datas[i][0],
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

var insertComposition = function(datas, callback){
    console.log("Insert composition");
    MongoClient.connect(database_config.url, function(err, db) {
        var specialite = db.collection('composition'),
            datasTab = [];


        for (var i = 0, l = datas.length; i < l; i++) {
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

        async.each(datasTab, function (item, callback) {
            specialite.insert(item, function (err, result) {
                if (err) {
                    console.log(err);
                    throw "Erreur in first database specialite";
                }
                callback(null, true);
            });
        }, function (err) {
            specialite.count(function (err, count) {
                console.log("%d specialites in database", count);
                db.close();
                callback(null, true);
            });
        });
    });
};

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
                cip13: datas[i][6]
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
var insertPresentationAddon = function(datas, callback){
    console.log("Insert presentation");
    MongoClient.connect(database_config.url, function(err, db) {
        var presentation = db.collection('presentationAddon'),
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
                    throw "Erreur in first database presentation Addon";
                }
                callback(null, true);
            });
        }, function(err){
            presentation.count(function(err, count) {
                console.log("%d presentationAddon in database", count);
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

var insertCompositionAddon = function(datas, callback){
    console.log("Insert composition");
    MongoClient.connect(database_config.url, function(err, db) {
        var composition = db.collection('compositionAddon'),
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
                    throw "Erreur in first database compositionAddon";
                }
                callback(null, true);
            });
        }, function(err){
            composition.count(function(err, count) {
                console.log("%d compositionAddon in database", count);
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
var insertAvisSMRAddon = function(datas, callback){
    console.log("Insert avis SMR");
    MongoClient.connect(database_config.url, function(err, db) {
        var avisSMR = db.collection('avisSMRAddon'),
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
                    throw "Erreur in first database avisSMRAddon";
                }
                callback(null, true);
            });
        }, function(err){
            avisSMR.count(function(err, count) {
                console.log("%d avisSMRAddon in database", count);
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
var insertAvisASMRAddon = function(datas, callback){
    console.log("Insert avis ASMR");
    MongoClient.connect(database_config.url, function(err, db) {
        var avisASMR = db.collection('avisASMRAddon'),
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
                    throw "Erreur in first database avisASMRAddon";
                }
                callback(null, true);
            });
        }, function(err){
            avisASMR.count(function(err, count) {
                console.log("%d avisASMRAddon in database", count);
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
var insertLienAvisAddon = function(datas, callback){
    console.log("Insert liens avis");
    MongoClient.connect(database_config.url, function(err, db) {
        var liensAvis = db.collection('liensAvisAddon'),
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
                    throw "Erreur in first database liensAvisAddon";
                }
                callback(null, true);
            });
        }, function(err){
            liensAvis.count(function(err, count) {
                console.log("%d liensAvisAddon in database", count);
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
var insertGeneriquesAddon = function(datas, callback){
    console.log("Insert générique");
    MongoClient.connect(database_config.url, function(err, db) {
        var generique = db.collection('generiqueAddon'),
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
                    throw "Erreur in first database generiqueAddon";
                }
                callback(null, true);
            });
        }, function(err){
            generique.count(function(err, count) {
                console.log("%d generiqueAddon in database", count);
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
var insertPrescriptionAddon = function(datas, callback){
    console.log("Insert prescription");
    MongoClient.connect(database_config.url, function(err, db) {
        var prescription = db.collection('prescriptionAddon'),
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
                    throw "Erreur in first database prescriptionAddon";
                }
                callback(null, true);
            });
        }, function(err){
            prescription.count(function(err, count) {
                console.log("%d prescriptionAddon in database", count);
                db.close();
                callback(null, true);
            });
        });
    });
};

var insertInfosImportantesAddon = function(datas, callback){
    console.log("Insert informations importantes");
    MongoClient.connect(database_config.url, function(err, db) {
        var infos = db.collection('infosImportantes'),
            datasTab = [];


        for(var i = 0, l = datas.length; i < l ; i++){
            datasTab.push({
                cis: datas[i][0],
                debut: datas[i][1],
                fin: datas[i][2],
                lien: datas[i][3]
            });
        }

        async.each(datasTab, function(item, callback){
            infos.insert(item, function(err, result){
                if(err){
                    console.log(err);
                    throw "Erreur in first database informations immportantes";
                }
                callback(null, true);
            });
        }, function(err){
            infos.count(function(err, count) {
                console.log("%d informations importantes in database", count);
                db.close();
                callback(null, true);
            });
        });
    });
};

var collectDatasOnCIS = function(cis, callbackGeneral){
    console.log("CollectDatasOnCIS %s", cis);

    MongoClient.connect(database_config.url, function(err, db) {
        var specialite = db.collection("specialite"),
            composition = db.collection("composition"),
            presentation = db.collection("presentation"),
            specialiteAddon = db.collection("specialiteAddon"),
            presentationAddon = db.collection("presentationAddon"),
            compositionAddon = db.collection("compositionAddon"),
            avisSMRAddon = db.collection("avisSMRAddon"),
            avisASMRAddon = db.collection("avisASMRAddon"),
            liensAvisAddon = db.collection("liensAvisAddon"),
            generiqueAddon = db.collection("generiqueAddon"),
            prescriptionAddon = db.collection("prescriptionAddon"),
            infosImportantes = db.collection("infosImportantes");

        specialite.find({cis: cis}).toArray(function (err, docs) {
            var doc = docs[0];
            async.each([{
                collection: composition,
                name: "composition"
            }, {
                collection: presentation,
                name: "presentation"
            }, {
                collection: specialiteAddon,
                name: "specialiteAddon"
            }, {
                collection: presentationAddon,
                name: "presentationAddon"
            }, {
                collection: presentationAddon,
                name: "presentationAddon"
            }, {
                collection: avisSMRAddon,
                name: "avisSMRAddon"
            }, {
                collection: avisASMRAddon,
                name: "avisASMRAddon"
            }, {
                collection: liensAvisAddon,
                name: "liensAvisAddon"
            }, {
                collection: generiqueAddon,
                name: "generiqueAddon"
            }, {
                collection: prescriptionAddon,
                name: "prescriptionAddon"
            }, {
                collection: infosImportantes,
                name: "infosImportantes"
            }], function (item, callback) {
                if (item.name === "composition") {
                    item.collection.find({cis: cis}).sort({
                        designation_element: 1,
                        numero_liaison: 1,
                        nature_composant: 1
                    }).toArray(function (err, data) {
                        doc[item.name] = data;
                        callback(null, true);
                    });
                } else if(item.name === "specialiteAddon"){
                    item.collection.find({cis: cis}).toArray(function (err, data) {
                        doc[item.name] = data[0];
                        callback(null, true);
                    });
                } else {
                    item.collection.find({cis: cis}).toArray(function (err, data) {
                        doc[item.name] = data;
                        callback(null, true);
                    });
                }

            }, function (err) {
                db.close();
                if (err) {
                    throw "Error in getAllCIPInfos";
                }
                callbackGeneral(doc);
            });
        });
    });
};

var getAllCIS = function(callback){
    console.log("Get all CIS");
    MongoClient.connect(database_config.url, function(err, db) {
        var specialite = db.collection('specialite');

        specialite.find({}).toArray(function(err, docs){
            if(err) throw err;
            callback && callback(docs);
            db.close();
        });
    });
};

module.exports = {
    deleteDatabase: deleteDatabase,
    insertSpecialite: insertSpecialite,
    insertComposition: insertComposition,
    insertPresentation: insertPresentation,
    insertSpecialiteAddon: insertSpecialiteAddon,
    insertPresentationAddon:insertPresentationAddon,
    insertCompositionAddon: insertCompositionAddon,
    insertAvisSMRAddon: insertAvisSMRAddon,
    insertAvisASMRAddon: insertAvisASMRAddon,
    insertLienAvisAddon: insertLienAvisAddon,
    insertGeneriquesAddon: insertGeneriquesAddon,
    insertPrescriptionAddon: insertPrescriptionAddon,
    insertInfosImportantesAddon: insertInfosImportantesAddon,

    collectDatasOnCIS: collectDatasOnCIS,
    getAllCIS: getAllCIS
};