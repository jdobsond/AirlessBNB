const UserModel = require('../models/userModel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();

const authUser = async (request, response) => {
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
};

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

module.exports = { authUser, authorizeUser };
