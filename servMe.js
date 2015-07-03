/**
 * Created by joe on 31/03/15.
 */
var fs = require('fs'),
    path = require('path'),
    express = require('express'),
    bodyParser = require('body-parser'),
    MongoClient = require('mongodb').MongoClient,
    app = express(),
    publicPath = path.join(__dirname, 'public'),
    database_config = {
        url: 'mongodb://localhost:27017/medicament'
    };

app.use('/', express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));
var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

    // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
        res.send(200);
    }
    else {
        next();
    }
};
app.use(allowCrossDomain);


app.get('/getMedicLike/:pattern', function(req, res){
    MongoClient.connect(database_config.url, function(err, db) {
        var specialite = db.collection('specialite');

        var pattern = new RegExp("^"+ req.params.pattern.toUpperCase());
        specialite.find({denomination: pattern}, {cis: 1, denomination: 1, _id: 0}).toArray(function(err, docs){
            if(err) throw err;
            res.setHeader('Content-Type', 'application/json');
            res.send(docs);
        });
    });
});


app.listen(3000);

console.log('Server started : http://localhost:3000/ ');