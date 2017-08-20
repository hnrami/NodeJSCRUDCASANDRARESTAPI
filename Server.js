
var express = require('express');
var bodyParser= require('body-parser');
var nodeRestClient = require('node-rest-client').Client;
var app = express();
var winston = require('winston');
var config = require('konfig')();
var cassandra = require('cassandra-driver');
var amqp = require('amqplib/callback_api');
var client = new cassandra.Client({contactPoints: ['127.0.0.1' || 'cassandra']});
client.connect(function(err, result){
	console.log('customers: cassandra connected');
});

var logger =new(winston.Logger)({
                transports: [
                new(winston.transports.Console)({
                level:'debug'
                }),
                new (winston.transports.File)({
                handleExceptions: true,
                humanReadableUnhandledException: true ,
                filename: './log/node.log',
                maxsize: 25600,
                maxFiles: 50,
                level:'debug'
                })
        ]
});

logger.exitOnError = false;

client.connect(function(err) {
    if (err) {
		logger.info('error connecting: ' + err.stack);
		return;
	}
});

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: true})) //The urlencoded method within body-parser tells body-parser to extract data from the <form> element and add them to the body property in the request object.
app.use(bodyParser.json()); // support json encoded bodiesapp.use(bodyParser.json()); // support json encoded bodies

app.get('/', function(req, res) {
        //logger.info("GET URL called Through Browser ");
        res.sendFile(__dirname + '/public/index.html')
  })

  app.post('/security/add', function(req, res){

        var authToken =  req.headers["auth-token"];
		
        var input = JSON.parse(JSON.stringify(req.body));

	console.log('customers: save');

	client.execute("INSERT INTO people.subscribers (id, name, address, email, phone) VALUES (now(), '" + input.name + "', '" + input.address + "', '" + input.email + "', '" + input.phone + "')",[], function(err, result){
		if(err){
			console.log('customers: add err:', err);
			res.status(404).send({msg: err});
		} else {
			console.log('customers: add succ:'+input);
			quepush(input);
			res.status(200).send({msg: "Record Inserted"});
		}
	});

        
})

app.get('/security/getall', function(req, res){

        var authToken =  req.headers["auth-token"];
     
	client.execute('SELECT * FROM people.subscribers',[], function(err, result){
		if(err){
			console.log('customers: list err:', err);
			res.status(404).send({msg: err});
		} else {
			console.log('customers: list succ:', result.rows);
			serviceResonse(200,result.rows,res);
		}
	});

        
})
  

var serverTimeout=app.listen(config.properties.port, function() {
	logger.info('Successfully Listening From Port' + config.properties.port);
});


function serviceResonse(responceCode,jsonValue,res){
                        res.writeHead(responceCode, {'Content-Type': 'application/json'});
                        res.write(JSON.stringify(jsonValue, null, 3));
                        res.end();
  }
function quepush(input){
	
	console.log("hello"+input);

amqp.connect('amqp://localhost', function(err, conn) {
	
	conn.createChannel(function(err, ch) {
    var q = 'hello';
    var msg = "Name:"+input.name +","+"Address:"+input.address +","+"Email:"+input.email+","+"phone:"+ input.phone;
	console.log("msg"+msg);
    ch.assertQueue(q, {durable: false});
    // Note: on Node 6 Buffer.from(msg) should be used
    ch.sendToQueue(q, new Buffer(msg));
    console.log(" [x] Sent %s", msg);
  });
    
});	
}  
  
	
