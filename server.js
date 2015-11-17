// server.js

// BASE SETUP
// =============================================================================
var exports = module.exports = {};

// call the packages we need
var express    	= require('express');        // call express
var app        	= express();                 // define our app using express
var bodyParser 	= require('body-parser');
var exec 		= require('child_process').exec
var tesseract   = require('node-tesseract');


// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var port = process.env.PORT || 8080;        // set our port

// APP FUNCTIONS
// =============================================================================

function convertToImage(filePath, opts) {
	exec('convert -density 300 ' + filePath + ' -depth 8 tmp/' + opts.outId + '.png', function(err, stdout, stderr){
		if (err) { 
			console.log('It did not work');
			return 'lose'
		};

		tesseract.process(__dirname + '/tmp/'  + opts.outId + '.png', function(err, text) {
		    if(err) {
		        console.error(err);
		    } else {
		        console.log(text);
		    }
		});
	})
}

// ROUTES FOR OUR API
// =============================================================================

// get an instance of the express Router
var router = express.Router();

// The url github hits
router.get('/pdf', function(req, res) {
	// Assume we have a pdf at this point
	var imagePath = 'testPdfs/another.pdf',
		outId = imagePath.match('/([^/\?]+)\\.').pop();

	res.send(convertToImage(imagePath, {
		outId: outId
	}))
});
// more routes for our API will happen here

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use('/api', router);

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('Magic happens on port ' + port);