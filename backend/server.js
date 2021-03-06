import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import mongoose from 'mongoose'
import crypto from 'crypto'
import bcrypt from 'bcrypt'

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/authAPI"
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.Promise = Promise

const userSchema = new mongoose.Schema({
    name: {
      type: String,
      unique: true,
      minlength: 2,
      maxlength: 20,
      required: true
    },
    email: {
      type: String,
      unique: true,
      required: true
    },
    password: {
      type: String,
      required: true,
    },
    accessToken: {
      type: String,
      unique: true,
      default: () => crypto.randomBytes(128).toString('hex')
    }
})

userSchema.pre('save', async function (next) {
  const user = this
  
  // Hash only if password has been changed
  if (!user.isModified('password')) {
    return next()
  }
  const salt = bcrypt.genSaltSync()
  user.password = bcrypt.hashSync(user.password, salt)
  next()
})

const User = mongoose.model('User', userSchema)
const port = process.env.PORT || 8081
const app = express()

app.use(cors())
app.use(bodyParser.json())

// Middleware to authenticate the user
const authenticateUser = async (req, res, next) => {
  try {
    const user = await User.findOne({
      accessToken: req.header('Authorization')
    })
    if (!user) {
      throw 'User not found'
    } 
    req.user = user
    next()
  } catch (err) {
    const errorMessage = 'Please try logging in again'
    res.status(401).json({ error: errorMessage})
  }
}

// Routes
// Registration
app.post('/users', async (req, res) => {
  try {
    const { name, email, password } = req.body
    const user = await new User({
      name, 
      email,
      password
    }).save()
    res.status(201).json({ userId: user._id, accessToken: user.accessToken})
  } catch (err) {
    res.status(400).json({ message: 'Could not create user', errors: err })
  }
})

// Login
app.post('/sessions', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email })
    if (user && bcrypt.compareSync(password, user.password)) {
      // User has provided correct credentials, let's generate a new token for this session
      user.accessToken = crypto.randomBytes(128).toString('hex')
      // Save new access token
      const updatedUser = await user.save()
      res.status(200).json({
        userId: user._id, 
        accessToken: updatedUser.accessToken, 
        name: user.name
      })
    } else {
      throw 'User not found'
    }
  } catch (err) {
    res.status(404).json({ error: 'User not found' })
  }
})

// A LOGOUT ENDPOINT THAT WE DON'T MANAGED TO FINISH ON TIME. TO BE CONTINUED LATER
// Logout
// app.post('/users/logout', authenticateUser)
// app.post('/users/logout', async (req, res) => {
//   try {
//     console.log('Try to log out', req.user.name)
//     req.user.accessToken = ''
//     console.log(req.user.accessToken)
//     await req.user.save()
//     // add a conditional that calls for status to show if user is logged in or out.
//     res.status(200).json({ loggedOut: true })
//   } catch (err) {
//     res.status(400).json({ error: 'Could not logout' })
//   }
// })

// Secure endpoint with content for all logged-in users
app.get('/secrets', authenticateUser)
app.get('/secrets', async (req, res) => {
  try {
    const userName = await req.user.name
    // sending the username in the JSON response so that frontend can use it to show a personalized message
    res.status(200).json({username: userName, message: 'Authentication complete'})
  } catch (err) {
    res.status(401).json({ error: 'Please log in or sign up to see this content'})
  }
})

// Secure endpoint with user specific content 
// to be implemented for red or black level
// app.get('/users/:id', authenticateUser)
// app.get('/users/:id', (req, res) => {
//   res.status(501).send()
// })

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})