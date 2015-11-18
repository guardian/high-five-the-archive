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
var exphbs  	= require('express-handlebars');
var fs 			= require('fs');

var app        	= express();                 // define our app using express
var store 		= new storage('store/data');

var pdfArr = [];
var imageArr = [];

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

app.use(express.static('public/'));


function convertToImage(filePath, opts) {
	return function(resolve, reject) {
		var outImage = 'public/tmp/' + opts.outId + '.png';
		console.log('Converting an image');

		exec('convert -density 300 ' + filePath + ' -depth 8 ' + outImage, function(err, stdout, stderr){
			if (err) {
				console.log('error');
				console.log(err)
				reject(err);
			}
			resolve({outImage: outImage, outId: opts.outId});
			imageArr.push(opts.outId);
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

function getId(path) {
	var matchArr = path.match(/([^\/]+)(?=\.\w+$)/);
	return (matchArr) ? matchArr[0] : false;
}

function getFileList(path) {
	return function (resolve, reject) {
		var thisArr = [];

		fs.readdir(path,function(err,files){
	    	if(err) throw err;
	    	files.forEach(function(file){
	    		var id = getId(file);

	    		if (id) {
	    			thisArr.push(id);
	    		}
	    	});
	    	resolve(thisArr);
	 	});

	}
}

// When our app starts up, create array of current images
function checkFiles() {
   	
	var pdfPromise = new Promise(getFileList('./public/original/')),
		imagePromise = new Promise(getFileList('./public/tmp/'));

		Promise.all([pdfPromise, imagePromise]).then(function(value){
			pdfArr = value[0];
			imageArr = value[1];

			checkForNewImage();

		});

};

// Check if there are any new pdfs in our folder
function checkForNewImage() {
	pdfArr.forEach(function(fileName){
		if (imageArr.indexOf(fileName) === -1) {

			var imagePath = 'public/original/' + fileName + '.pdf',
				outId = getId(imagePath),
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
		}
	})
}

// ROUTES FOR OUR APP
// =============================================================================

app.get('/', function (req, res) {
    res.render('home');
});


app.get('/high-five/:id', function(req, res) {
	var metadata = store.get('images.metadata.' + req.params.id);
	var originalPdf = '/original/' + req.params.id + '.pdf'
	var imageUrl = '/tmp/' + req.params.id + '.png'

	res.render('index', {metadata: metadata, imageUrl: imageUrl, pdfUrl: originalPdf})
});


// ROUTES FOR OUR API
// =============================================================================

// get an instance of the express Router
var router = express.Router();

router.get('/pdf', function(req, res) {
	// Assume we have a pdf at this point
	var imagePath = 'original/testtest.pdf',
		outId = getId(imagePath),
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
checkFiles();
setInterval(function(){
	console.log('interval')
	checkFiles();
}, 5000);