const express = require("express");
const cors = require('cors');
const jwt = require("jsonwebtoken");
require('dotenv').config()
const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();
const port =process.env.PORT || 4000;


app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jlz0a.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req,res,next){
  const authHeaders = req.headers.authorization;
  if (!authHeaders) {
    return res.status(401).send({ message: "unauthorized access" });
  }
const token = authHeaders.split(' ')[1]
jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
  if(err){
    return res.status(403).send({ message: "forbidden access" });
  }
  req.decoded=decoded
  next()
});
}
async function run() {
    try {
      await client.connect();
      const serviceCollection = client.db("doctors").collection("services");
      const bookingCollection = client.db("doctors").collection("booking");
      const userCollection = client.db("doctors").collection("users");
      app.get("/service", async (req, res) => {
        const query = {};
        const cursor = serviceCollection.find(query);
        const result = await cursor.toArray();
        res.send(result);
      });

      //get all users
      app.get('/users',verifyJWT,async(req,res)=>{
        const users=await userCollection.find().toArray()
        res.send(users)
      })

      //check admin
      app.get('/admin/:email',async(req,res)=>{
        const email=req.params.email
        const user=await userCollection.findOne({email})
        const isAdmin=user.role==='admin'
        res.send({admin:isAdmin})
      })

      //added admin role
      app.put('/user/admin/:email',verifyJWT,async(req,res)=>{
        const email=req.params.email
        const requester=req.decoded.email
        const requesterAccount=await userCollection.findOne({email:requester})
        if(requesterAccount.role){
          const query = { email };
          const updateDoc = {
            $set: { role: "admin" },
          };
          const result = await userCollection.updateOne(query, updateDoc);
          res.send(result);
        }else{
          return res.status(403).send({ message: "forbidden access" });
        }
        
      })
        //when user sign in and login then get a token
      app.put('/user/:email',async(req,res)=>{
        const email=req.params.email
        const user=req.body
        const query={email}
        const options = { upsert: true };
        const updateDoc = {
          $set: user,
        };
        const result = await userCollection.updateOne(
          query,
          updateDoc,
          options
        );
        const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, {
          expiresIn: "1h",
        });
        res.send({result,token})
      })

      app.get('/booking',verifyJWT,async(req,res)=>{
        const patentEmail = req.query.patentEmail
        const decodedEmail=req.decoded.email
        if(patentEmail===decodedEmail){
          const query = { patentEmail };
          const bookings = await bookingCollection.find(query).toArray();
          return res.send(bookings);
        }else{
          return res.status(403).send({ message: "forbidden access" })
        }
      })

      app.post("/booking", async (req, res) => {
        const booked = req.body;
        const query = {
          treatment: booked.treatment,
          date: booked.date,
          patentEmail: booked.patentEmail,
        };
        const exists = await bookingCollection.findOne(query);
        if (exists) {
          return res.send({ success: false, exists });
        }
        const result = await bookingCollection.insertOne(booked);
        return res.send({ success: true, result });
      });
      //heroku link:https://infinite-oasis-14663.herokuapp.com/available
      app.get("/available", async (req, res) => {
        const date = req.query.date;
        //get all services
        const services = await serviceCollection.find().toArray();
        //get all booking of that day
        const query = { date: date };
        const booking = await bookingCollection.find(query).toArray();

        //for each service
        services.forEach((service) => {
          //find booking for that service
          const serviceBooking = booking.filter(
            (book) => book.treatment === service.name
          );
          //select slots for the service booking
          const bookedSlots = serviceBooking.map((book) => book.slot);
          //select those slots that are not in bookedSlots
          const available = service.slots.filter(
            (s) => !bookedSlots.includes(s)
          );
          service.slots = available;
        });
        res.send(services);
      });
    } finally {
    // await client.close();
  }
}
run().catch(console.dir);


app.get("/", (req, res) => {
  res.send("Hello doctors portal website");
});

app.listen(port, () => {
  console.log(`doctors portal listening on port ${port}`);
});
