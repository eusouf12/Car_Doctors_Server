const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 5000;
//maiddleware
app.use(cors({
  origin: ['http://localhost:5173', 'car-doctor-df4d3.web.app', 'https://car-doctor-df4d3.firebaseapp.com'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ol9erjn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// middlewares 

const logger = async(req,res,next)=>{
  console.log('called',req.host,req.originalUrl)
  next();
}
const verifyToken = async(req,res,next)=>{
  const token= req.cookies?.token;
  console.log('value of token',token);
  if(!token){
    return res.status(401).send({message : 'Unauthorize access'})
  }
  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
    //error
    if(err){
      console.log('error is ',err)
      return res.status(401).send({message :'unauthorize'})
    }

    //if token are valid
    
    console.log('value of token',decoded);
    req.user=decoded;
    next();
  })
  
}

// const cookeOption ={
//   httpOnly: true,
//   secure: process.env.NODE_ENV=== 'production' ?true : false,
//   sameSite: process.env.NODE_ENV=== 'production' ? 'none':'strict',
// }

async function run() {
  try {
    const ServicesCollection = client.db('Car_Doctor').collection('Services');
    const bookingCollection = client.db('Car_Doctor').collection('bookings');

    // auth related api 
    app.post('/jwt',logger, async (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '50h' });
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: false
          // sameSite: 'no'
        })
        .send({ success: true });
    })

    //  services related api 
    app.get('/services',logger, async (req, res) => {
      const cursor = ServicesCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    // specific id 
    app.get('/services/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        projection: { title: 1, service_id: 1, price: 1, img: 1 },
      };
      const result = await ServicesCollection.findOne(query, options);
      res.send(result);
    })

    //  bookings 
    app.get('/bookings',logger,verifyToken, async (req, res) => {
      console.log(req.query.email);
      // console.log(' token find', req.cookies.token);
      
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    })

    app.post('/bookings', async (req, res) => {
      const booking = req.body;
      console.log(booking);
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    })


    app.patch('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const Updatedata = req.body;
      const data = {
        $set: {
          status: Updatedata.status,
        }
      }
      const result = await bookingCollection.updateOne(filter, data);
      res.send(result);
    })


    app.delete('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    })



    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {

  }
}
run().catch(console.dir);





app.get('/', (req, res) => {
  res.send('doctor is running')
})

app.listen(port, () => {
  console.log(`car Server is running on port ${port}`)
})