//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const _ = require("lodash");

mongoose.connect('mongodb://localhost:27017/fifacupDB', { useNewUrlParser: true })

const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));


// MODELING ####################################################################
const playerIconSchema = new mongoose.Schema({
  name: String,
  img: String,

})
const PlayerIcon = mongoose.model("PlayerIcon", playerIconSchema)

const playerSchema = new mongoose.Schema({
  name: String,
  img: [],
  clubs_attached: [],
  wins: Number,
  draws: Number,
  losses: Number,
  titles: []
})
const Player = mongoose.model("Player", playerSchema)

const cupSchema = new mongoose.Schema({
  name: String,
  img: String,
  img_banner: String,
  leagues_involved:[],
  starting_round: [],
  fourth_round: [],
  fifth_round: [],
  quarter_finals: [],
  semi_finals: [],
  finals: []
})
const Cup = mongoose.model("Cup", cupSchema)

const countrySchema = new mongoose.Schema({
  name: String,
  img: String,
  leagues:[],
  cups: []
})
const Country = mongoose.model("Country", countrySchema)

const newCupSchema = new mongoose.Schema({
  country: String,
  name: String,
  img: String,
  img_banner: String,
  leagues_involved:[],
  starting_round: [],
  fourth_round: [],
  fifth_round: [],
  quarter_finals: [],
  semi_finals: [],
  finals: [],
  players: [],
  tag: String,
  date: String
})
const NewCup = mongoose.model("NewCup", newCupSchema)
// #############################################################################

// ROOT AND HOME ROUTE BUNDLED
app.get("/", (req, res) => {
  res.redirect("/home")
})
app.get("/home", (req, res) => {
  res.render("home")
})

// Created Tournaments List
app.get("/customized_tournaments", (req, res) => {
  NewCup.find((err, results) => {
    if(results){
      res.render("customized_tournaments_list", {cups: results})
    }
    else {
      console.log(err);
      res.render("/home")
    }
  })
})
app.get("/customized_tournaments/details/:id", (req, res) => {
  NewCup.findOne({_id: req.params.id}, (err, result) => {
    if(result){
      res.render("customized_tournament_details", {cup: result})
    }
    else {
      res.redirect("/customized_tournaments")
    }
  })
})

// choose the country where the cup originates from
app.get("/new_tournament/country", (req, res) => {

  Country.find((err, results) => {
    if(results){
      res.render("country_list", {countries: results})
    }
    else{
      console.log(err);
      res.redirect("/home")
    }
  })

})

// choose the cup to customize
app.get("/new_tournament/:country/cups", (req, res) => {

  const country = req.params.country;

  Country.find({name: country}, (err, result) => {
    if(result){
      res.render("cup_list", {cups: result[0]})
    }
    else {
      console.log(err);
      res.redirect("/new_tournament/country")
    }
  })

})

// add players who will participate
app.get("/new_tournament/:country/:cup/players", (req, res) => {
  const country = req.params.country
  const cup = req.params.cup

  Player.find((err, results) => {
    if(results){
      res.render("adding_players", {cup: cup, country: country, players: results})
    }
    else{
      console.log(err);
      res.redirect("/new_tournament/country")
    }
  })

})

// customize the cup to your liking and save
app.post("/new_tournament/:country/:cup/customize", (req, res) => {
  // expecting values from url parameters
  // country name paramter
  const country = req.params.country
  // cup name paramter
  const cupName = req.params.cup
  //create a new date()
  const date = new Date();

  //expecting form data
  // player names created and collected here and are needed for the new cup's player's array
  const playerName = req.body.playerName
  const players = [];
  const newPlayers = [];
  players.push(playerName)

  for(let i = 0; i < players[0].length; i++){
    Player.findOne({name: players[0][i]}, (err, result) => {
      if(result){
        newPlayers.push(result)
      }
      else{
        console.log(err);
        const newPlayer = new Player({
          name: players[0][i],
          img: [],
          clubs_attached: [],
          wins: 0,
          draws: 0,
          losses: 0,
          titles: []
        });
        newPlayer.save();
        newPlayers.push(newPlayer)
      }
    })
  }

  //create a tournament tag to send along for later identification
  let tag = Math.random() * 1;
  tag = tag.toString();

  // Find the cup template
  Cup.find({name: cupName},(err, result) => {
    // If the cup template exists
    if(result){
      const cup_template = result[0];
      for(let fixture of cup_template.starting_round){
        let randnum = Math.random() * 1;
        if(randnum > .50){
          fixture.home_tag = players[0][0]
          fixture.away_tag = players[0][1]
        } else {
          fixture.home_tag = players[0][1]
          fixture.away_tag = players[0][0]
        }
      };


      // create a new cup and add the details from the cup template as well as the players array
      const newCup = new NewCup({
        country: country,
        name: cup_template.name,
        img: cup_template.img,
        img_banner: cup_template.img_banner,
        leagues_involved:cup_template.leagues_involved,
        starting_round: cup_template.starting_round,
        fourth_round: [],
        fifth_round: [],
        quarter_finals: [],
        semi_finals: [],
        finals: [],
        players: newPlayers,
        tag: tag,
        date: date,
      });

      newCup.save();
      setTimeout(() => {
        res.redirect(`/new_cup/finalize/${tag}`)
      }, 1500);

    }
    else{
      console.log(err);
      res.redirect("/new_tournament/country");
      // give the database time to add the new cup before redirecting
    }
  })

})

// finalize everything looks right ie: fixtures and player matchups are to your
// liking. then save
app.get("/new_cup/finalize/:tag", (req, res) => {
  const tag = req.params.tag;
  NewCup.findOne({tag: tag}, (err, result) => {
    if(result){
      res.render("new_cup_finalize", {cup: result})
    }
    else{
      console.log(err);
      res.redirect("/new_tournament/country")
    }
  })
})

// customized tournamnet is saved
app.post("/new_tournament/save/:id", (req, res) => {
  const id = req.params.id;
  const home = req.body.home_option;
  const away = req.body.away_option;

  NewCup.findOne({_id: id}, (err, result) => {
    if(result){
      const cup = result;
      for(let tag of cup.starting_round){
        for(let player of home){
          tag.home_tag = player;
        }
      }
      for(let tag of cup.starting_round){
        for(let player of away){
          tag.away_tag = player;
        }
      }
      NewCup.updateOne({_id: id}, {starting_round: cup.starting_round}, (err) => {
        if(err){
          console.log(err);
        }
        else{
          res.redirect(`/new_tournament/start/${id}`)
        }
      })
    }
    else{
      console.log(err);
      res.redirect("/")
    }
  })

})

//start tournament
app.get("/new_tournament/start/:id", (req, res) => {
  NewCup.findOne({_id: req.params.id}, (err, result) => {
    if(result){
      res.render("cup_start", {cup: result});
    }
    else {
      console.log(err);
      res.redirect("/home")
    }
  })
})

// Cup begins intro
app.get("/begin_tournament/:id", (req, res) => {
  const id = req.params.id;
  NewCup.findOne({_id: id}, (err,result) => {
    if(result){
      res.render("customized_tournament_details", {cup: result})
    }
  })
})

// updating fixture scores
app.post("/score_alert/:id/:match_id", (req, res) => {
  const id = req.params.id;
  const match_id = req.params.match_id;

  const home_score = (req.body.home_score);
  home_score.toString()
  const away_score = req.body.away_score;
  away_score.toString()

  console.log(`match id: ${match_id}`);
  console.log(`home goals: ${home_score}`);
  console.log(`away goals: ${away_score}`);

  NewCup.find({_id: id}, (err, result) => {
    if(result){
      const cup = result[0];
      const starting_round = cup.starting_round
      // updating the scores for the particular match
      for(let fixture of starting_round){
        if(match_id === fixture.match_id.toString()){
          console.log(`match ${match_id} = fixture match id ${fixture.match_id}`);
          fixture.home_goals = home_score;
          fixture.away_goals = away_score;
        }
      }

      NewCup.updateOne({_id: id}, {starting_round: starting_round}, (err) => {
        if(err){
          console.log(err);
          res.redirect(`/customized_tournaments/details/${id}`)
        }
        else {
          console.log("cup fixture results updated successfully.");
          res.redirect(`/customized_tournaments/details/${id}`)
        }
      })
    }
    else {
      console.log(err);
      res.redirect(`/customized_tournaments/details/${id}`)
    }
  })

})



// Route used exclusivley for seeding the DB
app.get("/seed", (req, res) => {

const footballing_genius = new PlayerIcon({
  name: "Footballing Genius",
  img: "/images/managers/footballing_genius.png",
})
footballing_genius.save();
/*
  //create a new country
  const england = new Country({
    name: "England",
    img: "/images/flag_eng.png",
    leagues:[],
    cups: [
      {
        name: "Emirates FA Cup",
        img: "/images/facup.png"
      },
      {
        name: "EFL Caraboa Cup",
        img: "/images/caraboacup.png"
      }
    ]
  });
  england.save();
  res.redirect("/new_tournament/country")
*/

/*
  //update a country
  Country.updateOne({name: "Germany"}, {cups: [{name: "DFB Pokal", img: "/images/dfbpokal.png"}]}, (err) => {
    if(!err){
      res.redirect("/new_tournament/country");
    }
    else{
      console.log(err);
      res.redirect("/")
    }
  })
*/


/*
  // update a cup template
  Cup.updateOne({name: "Emirates FA Cup"}, {img_banner: "/images/facup_banner.png"}, (err) => {
    if(err){
    console.log(err);
    }
    else{
      console.log("Doc updated");
      res.redirect("/new_tournament/country")
    }
  })
*/

/*
  // delete a country
  Country.deleteOne({_id: "62058ea510027c404d7bfdcb"}, (err) => {
    if(err){
      console.log(err);
    }
    else {
      res.redirect("/new_tournament/country")
    }
  })
*/

/*
  // create a cup
  const facup = new Cup({
    name: "Emirates FA Cup",
    img: "/images/facup.png",
    img_banner: "/images/facup_banner.png",
    leagues_involved:[],
    starting_round: [
    {
      match_id: 01,
      real_time_date: "Jan 7",
      home_club: 'Swindon Town',
      away_club: 'Man City',
      home_img: '/images/swindon_town.png',
      away_img: '/images/man_city.png',
      home_goals: '',
      away_goals: '',
      home_tag: '',
      away_tag: ''
    },
    {
      match_id: 02,
      real_time_date: "Jan 8",
      home_club: 'Hartlepool',
      away_club: 'Blackpool',
      home_img: '/images/hartlepool.png',
      away_img: '/images/blackpool.png',
      home_goals: '',
      away_goals: '',
      home_tag: '',
      away_tag: ''
    },
    {
      match_id: 03,
      real_time_date: "Jan 8",
      home_club: 'Burnley',
      away_club: 'Huddersfield',
      home_img: '/images/burnley.png',
      away_img: '/images/huddersfield.png',
      home_goals: '',
      away_goals: '',
      home_tag: '',
      away_tag: ''
    },
    {
      match_id: 04,
      real_time_date: "Jan 8",
      home_club: 'Millwall',
      away_club: 'Crystal Palace',
      home_img: '/images/millwall.png',
      away_img: '/images/crystal_palace.png',
      home_goals: '',
      away_goals: '',
      home_tag: '',
      away_tag: ''
    },
    {
      match_id: 05,
      real_time_date: "Jan 8",
      home_club: 'Newcastle',
      away_club: 'Cambridge United',
      home_img: '/images/newcastle.png',
      away_img: '/images/cambridge_united.png',
      home_goals: '',
      away_goals: '',
      home_tag: '',
      away_tag: ''
    },
    {
      match_id: 06,
      real_time_date: "Jan 8",
      home_club: 'Barnsley',
      away_club: 'Barrows',
      home_img: '/images/barnsley.png',
      away_img: '/images/default_shield.png',
      home_goals: '',
      away_goals: '',
      home_tag: '',
      away_tag: ''
    },
    {
      match_id: 07,
      real_time_date: "Jan 8",
      home_club: 'Leicester City',
      away_club: 'Watford',
      home_img: '/images/leicester_city.png',
      away_img: '/images/watford.png',
      home_goals: '',
      away_goals: '',
      home_tag: '',
      away_tag: ''
    },
    {
      match_id: 08,
      real_time_date: "Jan 8",
      home_club: 'Portvale',
      away_club: 'Brentford',
      home_img: '/images/portvale.png',
      away_img: '/images/brentford.png',
      home_goals: '',
      away_goals: '',
      home_tag: '',
      away_tag: ''
    },
    {
      match_id: 09,
      real_time_date: "Jan 8",
      home_club: 'QPR',
      away_club: 'Rotherham',
      home_img: '/images/qpr.png',
      away_img: '/images/rotherham.png',
      home_goals: '',
      away_goals: '',
      home_tag: '',
      away_tag: ''
    },
    {
      match_id: 10,
      real_time_date: "Jan 8",
      home_club: 'Chelsea',
      away_club: 'Chesterfield',
      home_img: '/images/chelsea.png',
      away_img: '/images/chesterfield.png',
      home_goals: '',
      away_goals: '',
      home_tag: '',
      away_tag: ''
    },
    {
      match_id: 11,
      real_time_date: "Jan 8",
      home_club: 'Swansea',
      away_club: 'Southampton',
      home_img: '/images/swansea_city.png',
      away_img: '/images/southampton.png',
      home_goals: '',
      away_goals: '',
      home_tag: '',
      away_tag: ''
    },
    {
      match_id: 12,
      real_time_date: "Jan 8",
      home_club: 'Mansfield Town',
      away_club: 'Middlesbrough',
      home_img: '/images/mansfield_town.png',
      away_img: '/images/middlesbrough.png',
      home_goals: '',
      away_goals: '',
      home_tag: '',
      away_tag: ''
    },
    {
      match_id: 13,
      real_time_date: "Jan 8",
      home_club: 'Bristol City',
      away_club: 'Fulham',
      home_img: '/images/bristol_city.png',
      away_img: '/images/fulham.png',
      home_goals: '',
      away_goals: '',
      home_tag: '',
      away_tag: ''
    },
    {
      match_id: 14,
      real_time_date: "Jan 8",
      home_club: 'Coventry',
      away_club: 'Derby County',
      home_img: '/images/coventry.png',
      away_img: '/images/fulham.png',
      home_goals: '',
      away_goals: '',
      home_tag: '',
      away_tag: ''
    },
    {
      match_id: 15,
      real_time_date: "Jan 8",
      home_club: 'Boreham Wood',
      away_club: 'AFC Wimbleton',
      home_img: '/images/boreham_wood.png',
      away_img: '/images/afc_wimbleton.png',
      home_goals: '',
      away_goals: '',
      home_tag: '',
      away_tag: ''
    },
    {
      match_id: 16,
      real_time_date: "Jan 8",
      home_club: 'Peterborough',
      away_club: 'Bristol Rovers',
      home_img: '/images/peterborough.png',
      away_img: '/images/bristol_rovers.png',
      home_goals: '',
      away_goals: '',
      home_tag: '',
      away_tag: ''
    },
    {
      match_id: 17,
      real_time_date: "Jan 8",
      home_club: 'West Brom',
      away_club: 'Brighton',
      home_img: '/images/west_brom.png',
      away_img: '/images/brighton.png',
      home_goals: '',
      away_goals: '',
      home_tag: '',
      away_tag: ''
    },
    {
      match_id: 18,
      real_time_date: "Jan 8",
      home_club: "kid'minster",
      away_club: 'Reading',
      home_img: '/images/kidminster.png',
      away_img: '/images/reading.png',
      home_goals: '',
      away_goals: '',
      home_tag: '',
      away_tag: ''
    },
    {
      match_id: 19,
      real_time_date: "Jan 8",
      home_club: "Wigan Athletc",
      away_club: 'Blackburn Rovers',
      home_img: '/images/wigan_athletic.png',
      away_img: '/images/blackburn_rovers.png',
      home_goals: '',
      away_goals: '',
      home_tag: '',
      away_tag: ''
    },
    {
      match_id: 20,
      real_time_date: "Jan 8",
      home_club: "Hull City",
      away_club: 'Everton',
      home_img: '/images/hull_city.png',
      away_img: '/images/everton.png',
      home_goals: '',
      away_goals: '',
      home_tag: '',
      away_tag: ''
    },
    {
      match_id: 21,
      real_time_date: "Jan 8",
      home_club: "Birmingham",
      away_club: 'Plymouth Argyle',
      home_img: '/images/birmingham.png',
      away_img: '/images/plymouth_argyle.png',
      home_goals: '',
      away_goals: '',
      home_tag: '',
      away_tag: ''
    },
    {
      match_id: 22,
      real_time_date: "Jan 8",
      home_club: "Yeovil Town",
      away_club: 'Bournemouth',
      home_img: '/images/yeovil_town.png',
      away_img: '/images/bournemouth.png',
      home_goals: '',
      away_goals: '',
      home_tag: '',
      away_tag: ''
    },
    {
      match_id: 23,
      real_time_date: "Jan 9",
      home_club: "Luton Town",
      away_club: 'Harrogate Town',
      home_img: '/images/luton_town.png',
      away_img: '/images/default_shield.png',
      home_goals: '',
      away_goals: '',
      home_tag: '',
      away_tag: ''
    },
    {
      match_id: 24,
      real_time_date: "Jan 9",
      home_club: "Cardiff City",
      away_club: 'Preston',
      home_img: '/images/cardiff_city.png',
      away_img: '/images/preston.png',
      home_goals: '',
      away_goals: '',
      home_tag: '',
      away_tag: ''
    },
    {
      match_id: 25,
      real_time_date: "Jan 9",
      home_club: "Wolves",
      away_club: 'Sheffield United',
      home_img: '/images/wolves.png',
      away_img: '/images/sheffield_united.png',
      home_goals: '',
      away_goals: '',
      home_tag: '',
      away_tag: ''
    },
    {
      match_id: 26,
      real_time_date: "Jan 9",
      home_club: "Tottenham",
      away_club: 'Morecambe',
      home_img: '/images/tottenham.png',
      away_img: '/images/morecambe.png',
      home_goals: '',
      away_goals: '',
      home_tag: '',
      away_tag: ''
    },
    {
      match_id: 27,
      real_time_date: "Jan 9",
      home_club: "Nottingham Forest",
      away_club: 'Arsenal',
      home_img: '/images/nottingham_forest.png',
      away_img: '/images/arsenal.png',
      home_goals: '',
      away_goals: '',
      home_tag: '',
      away_tag: ''
    },
    {
      match_id: 28,
      real_time_date: "Jan 9",
      home_club: "Stoke City",
      away_club: 'Leyton Orient',
      home_img: '/images/stoke_city.png',
      away_img: '/images/leyton_orient.png',
      home_goals: '',
      away_goals: '',
      home_tag: '',
      away_tag: ''
    },
    {
      match_id: 29,
      real_time_date: "Jan 9",
      home_club: "Charlton ",
      away_club: 'Norwich City',
      home_img: '/images/charlton.png',
      away_img: '/images/norwich_city.png',
      home_goals: '',
      away_goals: '',
      home_tag: '',
      away_tag: ''
    },
    {
      match_id: 30,
      real_time_date: "Jan 9",
      home_club: "West Ham ",
      away_club: 'Leeds',
      home_img: '/images/west_ham.png',
      away_img: '/images/leeds.png',
      home_goals: '',
      away_goals: '',
      home_tag: '',
      away_tag: ''
    },
    {
      match_id: 31,
      real_time_date: "Jan 9",
      home_club: "Liverpool",
      away_club: 'Shrewsbury',
      home_img: '/images/liverpool.png',
      away_img: '/images/shrewsbury.png',
      home_goals: '',
      away_goals: '',
      home_tag: '',
      away_tag: ''
    },
    {
      match_id: 32,
      real_time_date: "Jan 10",
      home_club: "Man United",
      away_club: 'Aston Villa',
      home_img: '/images/man_united.png',
      away_img: '/images/aston_villa.png',
      home_goals: '',
      away_goals: '',
      home_tag: '',
      away_tag: ''
    },
  ],
    fourth_round: [],
    fifth_round: [],
    quarter_finals: [],
    semi_finals: [],
    finals: []
  })
  facup.save();
  res.redirect("/new_tournament/country");
*/

/*
  //update a cup
  Cup.update({name: "Emirates FA Cup"}, {img_banner: "/images/facup_banner.png"}, (err) => {
    if(err){
      console.log(err);
    }
    else {
      res.redirect("/new_tournament/country")
    }
  })
*/
/*
const moyes = new Player({
  name: "Moyes",
  img: "/images/managers/manager_moyes.png",
  clubs_attached: [],
  wins: 0,
  draws: 0,
  losses: 0,
  titles: []
})
moyes.save();
res.redirect("/new_tournament/country")
*/
})




// LOCAL HOST RUNNING ON PORT 3000
let port = process.env.PORT;
if (port == null || port == "") {
  port = 8000;
}
app.listen(port);
