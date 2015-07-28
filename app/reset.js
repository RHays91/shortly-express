var Bookshelf = require('bookshelf');
var path = require('path');

var db = Bookshelf.initialize({
  client: 'sqlite3',
  connection: {
    host: '127.0.0.1',
    user: 'your_database_user',
    password: 'password',
    database: 'shortlydb',
    charset: 'utf8',
    filename: path.join(__dirname, '../db/shortly.sqlite')
  }
});


db.knex.schema.hasTable('urls').then(function(exists) {
  if (exists){
    db.knex.schema.dropTable('urls').then(function(){
      console.log("URLS DROPPED")
    });
  }
});

db.knex.schema.hasTable('clicks').then(function(exists) {
  if (exists){
    db.knex.schema.dropTable('clicks').then(function(){
      console.log("CLICKS DROPPED")
    });
  }
});

db.knex.schema.hasTable('users').then(function(exists) {
  if (exists){
    db.knex.schema.dropTable('users').then(function(){
      console.log("USERS DROPPED")
    });
  }
});


console.log("-- DATABASE RESET --");