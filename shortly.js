var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');
var bcrypt = require('bcrypt');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  cookie: {}
}));

var checkUserLogin = function(req, res){
  console.log("SUCCESS? - ", req.session.success);
  if(!req.session.success){
    res.redirect('/login');
  }
}

var authenticate = function(user, pass, callback){
  db.knex('users').where('username', '=', user).then(function(resp){
    console.log(resp);
    dbUser = resp[0];
    if(!resp.length) {
      console.log("THERE IS NO USER WITH THAT NAME");
      callback(new Error('Cannot Find User'));
    } else if(dbUser.password === pass){
      console.log("CORRECT PASSWORD!");
      callback(null, dbUser);
    } else { 
      console.log("INCORRECT PASSWORD!");
      callback(new Error('incorrect password'));
    }
  });

}


app.get('/', 
function(req, res) {
  console.log("SESSION ID: ", req.sessionID);
  // REDIRECT TO LOGIN!!!
  checkUserLogin(req, res);

  // TEST FOR USER LOGGED IN?
  // IF NO REDIRECT TO LOGIN 
  res.render('index');
});

app.get('/create', 
function(req, res) {
  checkUserLogin(req, res);
  res.render('index');
});

app.get('/links', 
function(req, res) {
  checkUserLogin(req, res);
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.post('/links', 
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin
        });

        link.save().then(function(newLink) {
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/


app.get('/login', function(req, res) {
  console.log("I'M AT THE LOGIN PAGE");
  // res.redirect('/login');
  // TEST FOR USER LOGGED IN?
  // IF NO REDIRECT TO LOGIN 
  res.render('login');
});

app.get('/signup', function(req, res) {
  res.render('signup');
})

app.post('/login', function(req, res){
  authenticate(req.body.username, req.body.password, function(err, user){
    if (user){
      req.session.regenerate(function(){
        req.session.user = user;
        req.session.success = 'Authenticated as ' + user.username;
        res.redirect('/');
      })
    } else {
      req.session.error = "FAILURE FUCK YOU!";
      res.redirect('/login');
    }
  });

  // console.log(req.body);
});

app.post('/signup', function(req, res){
  // console.log("HEADERS LOCATION : ", res.headers.location);
  // console.log(req.body.username, req.body.password);
  bcrypt.genSalt(10, function(err, salt) {
      bcrypt.hash(req.body.password, salt, function(err, hash) {
          // Store hash in your password DB. 
        console.log("HASH : ", hash, " SALT: ", salt);
        new User({
            'username': req.body.username,
            'hash': hash,
            'salt': salt
          }).save().then(function(){
            console.log("I'VE POSTED A NEW USER");
            res.writeHead(201, {location: '/'});
            // res.session
            res.redirect('/');
            res.end() // POSSIBLY REMOVE THIS LATER
          }); 
      });
  });
});



// Is this where our login route should go?

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
