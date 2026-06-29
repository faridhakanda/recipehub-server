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
        const BuyRecipeCollection = DB.collection('buyrecipe');
        const favoriteCollection = DB.collection('favorite');
        const savedCollection = DB.collection('saved');
        const likeCollection = DB.collection('like');
        
        // for verify user and admin with verify token
        const sessionCollection = DB.collection('session');
        
        console.log('Now I will make it protected!');

        const verifyToken = async(req, res, next) => {
            //console.log('headers: ', req.headers);
            try {
                const authHeader = req.headers?.authorization;
                //console.log(authHeader, 'authHeader');
                
                //console.log('token: ', token);

                if (!authHeader) {
                    return res.status(401).send({
                        success: false,
                        message: 'Unauthorized to access!'
                    });
                }
                const token = authHeader.split(' ')[1];
                if (!token) {
                    return res.status(401).send({
                        success: false,
                        message: 'Unauthorized to access!',
                    })
                }

                const query = { token: token }
                const session = await sessionCollection.findOne(query);
                console.log(session, 'session');
                const userId = session?.userId;
                console.log(userId, 'user id');
                const userQuery = {
                    _id: new ObjectId(userId)
                }
                console.log('userQuery: ', userQuery);
                const user = await userCollection.findOne(userQuery);
                console.log('user: ',  user);
                console.log('user id of session: ', user?._id)
                //req.user = user;

                // attach user to request object for user in route handler
                req.user = user;
                req.userId = userId;
                req.token = token;
                next();
            } catch(error) { 
                console.error("Error in verifyToken Middleware: ", error)
                return res.status(500).send({
                    success: false,
                    message: 'Internal server error during authentication!'
                })
            }
            
        }
        //verifyToken('83')
        

        // for admin verify
        const adminVerify = async(req, res, next) => {
            console.log("admin verify", req.params);
            const authHeader = req.headers?.authorization
            if (!authHeader) {
                return res.status(401).send({
                    success: false,
                    message: 'Unauthorized to access!',
                });
            }
            
            const token = authHeader.split(' ')[1];
            if (!token) {
                return  res.status(401).send({
                    success: false,
                    message: 'Unauthorized to access!'
                });
            }

            const query = { token: token }
            const session = await sessionCollection.findOne(query);
            const userId = session?.userId;
            const userQuery = {
                _id: new ObjectId(userId)
            }
            const user = await userCollection.findOne(userQuery);
            console.log('user role: ', user?.role);
            if (!user?.role === 'admin') {
                console.log('user is not admin!');
                return res.status(401).send({
                    success: false,
                    message: 'Unauthorized to access!'
                });
            }
            next();
        }

        // for user verify
        const userVerify = async(req, res, next) => {
            console.log("user verify", req.params);
            const authHeader = req.headers?.authorization
            if (!authHeader) {
                return res.status(401).send({
                    success: false,
                    message: 'Unauthorized to access!',
                });
            }
            
            const token = authHeader.split(' ')[1];
            if (!token) {
                return  res.status(401).send({
                    success: false,
                    message: 'Unauthorized to access!'
                });
            }

            const query = { token: token }
            const session = await sessionCollection.findOne(query);
            const userId = session?.userId;
            const userQuery = {
                _id: new ObjectId(userId)
            }
            const user = await userCollection.findOne(userQuery);
            console.log('user role in userverify: ', user?.role);
            if (!user?.role === "user") {
                return res.status(401).send({
                    success: false,
                    message: 'Unauthorized to access!'
                });
            }
            next();
        }

        // here all api for the recipehub project
        app.get('/api/users', verifyToken, adminVerify, async(req, res) => {
            const allUsers = await userCollection.find();
            const users = await allUsers.toArray();
            res.send(users);
        })
        
        // for delete api: api/admin/users/${userId}
        // for action api: api/admin/users/${userId}
        app.patch('/api/admin/users/:userId', verifyToken, adminVerify, async(req, res) => {
            try { 
                const { userId } = req.params;
                const { action } = await request.json();
                
                let update = {};
                if (action === 'block') {
                    update = { status: 'blocked', blockedAt: new Date() };
                } else if (action === 'unblock') {
                    update = { status: 'active', blockedAt: null};
                } else {
                    return NextResponse.json(
                        { success: false, message: 'Invalid action'},
                        { status: 400 }
                    );
                }
                const result = await userCollection.findOneAndUpdate(
                    { _id: new ObjectId(userId) },
                    { $set: update },
                    { returnDocument: 'after' }
                );
                if (!result) {
                    return NextResponse.json(
                        { success: false, message: 'User not found' },
                        { status: 404 }
                    );
                }
                return NextResponse.json({
                    success: true,
                    message: `User ${action}ed successfully!`,
                    user: result
                });
            } catch (error) {
                console.error('Error updating user: ', error);
                return NextResponse.json(
                    { success: false, message: error.message },
                    { status: 500 }
                );
            }
        })
        // for user delete 
        app.delete('/api/admin/users/:userId', verifyToken, adminVerify, async(req, res) => {
            try {
                const { userId } = req.params;
                const result = await userCollection.deleteOne({ _id: new ObjectId(userId) });
                if (result.deletedCount === 0) {
                    return res.status(404).send(
                        { success: false, message: 'User not found'},
                        // { status: 404 }
                    );
                }
                return res.status(200).send({
                    success: true,
                    message: 'User deleted successfully!'
                });
            } catch (error) {
                console.error('Error deleting user: ', error);
                return res.status(500).send(
                    { success: false, message: error.message },
                    
                );
            }
        })
        
        // user update profile api
        app.patch('/api/auth/update-profile/:id', verifyToken, userVerify, async(req, res) => {
            try {
                const { id } = req.params;
                const userData = req.body;
                if (!id) {
                    return res.status(400).send({
                        success: false,
                        message: 'User ID is not valid!'
                    });
                }
                const filter = {
                    _id: new ObjectId(id)
                }
                if (!filter) {
                    return res.status(404).send({
                        success: false,
                        message: 'User ID is not valid!'
                    })
                }
                const updatedUserDocument = {
                    $set: {
                        name: userData.name,
                        image: userData.image,
                    }
                }
                const result = await userCollection.updateOne(filter, updatedUserDocument);
                res.status(200).send({
                    success: true,
                    message: 'User profile updated successfully!',
                    data: result
                })

            } catch {
                res.status(500).send({
                    success: false,
                    message: 'Error Updating Profile!',
                    error: error.message
                });
            }
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
        
        //verifyToken, userVerify,
        app.get('/api/recipe',  async(req, res) => {
            //console.log('server side search query: ', req.query);
            const query = {};
            if (req.query.search) {
                query.$or = [
                    {recipeName: { $regex: req.query.search, $options: 'i' }}
                ]
            }
            if (req.query.category) {
                query.category = req.query.category
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
        app.post('/api/recipe', verifyToken, userVerify, async(req, res) => {
            const recipe = req.body;
            const newRecipe = {
                ...recipe,
                createdAt: new Date(),
                updatedAt: new Date()
            }
            const result = await recipeCollection.insertOne(newRecipe);
            res.send(result);
        })
        
        // get all popular recipes
        app.get('/api/popular-recipe', async(req, res) => {
            const recipes = await recipeCollection.find().sort({ likesCount: -1 }).limit(3);
            const result = await recipes.toArray()
            return res.send(result);
        });

        
        
        // get user added recipe
        // user all recipe for crud operation
        app.get('/api/user-recipe', verifyToken, userVerify, async(req, res) => {
            const recipes = await recipeCollection.find().toArray();
            const query = {}
            if (req.query.authorId) {
                query.authorId = req.query.authorId;
            }
            const result = await recipeCollection.find(query).toArray();
            res.send(result);
        })
        // user recipe by user id and then recipe id
        app.get('/api/user-recipe/:id', verifyToken, userVerify, async(req, res) => {
            const id = req.params.id;
            const recipes = await recipeCollection.findOne({ _id: new ObjectId(id) })
            res.send(recipes);
        })
        // user recipe by user id and then recipe id
        // for update
        app.patch('/api/user-recipe/:id', verifyToken, userVerify, async(req, res) => {
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
        app.delete('/api/user-recipe/:id', verifyToken, userVerify, async(req, res) => {
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
        // app.post('/api/recipe', async(req, res) => {
        //     const recipe = req.body;
        //     const newRecipe = {
        //         ...recipe,
        //         createdAt: new Date(),
        //         updatedAt: new Date()
        //     }
        //     const result = await recipeCollection.insertOne(newRecipe);
        //     res.send(result);
        // })


        // get my purchased recipe
        app.get('/api/my-purchase/:id', verifyToken, userVerify, async(req, res) => {
            try {
                const { id } = req.params;
                const userPurchasedRecipe = await BuyRecipeCollection.find({
                    userId: id
                }).toArray();
                res.status(200).send({
                    success: true,
                    message: 'You purchased recipe list!',
                    data: userPurchasedRecipe
                });
            } catch(error) {
                console.error('Error fetching your purchase recipes: ', error);
                res.status(500).send({
                    success: false,
                    message: 'Failed to fetch you purcchase recipe!'
                });
            }
        })
        app.post('/api/buy-recipe', verifyToken, userVerify, async(req, res) => {
            
            try {
                const data = req.body;
                const RecipeBuyData = {
                    ...data,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }
                const result = await BuyRecipeCollection.insertOne(RecipeBuyData);
                res.status(200).send({
                    success: true,
                    message: 'Recipe Purchased successfully',
                    data: result
                });
            } catch(error) {
                console.log('Buy Recipe error: ', error);
                res.status(500).send({
                    success: false,
                    message: 'Failed to purchase recipe'
                })
            }
        
            // for purchasing recipe
            // try { 
            // const { id } = req.params;
            //     const { userId, userName, recipe } = req.body;

            //     if (!userId) {
            //         return res.status(400).send({
            //             success: false,
            //             message: 'User id is required!'
            //         });
            //     }

            //     const existingLike = await likeCollection.findOne({
            //         userId: userId,
            //         "recipe._id": id
            //     });
            //     if (existingLike) {
            //         return res.status(200).send({
            //             success: true,
            //             message: 'You have already liked this recipe!',
            //             alreadyLiked: true
            //         });
            //     }
                
            //     const data = req.body;
            //     const likeData = {
            //         ...data,
            //         createdAt: new Date()
            //     }
            //     const result = await likeCollection.insertOne(likeData);
                
            //     const filterRecipe = {
            //         _id: new ObjectId(id)
            //     }
            //     // added the code for update like count
                
            //     const likesCountRecipe = await recipeCollection.updateOne(filterRecipe, {
            //         $inc: { likesCount: 1 }
            //     });

            //     res.status(200).send({
            //         success: true,
            //         message: 'Recipe Like successfully!',
            //         //data: result, // this is old code
            //         data : {
            //             result: result,
            //             likesCountRecipe: likesCountRecipe,
            //         },
            //         alreadyLiked: false
            //     });
            // } catch(error) {
            //     console.error('Error in like recipe: ', error);
            //     res.status(500).send({
            //         success: false,
            //         message: 'Failed to like recipe',
            //         error: error.message
            //     });
         
                

        })
        // subscription api
        app.post('/api/subscriptions', verifyToken, userVerify, async(req, res) => {
            const data = req.body;
            const subscriberInformation = {
                ...data,
                userId: data.userId,
                //transactionId: data.transactionId || null,
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



        // for user recipe like, save and favorite
        // here these three interaction user 
        // will be verifed and authenticated
        // here id for user to get user all like recipe
        // id in recipe user only like one recipe by id not two time 
        // like a single recipe
        app.get('/api/recipe-like/:id', verifyToken, userVerify, async(req, res) => {
            try {
                const { id } = req.params;
                const userLikes = await likeCollection.find({
                    userId: id
                }).toArray();
                res.status(200).send({
                    success: true,
                    message: 'Uesr liked recipe by user id',
                    data: userLikes
                });
            
            } catch(error) {
                console.error('Error fetching user likes: ', error);
                res.status(500).send({
                    success: false,
                    message: 'Failed to fetch user likes'
                });
            }
        })
        app.post('/api/recipe-like/:id', verifyToken, userVerify, async(req, res) => {
            try {
                const { id } = req.params;
                const { userId, userName, recipe } = req.body;

                if (!userId) {
                    return res.status(400).send({
                        success: false,
                        message: 'User id is required!'
                    });
                }

                const existingLike = await likeCollection.findOne({
                    userId: userId,
                    "recipe._id": id
                });
                if (existingLike) {
                    return res.status(200).send({
                        success: true,
                        message: 'You have already liked this recipe!',
                        alreadyLiked: true
                    });
                }
                
                const data = req.body;
                const likeData = {
                    ...data,
                    createdAt: new Date()
                }
                const result = await likeCollection.insertOne(likeData);
                
                const filterRecipe = {
                    _id: new ObjectId(id)
                }
                // added the code for update like count
                
                const likesCountRecipe = await recipeCollection.updateOne(filterRecipe, {
                    $inc: { likesCount: 1 }
                });

                res.status(200).send({
                    success: true,
                    message: 'Recipe Like successfully!',
                    //data: result, // this is old code
                    data : {
                        result: result,
                        likesCountRecipe: likesCountRecipe,
                    },
                    alreadyLiked: false
                });
            } catch(error) {
                console.error('Error in like recipe: ', error);
                res.status(500).send({
                    success: false,
                    message: 'Failed to like recipe',
                    error: error.message
                });
            }
        })


        // for saved recipe for specific user 
        // for get user all saved recipe 
        // UserId will be use here params for get
        // saved recipe post here will user recipe id
        // for preventing duplicate recipe saved
        app.get('/api/recipe-save/:id', verifyToken, userVerify, async(req, res) => {
            try {
                const { id } = req.params;
                const userSaved = await savedCollection.find({
                    userId: id
                }).toArray();
                res.status(200).send({
                    success: true,
                    message: 'Uesr saved recipe by user id',
                    data: userSaved
                });
            
            } catch(error) {
                console.error('Error fetching user likes: ', error);
                res.status(500).send({
                    success: false,
                    message: 'Failed to fetch user likes'
                });
            }
        })
        app.post('/api/recipe-save/:id', verifyToken, userVerify, async(req, res) => {
            try {
                const { id } = req.params;
                const { userId, userName, recipe } = req.body;

                if (!userId) {
                    return res.status(400).send({
                        success: false,
                        message: 'User id is required!'
                    });
                }
                
                const existingSaved = await savedCollection.findOne({
                    userId: userId,
                    "recipe._id": id
                });
                if (existingSaved) {
                    return res.status(200).send({
                        success: true,
                        message: 'You have already saved this recipe!',
                        alreadySaved: true
                    });
                }
                
                const data = req.body;
                const savedData = {
                    ...data,
                    createdAt: new Date()
                }
                const result = await savedCollection.insertOne(savedData);

                res.status(200).send({
                    success: true,
                    message: 'Recipe saved successfully!',
                    data: result,
                    alreadySaved: false
                });
            } catch(error) {
                console.error('Error in saved recipe: ', error);
                res.status(500).send({
                    success: false,
                    message: 'Failed to save recipe',
                    error: error.message
                });
            }
        })
        
        // for favorite recipe for specific user 
        // for get user all favorite recipe 
        // UserId will be use here params for get
        // favorite recipe post here will user recipe id
        // for preventing duplicate recipe favorite
        app.get('/api/recipe-favorite/:id', verifyToken, userVerify, async(req, res) => {
            try {
                const { id } = req.params;
                const userSaved = await favoriteCollection.find({
                    userId: id
                }).toArray();
                res.status(200).send({
                    success: true,
                    message: 'Uesr saved recipe by user id',
                    data: userSaved
                });
            
            } catch(error) {
                console.error('Error fetching user favorite recipes: ', error);
                res.status(500).send({
                    success: false,
                    message: 'Failed to fetch user favorite recipes'
                });
            }
        })
        app.post('/api/recipe-favorite/:id', verifyToken, userVerify, async(req, res) => {
            try {
                const { id } = req.params;
                const { userId, userName, recipe } = req.body;

                if (!userId) {
                    return res.status(400).send({
                        success: false,
                        message: 'User id is required!'
                    });
                }

                const existingFavorite = await favoriteCollection.findOne({
                    userId: userId,
                    "recipe._id": id
                });
                if (existingFavorite) {
                    return res.status(200).send({
                        success: true,
                        message: 'You have already added favorite this recipe!',
                        alreadyFavorite: true
                    });
                }
                
                const data = req.body;
                const favoriteData = {
                    ...data,
                    createdAt: new Date()
                }
                const result = await favoriteCollection.insertOne(favoriteData);

                res.status(200).send({
                    success: true,
                    message: 'Recipe added successfully in favorite!',
                    data: result,
                    alreadyFavorite: false
                });
            } catch(error) {
                console.error('Error in favorite recipe add: ', error);
                res.status(500).send({
                    success: false,
                    message: 'Failed to favorite recipe add',
                    error: error.message
                });
            }
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