const express = require("express");
const cors = require('cors');
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
async function run() {
    try {
        await client.connect();
        const serviceCollection = client.db("doctors").collection("services");
        const bookingCollection = client.db("doctors").collection("booking");
        app.get('/service',async(req,res)=>{
            const query={}
            const cursor=serviceCollection.find(query)
            const result=await cursor.toArray()
            res.send(result)
        })

        app.post('/booking',async(req,res)=>{
          const booked=req.body
          const query = { treatment: booked.treatment ,date:booked.date,patentEmail:booked.patentEmail};
          const exists=await bookingCollection.findOne(query)
          if(exists){
            return res.send({success:false,exists})
          }
          const result=await bookingCollection.insertOne(booked)
        return res.send({success:true,result})
        })

        app.get('/available',async (req,res)=>{
          const date=req.query.date 
          //get all services 
          const services=await serviceCollection.find().toArray()
          //get all booking of that day
          const query={date:date} 
          const booking=await bookingCollection.find(query).toArray()

          //for each service
          services.forEach(service=>{
            //find booking for that service
            const serviceBooking=booking.filter(book=>book.treatment===service.name)
            //select slots for the service booking
            const bookedSlots=serviceBooking.map(book=>book.slot)
            //select those slots that are not in bookedSlots
            const available=service.slots.filter(s=>! bookedSlots.includes(s))
            service.slots=available
          })
          res.send(services);
        })
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
