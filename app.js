require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const session = require("express-session");
const mongoose = require("mongoose");
const findOrCreate = require("mongoose-findorcreate");
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));


app.use(passport.initialize());
app.use(passport.session());
app.set("view engine", "ejs");

mongoose.connect("mongodb://localhost:27017/FoodAppDB", ({ useUnifiedTopology: true, useNewUrlParser: true, useCreateIndex: true }));

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    password: String,
    active: {
        type: Boolean,
        default: false
    },
    activeToken: String,
    activeExpires: String,
    forgotToken: String,
    forgotExpires: String,
    googleId: String,
    facebookId: String,
    createdAt: String,
    profileURL: String,
    purchaseList: Array
});

const User = mongoose.model("User", userSchema);

const foodSchema = new mongoose.Schema({
    hotelId: String,
    profileURL: String,
    name: String,
    price: String,
    tag: Array,
    Type: String,
    availableis: {
        type: Boolean,
        default: true
    },
    Total_orders: Number
});

const FoodItem = mongoose.model("FoodItem", foodSchema);

const hotelSchema = new mongoose.Schema({
    name: String,
    description: String,
    phone: String,
    address: String,
    profileURL: String,
    timing: String,
    menuCardPhoto: String,
    status: String,
    menu: Array,
    ownerId: String,
    Type: String,
    Tags: Array,
    status: {
        type: Boolean,
        default: true
    },
    category: {
        bestseller: { type: Array },
        snacks: { type: Array },
        starters: { type: Array },
        roti: { type: Array },
        dessert: { type: Array },
        soup: { type: Array },
        rice: { type: Array },
        shakes: { type: Array },
    },

    Total_orders: Number,
    orderList: Array
});

const Hotel = new mongoose.model("Hotel", hotelSchema);

const orderSchema = new mongoose.Schema({
    hotelId: String,
    orderItems: Array,
    billAmount: Number,
    status: {
        type: String,
        default: "pending"
    },
    Date: String,
    customerId: String,
    approved: {
        type: Boolean,
        default: false
    }
});

const Order = new mongoose.model("Order", orderSchema);


const ownerSchema = new mongoose.Schema({
    name: String,
    phone: String,
    altPhone: String,
    password: String,
    profileURL: String,
    address: String,
    mobilleOP: Number,
    createdAt: String,
    hotelId: String,
});

ownerSchema.plugin(passportLocalMongoose, {
    usernameField: "name" //the field which will be accepted as username it should be unique
});
ownerSchema.plugin(findOrCreate);

const Owner = mongoose.model("Owner", ownerSchema);

passport.use(Owner.createStrategy()); //to put the flash
passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    Owner.findById(id, function(err, user) {
        done(err, user);
    });
});


app.get("/", function(req, res) {
    res.render("index");
});

app.get("/signup", function(req, res) {
    res.render("singup");
});


app.get("/login", function(req, res) {
    res.render("login");
});

app.get("/orders", function(req, res) {

    if (req.isAuthenticated()) {

        // Order.find({ hotelId: req.user.hotelId, approved: false }, function(err, order) {
        //     if (!err) {
        //         if (order) {
        //             res.render("confirm", { orders: order });
        //         } else {
        //             console.log("their is no such order");
        //         }
        //     } else {
        //         console.log(err);
        //     }

        // });

        res.render("orders");

    }


});


app.get("/orders/:status", function(req, res) {

    if (req.isAuthenticated()) {
        Order.find({ hotelId: req.user.hotelId, status: req.params.status }, function(err, order) {
            if (!err) {
                if (order) {
                    res.render(req.params.status, { orders: order });
                } else {
                    console.log("their is no such order");
                }
            } else {
                console.log(err);
            }

        });

    }
});

app.get("/confirm/:orderId", function(req, res) {
    console.log(req.body);
    console.log(req.params.orderId);
    Order.findOne({ _id: req.params.orderId }, function(err, order) {
        if (order) {
            order.approved = true;
            order.save();

            Hotel.findOne({ _id: order.hotelId }, function(err, hotel) {
                hotel.Total_orders++;
                hotel.save();
            });

            order.orderItems.forEach(function(element) {
                FoodItem.findOne({ _id: element.item_id }, function(err, item) {
                    item.Total_orders++;
                    item.save();
                });
            });
        }
    });

});

app.get("/Decline/:orderId", function(req, res) {
    console.log(req.body);
    console.log(req.params.orderId);
    Order.deleteOne({ _id: req.params.orderId }, function(err, order) {


    });

});


app.get("/paid/:orderId", function(req, res) {
    console.log(req.body);
    console.log(req.params.orderId);
    Order.findOne({ _id: req.params.orderId }, function(err, order) {
        if (order) {
            order.approved = "completed";
            order.save();

            Hotel.findOne({ _id: order.hotelId }, function(err, hotel) {
                hotel.Total_orders++;
                hotel.save();
            });

            order.orderItems.forEach(function(element) {
                FoodItem.findOne({ _id: element.item_id }, function(err, item) {
                    item.Total_orders++;
                    item.save();
                });
            });
        }
    });

});




app.post("/signup", function(req, res) {

    console.log(req.body);

    const newowner = new Owner({
        name: req.body.name,
        phone: req.body.phone,
        altPhone: req.body.altphone,
        address: req.body.address
    });

    Owner.register(newowner, req.body.password, function(err, user) {

        if (!err) {
            if (user) {
                passport.authenticate("local")(req, res, function() {
                    res.redirect("/main");
                });
            }
        }



    })
});

app.get("/main", function(req, res) {

    if (req.isAuthenticated) {
        Owner.findById(req.user._id, function(err, owner) {
            if (!err) {
                if (owner) {
                    res.redirect("/registerhotel");
                }
            }

        })
    }
});

app.get("/registerhotel", function(req, res) {
    if (req.isAuthenticated()) {
        res.render("registerhotel");
    }
});


app.post("/registerhotel", function(req, res) {
    if (req.isAuthenticated()) {
        console.log(req.body);

        req.body.ownerId = req.user._id;

        const hotel = new Hotel(req.body);
        hotel.save();

        Owner.findById(req.user._id, function(err, owner) {
            if (!err) {
                if (owner) {
                    owner.hotelId = hotel._id;
                    owner.save();
                }
                res.redirect("/hotel");
            }

        })

    }
}); //here i should redirect to inside the thing but it is not doing anything

app.get("/hotel", function(req, res) {

    console.log("after login user is " + req.user);

    console.log("User is " + req.user);
    if (req.isAuthenticated()) {
        Hotel.findById(req.user.hotelId, function(err, hotel) {
            res.render("hotel", { user: req.user, hotel: hotel });
        })

    }
});

app.get("/login", function(req, res) {
    res.render("login");
});


app.post("/login", function(req, res) {
    console.log(req.body);

    const user = new Owner({
        name: req.body.name,
        password: req.body.password
    });

    req.login(user, function(err) {
        passport.authenticate("local")(req, res, function() {
            console.log("inside authneticate");
            Owner.findOne({ name: req.body.name }, function(err, founduser) {
                console.log("founduser is " + founduser);
                if (!err) {
                    if (founduser) {
                        if (founduser.hotelId) {
                            res.redirect("/hotel");
                        } else {
                            res.redirect("/registerhotel");
                        }
                    }
                }
            })
        });
    });


});

app.get("/additem", function(req, res) {
    if (req.isAuthenticated()) {
        res.render("additem");
    }
});

app.post("/additem", function(req, res) {
    if (req.isAuthenticated()) {
        console.log("newitem details " + JSON.stringify(req.body));
        req.body.hotelId = req.user.hotelId;

        const newitem = new FoodItem(req.body);

        FoodItem.findOne({ name: req.body.name, hotelId: req.body.hotelId }, function(err, fooditem) {
            if (!err) {
                if (fooditem) {
                    console.log("item with this name already exist if you want to change anything and do it from the edit item link");
                } else {
                    newitem.save();

                    Hotel.findById(req.user.hotelId, function(err, hotel) {
                        if (!err) {
                            if (hotel) {
                                hotel.menu.push(newitem._id.toString());

                                for (const x in hotel.category) {
                                    if (x == newitem.tag[0]) {
                                        console.log(x);

                                        hotel.category[x].push(newitem._id.toString());
                                        //  x.push(newitem._id.toString())
                                        //how to push the element
                                    }
                                }
                                hotel.save();
                                res.redirect("/additem");
                            }
                        }
                    })
                }
            }
        })
    }

});


app.get("/itemlist", function(req, res) {
    if (req.isAuthenticated()) {


        Hotel.findById(req.user.hotelId, function(err, hotel) {
            if (!err) {
                if (hotel) {

                    FoodItem.find({ hotelId: req.user.hotelId }, function(err, item) {
                        if (err) {
                            console.log(err);
                        } else {
                            res.render("itemlist", { items: item });
                        }
                    });
                }
            }


        });
    }
});

app.get("/changestatus/:itemid", function(req, res) {
    if (req.isAuthenticated()) {
        FoodItem.findById(req.params.itemid, function(err, item) {
            if (!err) {
                if (item) {
                    if (item.availableis === true) {
                        item.availableis = false;
                        item.save();
                    } else {
                        item.availableis = true;
                        item.save();
                    }
                }
                res.redirect("/itemlist");
            }
        })
    }
});


app.get("/changehotelstatus/:hotelid", function(req, res) {
    if (req.isAuthenticated()) {
        Hotel.findById(req.params.hotelid, function(err, hotel) {
            if (!err) {
                if (hotel) {
                    if (hotel.status === true) {
                        hotel.status = false;
                        hotel.save();
                    } else {
                        hotel.status = true;
                        hotel.save();
                    }
                }
                res.redirect("/hotel");
            }
        })
    }
});

app.get("/edititem/:itemid", function(req, res) {
    if (req.isAuthenticated()) {
        FoodItem.findById(req.params.itemid, function(err, item) {
            res.render("edititem", { item: item });
        })
    }
});


app.post("/edititem/:itemid", function(req, res) {
    if (req.isAuthenticated()) {
        console.log("req.body " + JSON.stringify(req.body));

        FoodItem.findOneAndUpdate({ _id: req.params.itemid }, { $set: req.body }, function(err, updateditem) {
            if (!err) {
                if (updateditem) {
                    console.log(updateditem);
                }
            }
        });
    }
});


app.get("/edithotel/:hotelid", function(req, res) {
    if (req.isAuthenticated()) {
        Hotel.findById(req.params.hotelid, function(err, hotel) {
            res.render("edithotel", { hotel: hotel });
        })
    }
});


app.post("/edithotel/:hotelid", function(req, res) {
    if (req.isAuthenticated()) {
        console.log("req.body " + JSON.stringify(req.body));

        Hotel.findOneAndUpdate({ _id: req.params.hotelid }, { $set: req.body }, function(err, updatedhotel) {
            if (!err) {
                if (updatedhotel) {
                    console.log(updatedhotel);
                }
            }
        });
    }
});

app.get("/editprofile", function(req, res) {
    console.log(req.user._id);

    if (req.isAuthenticated()) {
        Owner.findOne({ _id: req.user._id }, function(err, user) {
            console.log(user);
            if (!err) {
                if (user) {
                    res.render("editprofile", { user: user });
                } else {
                    res.send("are user toh lekar aa");
                }
            } else {
                console.log(err);
            }

        })
    }
});


app.post("/editprofile", function(req, res) {
    if (req.isAuthenticated()) {
        console.log("req.body " + JSON.stringify(req.body));

        FoodItem.findOneAndUpdate({ _id: req.user._id }, { $set: req.body }, function(err, updateditem) {
            if (!err) {
                if (updateditem) {
                    console.log(updateditem);
                }
            }
        });
    }
});


app.listen(5000, function(req, res) {
    console.log("port 5000 has started");
});