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



module.exports = {
    start : function(ALL_CIP){
        ALL_CIP_DATAS = ALL_CIP;
        async.series([backupDatabase, deleteDatabase, createDatabase, countCipInDB], function(){
            console.log("Database make its job well");
            getDenominationStartWith(/dolip/);
        });
    }
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
getDifferentCIPStates();
//module.exports.start();

//parseCSVToJSON();