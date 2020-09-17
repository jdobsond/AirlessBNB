const mongoose = require('mongoose');
const express = require('express');
require('dotenv').config();
const listings = require('./aspenData');
const path = require('path');
const bcrypt = require('bcrypt');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { response } = require('express');

const app = express();
app.use(express.json());
app.use(cors());
const un = process.env.user;
const pw = process.env.password;
mongoose.connect(
  `mongodb+srv://${un}:${pw}@cluster0.kzid4.mongodb.net/airbnbDb?retryWrites=true&w=majority`,
  { useNewUrlParser: true, useUnifiedTopology: true },
);

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true, unique: true },
  firstname: { type: String },
  lastname: { type: String },
});

const listingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  state: { type: String, required: true },
  price: { type: String, required: true },
  guestAmount: { type: String, required: true },
  bedAmount: { type: String, required: true },
  bathAmount: { type: String, required: true },
  parking: { type: String, required: true },
  image: { type: String, required: true },
  city: { type: String, required: true },
  rating: { type: String, required: true },
  description: { type: String, required: true },
  fireExtinguisher: { type: String, required: true },
});

const reservationSchema = new mongoose.Schema({
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  reservedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  reservedListing: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'listing',
  },
});

const ListingModel = mongoose.model('listing', listingSchema);

const UserModel = mongoose.model('user', userSchema);

const ReservationModel = mongoose.model('reservation', reservationSchema);

//create a user
// get all listings
// create a listing
// get listings by city/state/etc

app.post('/user', async (request, response) => {
  try {
    console.log('post a user');
    const username = request.body.username;
    const password = request.body.password;
    const firstname = request.body.firstname;
    const lastname = request.body.lastname;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new UserModel({
      username,
      password: hashedPassword,
      firstname,
      lastname,
    });

    const createdUser = await UserModel.create(user);

    response.status(201).send(createdUser);
  } catch (error) {
    response.status(500).send(error);
  }
});

app.get('/users', async (request, response) => {
  try {
    const users = await UserModel.find();
    response.status(200).send(users);
  } catch (error) {
    console.log(error);
  }
});

app.post('/listing', async (request, response) => {
  try {
    console.log('post a listing');
    const listInstance = new ListingModel(request.body);
    const createdListing = await ListingModel.create(listInstance);
    response.status(201).send(createdListing);
  } catch (error) {
    response.status(500).send(error);
  }
});

app.get('/listings', async (request, response) => {
  try {
    console.log('get all listings');
    const listings = await ListingModel.find();
    response.status(200).send(listings);
  } catch (error) {
    response.status(500).send(error);
  }
});

app.get('/listingbycity', async (request, response) => {
  try {
    // console.log("get listing by city");
    const city = request.query.city;
    const cityListing = await ListingModel.find({ city });
    response.status(200).send(cityListing);
  } catch (error) {
    response.status(500).send(error);
  }
});
//initial loop used to create 50 listings
async function listingLoop() {
  try {
    for (let i = 0; i < listings.length; i++) {
      const listingsArr = await ListingModel.create(listings[i]);
    }
    // for (let i = 0; i < listings.length; i++) {
    //   if (listings[i].description == null) {
    //     console.log(listings[i]);
    //   }
    // }
  } catch (error) {
    console.log(error);
  }
}

app.get('/reservation', async (request, response) => {
  try {
    const reservation = await ReservationModel.find();
    response.status(200).send(reservation);
  } catch (error) {
    console.log(error);
  }
});

app.post('/reservation', authorizeUser, async (request, response) => {
  try {
    console.log(request.body);
    const startDate = request.body.startDate;
    const endDate = request.body.endDate;
    const reservedBy = request.decodedToken.id;
    const reservedListing = request.body.reservedListing;
    const createdReservation = await ReservationModel.create({
      startDate,
      endDate,
      reservedBy,
      reservedListing,
    });
    response.status(201).send(createdReservation);
  } catch (error) {
    response.status(500).send(error);
    console.log(error);
  }
});

app.delete('/reservation', async (request, response) => {
  try {
    const id = request.query.id;
    const result = await ReservationModel.findByIdAndDelete(id);
    response.status(200).send(result);
  } catch (error) {
    response.status(500).send(error);
  }
});

app.post('/authenticateuser', async (request, response) => {
  try {
    const username = request.body.username;
    const password = request.body.password;
    if (!username || !password) {
      return response.status(400).send({ message: 'invalid credentials' });
    }
    const result = await UserModel.find({ username });
    const userResult = result[0];
    if (userResult) {
      if (await bcrypt.compare(password, userResult.password)) {
        const user = { id: userResult._id };
        const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN);
        // console.log(accessToken);
        return response
          .status(200)
          .send({ jwt: accessToken, message: 'Login successful' });
      } else
        return response.status(400).send({ message: 'incorrect password' });
    } else return response.status(400).send({ message: 'incorrect username' });
  } catch (error) {
    response.status(500).send(error);
  }
});

function authorizeUser(request, response, next) {
  let token = request.body.token;
  if (token == null) {
    console.log(token, 'token is null');
  }
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decodedToken) => {
    if (err) return response.status(403).send({ message: err });
    console.log('user is authed and decoded token is ', decodedToken);
    request.decodedToken = decodedToken;
    next();
  });
  // next();
}

app.listen(4000, () => console.log('app is listening on 4000'));

app.get('/', async (request, response) => {
  try {
    console.log('send home page');
    response.sendFile(path.join(__dirname + '/views/airbnb.html'));
  } catch (error) {
    console.log(error);
    response.status(500).send(error);
  }
});

app.get('/listingspage', async (request, response) => {
  try {
    console.log('send home page');
    response.sendFile(path.join(__dirname + '/views/listings.html'));
  } catch (error) {
    console.log(error);
    response.status(500).send(error);
  }
});
