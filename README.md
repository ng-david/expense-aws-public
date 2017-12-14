# Mooni Expense Tracking

## Setup
After `npm install` make sure to create a `config.json` in the main directory with your AWS credentials like so:

```
{
  "region": "us-west-2",
  "endpoint": "http://localhost:8000",
  "accessKeyId": "<INSERT_HERE>",
  "secretAccessKey": "<INSERT_HERE>"
}
```

Next, set up your GitHub Strategy credentials for Authenticating User in `index.js`

```
passport.use(new GithubStrategy({
    clientID: "<INSERT_HERE>",
    clientSecret: "<INSERT_HERE>",
    callbackURL: "http://localhost:3000/auth/github/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    return done(null, profile);
  }
));
```

## Running locally

`npm start` runs index.js
`npm run watch` runs development version using nodemon to update on changes in the directory
`npm run watch-css` runs a sass precompiler to update `public/css/main.css` when changes are seen in `scss/main.scss`

## Hosting on AWS
