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
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
        const recipeCollection = DB.collection('recipes');
        const plansCollection = DB.collection('plans');
        const subscriptionCollection = DB.collection('subscriptions');

        // here all api for the recipehub project
        app.get('/api/users', async(req, res) => {
            const allUsers = await userCollection.find();
            const users = await allUsers.toArray();
            res.send(users);
        })
        

        

        // recipe crud operation
        app.get('/api/my/recipe', async(req, res) => {
            const id = req.params.id;
            const query = {
                _id: new ObjectId(id)
            }
            const recipe = await recipeCollection.find(query);
            const result = await recipe.toArray();
            res.send(result);
        })
        app.post('/api/recipe', async(req, res) => {
            const recipe = req.body;
            const newRecipe = {
                ...recipe,
                createdAt: new Date(),
                updatedAt: new Date()
            }
            const result = await recipeCollection.insertOne(newRecipe);
            res.send(result);
        })
        

        // user plan and subscription api
        // get plan
        app.get('/api/plans', async(req, res) => {
            const result = await plansCollection.find();
            const planData = await result.toArray();
            res.send(planData);
        })
        // subscription api
        app.post('/api/subscriptions', async(req, res) => {
            const data = req.body;
            const subscriberInformation = {
                ...data,
                createdAt: new Date()
            }
            const result = await subscriptionCollection.insertOne(subscriberInformation);

            const fileterUser = { email: data.email };
            const userPlanUpdate = {
                $set: {
                    plan: data.planId
                },
            }
            const updatedUserPlan = await userCollection.updateOne(fileterUser, userPlanUpdate);
            res.send(updatedUserPlan);

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