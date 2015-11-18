// server.js

// BASE SETUP
// =============================================================================
var exports = module.exports = {};

// call the packages we need
var express    	= require('express');        // call express
var bodyParser 	= require('body-parser');
var exec 		= require('child_process').exec
var tesseract   = require('node-tesseract');
var storage 	= require('node-storage');
var exphbs  = require('express-handlebars');

var app        	= express();                 // define our app using express
var store 		= new storage('store/data');

// Configure our templating
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var port = process.env.PORT || 8090;        // set our port

// APP FUNCTIONS
// =============================================================================

function convertToImage(filePath, opts) {
	return function(resolve, reject) {
		var outImage = 'tmp/' + opts.outId + '.png';
		console.log('Converting an image');

		exec('convert -density 300 ' + filePath + ' -depth 8 ' + outImage, function(err, stdout, stderr){
			if (err) {
				console.log('error');
				console.log(err)
				reject(err);
			}
			resolve({outImage: outImage, outId: opts.outId});
		})
	}
}

function ocrImage(imgObj) {
	return new Promise(function(resolve, reject) {
		tesseract.process(__dirname + '/' + imgObj.outImage, function(err, text) {
		    if(err) {
				console.error(err);
				reject(err);
		    } else {
		        store.put('images.ocrText.' + imgObj.outId, text);
		        resolve(imgObj.outId  + ' stored');
		    }
		});
	})
}

function storeMetadata(postData, id) {
	store.put('images.metadata.' + id, postData);
}

// ROUTES FOR OUR APP
// =============================================================================

app.get('/', function (req, res) {
    res.render('home');
});

// ROUTES FOR OUR API
// =============================================================================

// get an instance of the express Router
var router = express.Router();

router.get('/pdf', function(req, res) {
	// Assume we have a pdf at this point
	var imagePath = 'testPdfs/testtest.pdf',
		outId = imagePath.match('/([^/\?]+)\\.').pop();
		convertImage = new Promise(convertToImage(imagePath, {
			outId: outId
		}));

	convertImage
		.then(ocrImage)
		.then(function(msg){
			console.log('Success')
			console.log(msg);
			res.send('success');
		})
		.catch(function(err){
			console.log('Fail')
			console.log(err);
			res.send('FAIL');
		})
});

router.get('/images/:id', function(req, res) {
	res.send(store.get('images.ocrText.' + req.params.id))
});

router.post('/item/:id', function(req, res) {
	storeMetadata(req.body, req.params.id);
	res.send('Saved');
});

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use('/api', router);

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('Magic happens on port ' + port);