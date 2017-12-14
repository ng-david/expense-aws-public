const express = require('express');
const bodyParser = require('body-parser');
const logger = require('morgan');
const exphbs = require('express-handlebars');
const _ = require('underscore');
const AWS = require('aws-sdk');
const passport = require('passport');
const GithubStrategy = require('passport-github').Strategy;
const session = require('express-session');
const port = process.env.PORT || 8000;
// GLOBALs
const TABLENAME = "Expenses";
const DELETETABLEMODE = false;

// AWS
// AWS.config.update({
//   region: "us-west-2",
//   endpoint: "http://localhost:8000",
//   accessKeyId: "blah1",
//   secretAccessKey: "blah2"
// });
AWS.config.loadFromPath('config.json');

// Setup DynamoDB table and access for client
const dynamodb = new AWS.DynamoDB();
if (DELETETABLEMODE) {
  // DELETE TABLE
  var params = {
      TableName : TABLENAME
  };
  dynamodb.deleteTable(params, function(err, data) {
      if (err) {
          console.error("Unable to delete table. Error JSON:", JSON.stringify(err, null, 2));
      } else {
          console.log("Deleted table. Table description JSON:", JSON.stringify(data, null, 2));
      }
  });
} else {
  const params = {
    TableName: TABLENAME,
    KeySchema: [
      { AttributeName: "username", KeyType: "HASH"},  //Partition key
    ],
    AttributeDefinitions: [
      { AttributeName: "username", AttributeType: "S" },
    ],
    ProvisionedThroughput: {
        ReadCapacityUnits: 10,
        WriteCapacityUnits: 10
    }
  };
  dynamodb.createTable(params, function(err, data) {
    if (err) {
      console.error("Unable to create table. Error:", JSON.stringify(err, null, 2));
    } else {
      console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
    }
  });
}
const docClient = new AWS.DynamoDB.DocumentClient();

// SETUP APP
const app = express();
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.engine('handlebars', exphbs({ defaultLayout: 'main' }));
app.set('view engine', 'handlebars');
app.use('/public', express.static('public'));

// SETUP PASSPORT
passport.use(new GithubStrategy({
    clientID: "HIDDEN",
    clientSecret: "HIDDEN",
    callbackURL: "http://localhost:8000/auth/github/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    return done(null, profile);
  }
));
// SETUP SESSIONS
app.use(session({
  secret: 'my express secret',
  saveUninitialized: true,
  resave: true,
}));
app.use(passport.initialize());
app.use(passport.session());
passport.serializeUser(function(user, done) {
  // placeholder for custom user serialization
  // null is for errors
  // console.log(user);
  done(null, user);
});
passport.deserializeUser(function(user, done) {
  // placeholder for custom user deserialization.
  // maybe you are going to get the user from mongo by id?
  // null is for errors
  done(null, user);
});

// MIDDLEWARE/HELPERS ----------------------------------------------------------

// Simple middleware to ensure user is authenticated.
// Use this middleware on any resource that needs to be protected.
// If the request is authenticated (typically via a persistent login session),
// the request will proceed.  Otherwise, the user will be redirected to the
// login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    // req.user is available for use here
    return next(); }

  // denied. redirect to login
  res.redirect('/')
}

function getExpenses(username, callback) {
  let params = {
    TableName : TABLENAME,
    KeyConditionExpression: "#username = :username",
    ExpressionAttributeNames:{
        "#username": "username"
    },
    ExpressionAttributeValues: {
        ":username": username
    }
  };
  docClient.query(params, function(err, data) {
      if (err) {
          console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
      } else {
          console.log("Query succeeded.");
          console.log("DATA " + JSON.stringify(data))
          // Retiurn first found entry's expenses (there should only ever be one
          // per user)
          const item = data.Items.find((elt) => (elt !== null));
          if (item !== undefined) callback(item.expenses);
          // Return null if nothing found
          else callback(null);
      }
  });
}

// Input format: 00/00/0000
// Output: new Date(00, 00, 00)
function getDate(dateString) {
  const split = dateString.split("/");
  // console.log("DATE IS: " + new Date(split[2], split[1], split[0]));
  return (new Date(split[2], split[1], split[0]));
}
// ROUTES-----------------------------------------------------------------------
// GET -------------------------------------------------------------------------

// Called when starting the GitHub Login process
app.get('/auth/github', passport.authenticate('github'));

// GitHub will call this URL
app.get('/auth/github/callback', passport.authenticate('github', { failureRedirect: '/' }),
  function(req, res) {
    console.log(req.user.username);
    res.redirect('/');
  }
);

app.get('/logout', ensureAuthenticated, function(req, res) {
  req.logout();
  res.redirect('/');
});

app.get('/', function(req, res) {
  const isAuthenticated = req.isAuthenticated();
  let expenses = ['N/A'];
  let username = "N/A";
  let total = 0;
  if (isAuthenticated) {
    username = req.user.username;
    getExpenses(username, function(foundExpenses) {
      expenses = foundExpenses;
      if (expenses !== null) {
        // Always sort descending
        expenses.sort((x, y) => {
          return (new Date(y.date) - new Date(x.date));
        });
        total = expenses.reduce(function(acc, x) {
          return (acc += parseFloat(x.amount));
        }, 0);
        total = Number((total).toFixed(2));
      }
      res.render('home', {
        isAuthenticated: isAuthenticated,
        total: total,
        username: username,
        expenses: expenses
      });
    });
  } else {
    res.render('home', {
      isAuthenticated: isAuthenticated,
      username: username,
      expenses: expenses
    });
  }
});

app.get('/add', ensureAuthenticated, function(req, res) {
  res.render('add');
});

// DEMO PROTECTED LINK
app.get('/protected', ensureAuthenticated, function(req, res) {
  res.send("access granted. secure stuff happens here");
});

// POST ------------------------------------------------------------------------

app.post('/add', ensureAuthenticated, function(req, res) {
  const dateObj = getDate(req.body.date).toDateString();
  const newExpense = {
    vendor: req.body.vendor,
    date: dateObj,
    amount: req.body.amount,
    tags: req.body.tags,
    // description: req.body.description
  }
  getExpenses(req.user.username, function(prevExpenses) {
    let newExpenses;
    if (prevExpenses === null) {
      console.log("I AM ADDING A NEW EXPENSE");
      newExpenses = [newExpense];
    } else {
      console.log("I AM CONCATTING EXPENSES");
      newExpenses = prevExpenses.concat([newExpense]);
    }
    console.log("GONNA ADD" + JSON.stringify(newExpenses));
    const params = {
      TableName: TABLENAME,
      Item: {
        username: req.user.username,
        expenses: newExpenses
      }
    }
    docClient.put(params, function(err, data) {
      if (err) {
        console.error("Error on adding item to DB:", JSON.stringify(err, null, 2));
      } else {
        console.log(`Add item success!`, JSON.stringify(params, null, 2));
      }
      res.redirect("/");
    });
  });
});

app.listen(port, function() {
  console.log('Project on Port: ' + port);
});
