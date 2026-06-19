const express  = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;
require('dotenv').config();
app.use(cors());
app.use(express.json());


// default api for express
app.get('/', (req, res) => {
    res.send("Hello, RecipeHub -  Recipe Sharing Platform!");
});



//  here to start all of api with mongodb
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = process.env.MONGODB_URL;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // await client.connect();
        // await client.db('admin').command({ ping: 1 });
        // RecipeHubDB 
        const DB = client.db('RecipeHubDB');
        
        const userCollection = DB.collection('user');

        // here all api for the recipehub project
        app.get('/api/users', async(req, res) => {
            const allUsers = await userCollection.find();
            const users = await allUsers.toArray();
            res.send(users);
        })


        console.log("Pinged your deployment. You successfully connected your MongoDB!");
    } finally {
        //await client.close();
    }
}
run().catch(console.dir);
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
}) 