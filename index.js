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
        
        console.log('Now I will make it protected!');

        const verifyToken = async(req, res, next) => {
            console.log('headers: ', req.headers);
        }
        //verifyToken('83')

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

        app.get('/api/recipe', async(req, res) => {
            //console.log('server side search query: ', req.query);
            const query = {};
            if (req.query.search) {
                query.$or = [
                    {recipeName: { $regex: req.query.search, $options: 'i' }}
                ]
            }
            if (req.query.page) {
                const page = req.query.page;
                const perPage = req.query.perPage || 2;
                const skipItems = (page - 1) * perPage;
                const total = await recipeCollection.countDocuments(query);
                const recipe = recipeCollection.find(query).skip(skipItems).limit(perPage);
                const recipes = await recipe.toArray();
                return res.send(recipes);
            }
            const result = await recipeCollection.find(query);
            const recipe = await result.toArray();
            res.send(recipe);
        })
        app.get('/api/recipe/:id', async(req, res) => {
            const id = req.params.id;
            // const query = {
            //     _id: new ObjectId(id)
            // }
            //const { id } = await params;
            const result = await recipeCollection.findOne({ _id: new ObjectId(id) });
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
        


        
        // get user added recipe
        // user all recipe for crud operation
        app.get('/api/user-recipe', async(req, res) => {
            const recipes = await recipeCollection.find().toArray();
            const query = {}
            if (req.query.authorId) {
                query.authorId = req.query.authorId;
            }
            const result = await recipeCollection.find(query).toArray();
            res.send(result);
        })
        // user recipe by user id and then recipe id
        app.get('/api/user-recipe/:id', async(req, res) => {
            const id = req.params.id;
            const recipes = await recipeCollection.findOne({ _id: new ObjectId(id) })
            res.send(recipes);
        })
        // user recipe by user id and then recipe id
        // for update
        app.patch('/api/user-recipe/:id', async(req, res) => {
            try {
                const { id } = req.params;
                const { authorId } = req.query;
                const recipeData = req.body;
                if (!id || !authorId) {
                    return res.status(400).send({
                        success: false,
                        message: 'Recipe Id and AuthorId are require'
                    })
                }
                const filter = {
                    _id: new ObjectId(id),
                    authorId: authorId
                }
                if (!filter) {
                    return res.status(404).send({
                        success: false,
                        message: 'Recipe Id and Author Id not found!'
                    })
                }
                const updatedDocument = {
                    $set: {
                        recipeName: recipeData.recipeName,
                        category: recipeData.category,
                        recipeImage: recipeData.recipeImage
                    }
                }
                const result = await recipeCollection.updateOne(filter, updatedDocument);
                res.status(200).send({
                    success: true,
                    message: 'Recipe Updated successfully!',
                    data: result
                })
            } catch {
                res.status(500).send({
                    success: false,
                    message: 'Error Updating Recipe!',
                    error: error.message
                });
            }
        })
        // delete recipe by recipe id and author id
        app.delete('/api/user-recipe/:id', async(req, res) => {
            // const { id } = req.params;//.id;
            // const { authorId } = req.params; //.authorId;
            // const recipe = await recipeCollection.findOneAndDelete({
            //     _id: id,
            //     authorId: authorId
            // });
            // res.send(recipe);
            
            // here all of send previous had json
            try {
                const { id } = req.params;
                const { authorId } = req.query;
                if (!id || !authorId) {
                    return res.status(400).send({
                        success: false,
                        message: 'Recipe Id and Author Id are required'
                    });
                }

                const recipe = await recipeCollection.findOneAndDelete({
                    _id: new ObjectId(id),
                    authorId: authorId
                });

                if (!recipe) {
                    return res.status(404).send({
                        success: false,
                        message: 'Recipe not found or you are not authorized to delete it!'
                    });
                }
                res.status(200).send({
                    success: true,
                    message: 'Recipe Deleted successfully',
                    data: recipe
                });
            } catch {
                res.status(500).send({
                    success: false,
                    message: 'Error deleting recipe',
                    error: error.message
                });
            }
        });


        // user plan and subscription api
        // get plan
        app.get('/api/plans', async(req, res) => {
            // below code is show all plans
            // const result = await plansCollection.find();
            // const planData = await result.toArray();
            // res.send(planData);

            // now show only specific id plan
            const query = {};
            if (req.query.id) {
                query.id = req.query.id
            }
            const plan = await plansCollection.findOne(query);
            // if (!plan) {
            //     return res.json({ name: 'free', maxRecipePerUser: 2 });
            // }
            res.send(plan);
        })
        // subscription api
        app.post('/api/subscriptions', async(req, res) => {
            const data = req.body;
            const subscriberInformation = {
                ...data,
                userId: data.userId,
                transactionId: data.transactionId || null,
                subscriptionId: data.subscriptionId || null,
                status: 'active',
                createdAt: new Date()
            }
            const result = await subscriptionCollection.insertOne(subscriberInformation);
            
            const fileterUser = { email: data.email };
            const userPlanUpdate = {
                $set: {
                    plan: data.planId,
                    subscriptionId: data.subscriptionId || null,
                    updatedAt: new Date(),
                    transactionId: data.transactionId || null
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