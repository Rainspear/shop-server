const User = require("../models/user");
const express = require('express');
const router = express.Router();
const multer = require('multer');
const gcsSharp = require('multer-sharp');
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const jwt = require("jsonwebtoken");
const bucket = "gs://mystorage-e3329.appspot.com/";


const myStorage = gcsSharp({
    projectId : "mystorage-e3329",
    keyFilename : process.env.KEYPATH,
    bucket : bucket,
    destination: 'userimages',
});

const myFileFilter = function(req, file, cb) {
    // warning filter : do not use when it's unnessesary
    if (file.mimetype === 'image/jpg' || file.mimetype === 'image/png' || file.mimetype === 'image/jpeg') {
        cb(null, true);
    } else {
        cb(null, false);
    }
};

const myLimit = {
    fileSize: 1024 * 1024 * 10,
};

const upload = multer({
    storage: myStorage,
    fileFilter: myFileFilter,
    limits: myLimit,
});

router.get("/", (req,res) => {
    User.find().select(_id, name, email, phone).then(docs => {
        res.status(200).json({
            count : docs.length,
            users : docs
        });
    }).catch(err => { 
        console.log(err); 
        res.status(500).json({
        error : err
    })});
})


router.post("/login", (req, res) => {
    User.find({email : req.body.email})
        .exec()
        .then(user => {
            if (user.length < 1){
                return res.status(401).json({
                    message : "Auth - Can not find user - password or email is incorrect"
                });
            } else {
                bcrypt.compare(req.body.password, user[0].password, (err, result) => {
                    if (err) {
                        return res.status(401).json({
                            message : "Auth failed in LOGIN"
                        });
                    }
                    if (result) {
                        user[0].generateAuthToken().then(token =>{
                            console.log(token);
                            return res.status(200).json({
                                message : "Auth successfully in LOGIN",
                                user : {
                                    email : user[0].email,
                                    token : token,
                                }
                            });
                        });
                    } else {
                        return res.status(401).json({
                            message : "Auth failed in LOGIN"
                        });
                    }
                });  
            }          
            // return res.status(401).json({
            //     message : "Auth failed in LOGIN2"
            // });
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({
                error : err
            })
        });
})

router.post("/register", (req, res) => {
    User.find({ email : req.body.email})
        .exec()
        .then(user => {
            if (user.length < 1) {
                bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
                    if (hash) {
                        const user = new User({
                            _id: new mongoose.Types.ObjectId(),
                            email : req.body.email,
                            password : hash,
                            name : req.body.name,
                            phone : req.body.phone
                        });
                        user.save().then(user => {
                            return user.generateAuthToken();
                        }).then(token => {
                            console.log(token);
                            res.header('x-auth', token);
                            res.status(201).json({
                                message : "user save successfully",
                                token : token
                            });
                        }).catch(err => {
                            console.log(err);
                            res.status(500).json({
                                error : `user has error ${err} on Register`
                            });
                        });
                    }
                    if (err)
                    {
                        console.log(err);
                    }
                });
            } else {
                return res.status(500).json({
                    message : "User is exist in REGISTER"
                });
            }
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({error : `Error in ${err}`});
        });



        
});

module.exports = router;