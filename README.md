# Mooni Expense Tracking

## Setup
After `npm install` make sure to create a `config.json` with your AWS credentials like so:

```
{
  "region": "us-west-2",
  "endpoint": "http://localhost:8000",
  "accessKeyId": "<INSERT_HERE>",
  "secretAccessKey": "<INSERT_HERE>"
}
```

Next, set up your GitHub Strategy for Authenticating User in `index.js`

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
