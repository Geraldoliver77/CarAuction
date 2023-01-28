const express = require('express');
const cookieParser = require("cookie-parser");
const sessions = require('express-session');
const http = require('http');
var path = require('path');
var nodemailer = require('nodemailer');
const app = express();
const url = require('url');
var mysql = require('mysql');

const { encode } = require('punycode');
const session = require('express-session');
let encodeUrl = require('body-parser').urlencoded({ extended: false });
var vm = require("vm");
var fs = require("fs");
const { table } = require('console');

var formidable = require('formidable');

var PDFDocument = require('pdfkit');

const multer = require("multer");

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use('/public/', express.static('./public'));


var finish = "処理が完了いたしました！";

//session middleware
app.use(sessions({
    secret: "thisismysecrctekey",
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }, // 24 hours
    resave: false
}));

app.use(cookieParser());

var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "halauction"
});

function selectAll(res, tablename, check, message) {

    con.query(
        'SELECT * FROM ' + tablename,
        (error, results) => {
            if (error) {
                console.log('error connecting:' + error.stack);
                res.status(400).send({ message: 'Error!' });
                return false;
            }
            if (check == "user") {
                res.render('user-management', {
                    values: results
                });
            } else if (check == "vehicle") {
                res.render('vehicle-management', {
                    values: results,
                    message: message

                });
            }
            else if (check == "productregister") {
                res.render('productregister', {
                    values: results,
                    message: message

                });
            }



        }
    );
}

function innerJoin(res, check) {

    con.connect(function (err) {
        if (err) {
            console.log(err);
        };
        con.query(            
            `SELECT auctionid , sum(bidvalue) as sumvalue FROM listing_information   GROUP BY auctionid ; `,
            (error, resultsSum) => {
                if (error) {
                    console.log('error connecting:' + error.stack);
                    res.status(400).send({ message: 'Error!' });
                    return false;
                }

                var arraySum =[];

                resultsSum.forEach(element => {
                   arraySum.push(element)
                });

        con.query(
            `           
            SELECT * FROM auction_information 
            INNER JOIN vehicle_information
            ON auction_information.carid=vehicle_information.carid 
            INNER JOIN sales_information 
            ON auction_information.carid=sales_information.carid;
            `,
            (error, resultsExist) => {
                if (error) {
                    console.log('error connecting:' + error.stack);
                    res.status(400).send({ message: 'Error!' });
                    return false;
                }

                var array =[];

                resultsExist.forEach(element => {
                   array.push(element)
                });
                
        con.query(
            `
            SELECT *
            FROM auction_information 
            INNER JOIN vehicle_information 
            ON auction_information.carid=vehicle_information.carid
            `,
            (error, results) => {
                if (error) {
                    console.log('error connecting:' + error.stack);
                    res.status(400).send({ message: 'Error!' });
                    return false;
                }

                res.render(check, {
                    Error: "block",
                    values:results,
                    valuesexist:array,
                    valuesum:arraySum
                });});
            });
        });

    });
}


function deleteId(res, tablename, check, id) {

    con.query(

        ' SELECT * FROM ' + tablename + " WHERE carid =  " + id,
        (error, results) => {
            if (error) {
                console.log('error connecting:' + error.stack);
                res.status(400).send({ message: 'Error!' });
                return false;
            }
            res.render('vehicle-confirmation', {
                id: 17,
                values: results,
                action: "削除",
                button: "Delete"

            });


        }
    );
}


function deleteValue(res, tablename, id) {

    con.query(

        ' DELETE FROM ' + tablename + " WHERE carid =  " + id,
        (error, results) => {
            if (error) {
                console.log('error connecting:' + error.stack);
                res.status(400).send({ message: 'Error!' });
                return false;
            }


        }
    );
}

function updateId(res, tablename, check, id) {

    con.query(

        ' SELECT * FROM ' + tablename + " WHERE carid =  " + id,
        (error, results) => {
            if (error) {
                console.log('error connecting:' + error.stack);
                res.status(400).send({ message: 'Error!' });
                return false;
            }

            res.render('vehicle-confirmation', {
                id: 17,
                values: results,
                action: "更新",
                button: "Update"

            });
        });
}

function insertFinalPrice(carid, finishprice, img) {
    con.connect(function (err) {
        if (err) {
            console.log(err);
        };

        // inserting new user data
        var sql = `INSERT INTO auction_information (carid, finishprice, img) 
        VALUES 
        ('${carid}', '${finishprice}', '${img}')`;
        con.query(sql, function (err, result) {
            if (err) {
                console.log(err);
            }
        });

    });
}




app.get('/', function (req, res) {
    res.render('login');
});

app.get('/register', function (req, res) {
    res.render('register');
});

app.post('/register', encodeUrl, (req, res) => {
    var name = req.body.name;
    var email = req.body.email;
    var userName = req.body.userName;
    var password = req.body.password;


    con.connect(function (err) {
        if (err) {
            console.log(err);
        };
        // checking user already registered or no
        con.query(`SELECT * FROM users WHERE username = '${userName}' AND password  = '${password}'`,
            function (err, result) {
                if (err) {
                    console.log(err);
                };
                //if register fail
                if (Object.keys(result).length > 0) {
                    res.render("done_message", {
                        Error: "block",
                        name: req.session.user.firstname,
                    });
                } else {
                    //creating user page in userPage function
                    function userPage() {
                        // We create a session for the dashboard (user page) page and save the user data to this session:
                        req.session.user = {
                            name: name,
                            email: email,
                            username: userName,
                            password: password
                        };
                        res.render("done_message", {
                            Error: "block",
                            name: req.session.user.name,
                        });


                    }
                    // inserting new user data
                    var sql = `INSERT INTO users (name, email, username, password) VALUES ('${name}', '${email}', '${userName}', '${password}')`;
                    con.query(sql, function (err, result) {
                        if (err) {
                            console.log(err);
                        } else {
                            // using userPage function for creating user page
                            userPage();
                        };
                    });

                }

            });
    });
});


app.post('/updateuser', encodeUrl, (req, res) => {
    var id = req.query.id;
    var name = req.body.name;
    var email = req.body.email;
    var username = req.body.username;
    var password = req.body.password;


    let sql = `UPDATE users
        SET name = ? ,
            email = ?,
            username = ?,
            password = ?          
        WHERE id = ?`;

    let data = [name, email, username, password, id];
    con.query(sql, data, (error, results, fields) => {
        if (error) {
            return console.error(error.message);
        }
        console.log('Rows affected:', results.affectedRows);
    });

    res.render("finish_management", {
        Error: "block",
        Finish: "処理完了致しました！"
    });
});

app.post('/profileupdate', encodeUrl, (req, res) => {

    console.log(req.body.userid);
    var id = req.body.userid;
    var name = req.body.name;
    var email = req.body.email;
    var password = req.body.password;


    con.connect(function (err) {
        if (err) {
            console.log(err);
        };

        let sql = `UPDATE users
        SET name = ? , email = ? , password = ?
        WHERE id= ?`;

        let data = [name, email,  password , id ];

        con.query(sql, data, (error, results, fields) => {
            if (error) {
                return console.error(error.message);
            }
            console.log('Rows affected:', results.affectedRows);
        });

        res.render("message", {
            Error: "block",
            name: req.cookies['username'],
            message: "更新が完了いたしました"
        });
    });
});

app.get("/profileupdate", encodeUrl, (req, res) => {

    res.render("message", {
        Error: "block",
        name: req.cookies['username'],
        namesession: "",
        message: "更新が完了いたしました"
    });
});

app.post('/about', encodeUrl, (req,res) => {
    res.render("about", {
        Error: "block",
        name: req.cookies['username'],
        
    });
});

app.post('/product', encodeUrl, (req, res) => {

    var id = req.query.id;

    var searchby = req.body.searchby;
    var searchtext = req.body.searchtext;
    var tablename = "";

    if (searchby == "auctionid") {
        tablename = "auction_information";
    }

    if (searchby == "carname") {
        tablename = "vehicle_information"
    }

    if (searchby == "carbrand") {
        tablename = "vehicle_information"
    }

    con.connect(function (err) {
        if (err) {
            console.log(err);
        };
        
        con.query(            
            `SELECT auctionid , sum(bidvalue) as sumvalue FROM listing_information   GROUP BY auctionid ; `,
            (error, resultsSum) => {
                if (error) {
                    console.log('error connecting:' + error.stack);
                    res.status(400).send({ message: 'Error!' });
                    return false;
                }

                var arraySum =[];

                resultsSum.forEach(element => {
                   arraySum.push(element)
                });
        
        con.query(
            `           
            SELECT * FROM auction_information 
            INNER JOIN vehicle_information
            ON auction_information.carid=vehicle_information.carid 
            INNER JOIN sales_information 
            ON auction_information.carid=sales_information.carid;
            `,
            (error, resultsExist) => {
                if (error) {
                    console.log('error connecting:' + error.stack);
                    res.status(400).send({ message: 'Error!' });
                    return false;
                }

                var array =[];

                resultsExist.forEach(element => {
                   array.push(element)
                });

        con.query(
            `SELECT auctionid , vehicle_information.carid , vehicle_information.carbrand , vehicle_information.carname , auction_information.bidnumber , auction_information.startingprice , auction_information.finishprice , auction_information.bidpervalue , auction_information.carcondition , auction_information.startingtime , auction_information.finishtime , auction_information.img
                    FROM auction_information 
                    INNER JOIN vehicle_information 
                    ON auction_information.carid=vehicle_information.carid
                    WHERE (${tablename}.${searchby} LIKE '%${searchtext}%' )`,
            (error, results) => {
                if (error) {
                    console.log('error connecting:' + error.stack);
                    res.status(400).send({ message: 'Error!' });
                    return false;
                }

                res.render("product", {
                    Error: "block",
                    values: results,
                    name: req.cookies['username'],
                    valuesexist:array,
                    valuesum:arraySum
                });
            });
    });});
});});


// IF login success / fail
app.post("/dashboard", encodeUrl, (req, res) => {

    var userName = req.body.userName;
    var password = req.body.password;

    con.connect(function (err) {
        if (err) {
            console.log(err);
        };
        con.query(`SELECT * FROM users WHERE username = '${userName}' AND password = '${password}'`, function (err, result) {
            if (err) {
                console.log(err);
            };



            function userPage() {

                // We create a session for the dashboard (user page) page and save the user data to this session:
                req.session.user = {
                    name: result[0].name,
                    email: result[0].email,
                    username: userName,
                    password: password
                };
                res.cookie('username', req.body.userName)


                res.render("index", {
                    Error: "block",
                    namecookie: req.cookies['username'],
                    namesession: userName,
                    message: ""
                });

            }

            if (Object.keys(result).length > 0) {
                userPage();
            } else if (userName == "hal" && password == "hal") {
                res.render("management", {
                    Error: "block",
                    Finish: ""
                });
            }
            else {
                res.render("login", { Error: "block" });
            }

        });
    });
});


app.get("/dashboard", encodeUrl, (req, res) => {

    res.render("index", {
        Error: "block",
        namecookie: req.cookies['username'],
        namesession: "",
        message: ""
    });
});

app.get("/index", encodeUrl, (req, res) => {

    res.render("index", {
        Error: "block",
        namecookie: req.cookies['username'],
        namesession: "",
        message: ""
    });
});

app.post("/index", encodeUrl, (req, res) => {

    res.render("index", {
        Error: "block",
        namecookie: req.cookies['username'],
        namesession: "",
        message: ""
    });
});

app.get("/profile", encodeUrl, (req, res) => {
    var name = req.query.name;


    con.query(
        ` SELECT * FROM users WHERE users.username = '${name}'`,
        (error, results) => {
            if (error) {
                console.log('error connecting:' + error.stack);
                res.status(400).send({ message: 'Error!' });
                return false;
            }
            res.render("profile", {
                Error: "block",
                name: req.cookies['username'],
                values: results
            });
        }
    );;
});

app.get('/product_details', encodeUrl, (req, res) => {

    var auctionid = req.query.auctionid;
    var username = req.cookies['username'];


    con.connect(function (err) {
        if (err) {
            console.log(err);
        };



        var sqlSelectSum = `SELECT auctionid , sum(bidvalue) as sumvalue FROM listing_information  WHERE auctionid = '${auctionid}' ; `;

        var sqlSelect = `SELECT * FROM auction_information
        INNER JOIN vehicle_information ON auction_information.carid=vehicle_information.carid         
        WHERE auctionid = '${auctionid}' `

        var sqlSelectBid = `SELECT * FROM listing_information
                            WHERE auctionid = '${auctionid}'`
        con.query(sqlSelectSum, function (err, resultSelectSum) {

            con.query(sqlSelectBid, function (err, resultSelectBid) {

                con.query(sqlSelect, function (err, resultSelect) {

                    if (err) {
                        console.log(err);
                    }

                    res.render("product_details", {
                        Error: "block",
                        values: resultSelect,
                        bidvalues: resultSelectBid,
                        sumvalues: resultSelectSum,
                        name: req.cookies['username']
                    });;
                }
                );;
            }
            );
        });
    });
});

app.post('/addbid', encodeUrl, (req, res) => {

    var username = req.cookies['username'];
    var auctionid = req.query.auctionid;
    var bidvalue = req.body.bid;

    const urlSegments = req.url.split('&&')
    const array = urlSegments[1].split('=');
    const carid = array[1];

    var currentbidders = "";

    console.log("carid" + carid);
    console.log(req.cookies['username']);

    con.connect(function (err) {
        if (err) {
            console.log(err);
        };


        // inserting new user data
        var sqlInsert = `INSERT INTO listing_information (auctionid, carid, username, bidvalue) 
        VALUES 
        ('${auctionid}', '${carid}', '${req.cookies['username']}', '${bidvalue}')`;

        con.query(sqlInsert, function (err, resultInsert) {
            if (err) {
                console.log(err);
            }
        });

        var sqlSelect = `SELECT * FROM auction_information
        INNER JOIN vehicle_information ON auction_information.carid=vehicle_information.carid         
        WHERE auctionid = '${auctionid}' `

        var sqlSelectSum = `SELECT sum(bidvalue) as sumvalue FROM listing_information WHERE auctionid = '${auctionid}'`;

        var sqlSelectBid = `SELECT * FROM listing_information
                            WHERE auctionid = '${auctionid}'`


        let sqlUpdate = `UPDATE auction_information
            SET bidnumber = bidnumber + 1 
                    WHERE auctionid = ?`;

        let data = [auctionid];

        con.query(sqlUpdate, data, (error, resultsUpdate, fields) => {
            if (err) {
                console.log(err);
            }
        });


        con.query(sqlSelectSum, function (err, resultSelectSum) {

            con.query(sqlSelectBid, function (err, resultSelectBid) {

                con.query(sqlSelect, function (err, resultSelect) {

                    if (err) {
                        console.log(err);
                    }

                    res.render("product_details", {
                        Error: "block",
                        values: resultSelect,
                        bidvalues: resultSelectBid,
                        sumvalues: resultSelectSum,
                        name: req.cookies['username']
                    }
                    );;
                }
                );;
            }
            );;
        }

        );
    });;

});

app.get('/user-management', (req, res) => {
    selectAll(res, "users", "user", "");
});

app.get("/back", encodeUrl, (req, res) => {
    res.render("management", {
        Error: "block",
        Finish: ""
    });
});

app.post("/back", encodeUrl, (req, res) => {
    res.render("management", {
        Error: "block",
        Finish: ""
    });
});

app.post('/deleteuser', encodeUrl, (req, res) => {

    var id = req.query.id;

    con.query(

        ' DELETE FROM  users WHERE id = ' + id,
        (error, results) => {
            if (error) {
                console.log('error connecting:' + error.stack);
                res.status(400).send({ message: 'Error!' });
                return false;
            }


        }
    );
    res.render("finish_management", {
        Error: "block",
        Finish: "処理完了致しました！"
    });



});

app.post('/vehicleregist', encodeUrl, (req, res) => {

    var flg = 1;
    
    var storage = multer.diskStorage({
        destination: function (req, file, cb) {
               
            // Uploads is the Upload_folder_name
            cb(null, "public/upload")
        },
        filename: function (req, file, cb) {                        
          cb(null, req.query.id + "_"+ flg + ".jpg")
          flg +=1 ;
        
}})


      const maxSize = 10 * 1000 * 1000;
      
    
      var upload = multer({ 
        storage: storage,
        limits: { fileSize: maxSize },
        fileFilter: function (req, file, cb){
        
            // Set the filetypes, it is optional
            var filetypes = /jpeg|jpg|png/;
            var mimetype = filetypes.test(file.mimetype);
      
            var extname = filetypes.test(path.extname(
                        file.originalname).toLowerCase());
            
            if (mimetype && extname) {
                return cb(null, true);
            }
          
            cb("Error: File upload only supports the "
                    + "following filetypes - " + filetypes);
          } 
      
    // mypic is the name of file attribute
    }).array("mypic", 4); 
    
    upload(req,res,function(err) { 
        
    var id = req.query.id;
    var carprice = req.body.price;
      
    

    var array = [];

    for (let i = 1; i <= 3  ; i++) {
        array.push(id+"_"+i+".jpg")        
    }

    console.log(array);

    let imgString = array.toString();
    

    insertFinalPrice(id, carprice, imgString);

    
    var carBrand = req.body.carbrand;
    var carName = req.body.carname;
    var carYear = req.body.caryear;
    var carColor = req.body.carcolor;
    var sellerId = req.body.sellerid;

    con.connect(function (err) {
        if (err) {
            console.log(err);
        };


        // inserting new user data
        var sql = `INSERT INTO vehicle_information (carbrand, carname, caryear, carcolor, price ,sellerid) 
        VALUES 
        ('${carBrand}', '${carName}', '${carYear}', '${carColor}', '${carprice}', '${sellerId}')`;

        con.query(sql, function (err, result) {
            if (err) {
                console.log(err);
            }
        });

        res.render("finish_management", {
            Error: "block",
            Finish: "処理完了致しました！"
        });


    });});});

app.get('/vehicle-confirmation', encodeUrl, (req, res) => {

    const urlSegments = req.url.split('&&')
    const thisAction = urlSegments[1].split('=');

    var id = req.query.id;

    if (thisAction[1] == "delete") {

        deleteId(res, "vehicle_information", "delete", id);

    }

    if (thisAction[1] == "update") {

        updateId(res, "vehicle_information", "update", id);

    }

    if (thisAction[1] == "yes") {
        deleteValue(res, "vehicle_information", id);
        selectAll(res, "vehicle_information", "vehicle", finish);
    }
});

app.post('/updatevehicle', encodeUrl, (req, res) => {

    var id = req.query.id;

    var carBrand = req.body.carbrand;
    var carName = req.body.carname;
    var carYear = req.body.caryear;
    var carColor = req.body.carcolor;
    var sellerId = req.body.sellerid;

    con.connect(function (err) {
        if (err) {
            console.log(err);
        };


        let sql = `UPDATE vehicle_information
        SET carbrand = ? ,
            carname = ? ,
            caryear = ?,
            carcolor = ?,
            sellerid = ?
        WHERE carid = ?`;

        let data = [carBrand, carName, carYear, carColor, sellerId, id];
        con.query(sql, data, (error, results, fields) => {
            if (error) {
                return console.error(error.message);
            }
            console.log('Rows affected:', results.affectedRows);
        });

        res.render("finish_management", {
            Error: "block",
            Finish: "処理完了致しました！"
        });


    });

});

app.post('/searchbox', encodeUrl, (req, res) => {

    var id = req.query.id;

    var searchby = req.body.searchby;
    var searchtext = req.body.searchtext;

    con.connect(function (err) {
        if (err) {
            console.log(err);
        };


        con.query(

            `SELECT * FROM vehicle_information WHERE (${searchby} LIKE '%${searchtext}%' )`,
            (error, results) => {
                if (error) {
                    console.log('error connecting:' + error.stack);
                    res.status(400).send({ message: 'Error!' });
                    return false;
                }

                res.render("vehicle-management", {
                    Error: "block",
                    values: results
                });
            });
    });
});

app.post('/sales-register', encodeUrl, (req, res) => {
    var auctionid = req.query.auctionid;

    const urlSegments = req.url.split('&&')
    const array = urlSegments[1].split('=');
    const carid = array[1];

    var auctionprice = req.query.auctionprice;
    var bidusername = req.query.bidusername;

    con.connect(function (err) {
        if (err) {
            console.log(err);
        };

        var sqlInsert = `INSERT INTO sales_information (auctionid, carid, totalprice, username) 
            VALUES 
            ('${auctionid}', '${carid}', '${auctionprice}','${bidusername}')`;

        con.query(sqlInsert, function (err, resultInsert) {
            if (err) {
                console.log(err);
            }
        });
    });
    res.render("index", {
        Error: "block",
        namecookie: req.cookies['username'],
        namesession: "",
        message: ""
    });
});

app.get('/myprofile-bid', encodeUrl, (req, res) => {
    var action = req.query.action;
    var tablename = "";
    var username = req.cookies['username'];

    if (action == "bidlist") {
        tablename = "listing_information"
    }
    if (action == "bidfinishlist") {
        tablename = "sales_information"
    }

    con.connect(function (err) {
        if (err) {
            console.log(err);
        };
        var sql = `SELECT * FROM ${tablename} INNER JOIN vehicle_information on ${tablename}.carid=vehicle_information.carid  WHERE ${tablename}.username = '${username}' `
        con.query(sql, function (err, result) {
            if (err) {
                console.log(err);
            }

            res.render("myprofile-bid.ejs", {
                Error: "block",
                name: username,
                values: result,
                tablename: tablename

            });
        });
    });
});

app.get('/listinglist', encodeUrl, (req, res) => {
    con.connect(function (err) {
        if (err) {
            console.log(err);
        };

        con.query(`SELECT * FROM sales_information INNER JOIN vehicle_information on sales_information.carid=vehicle_information.carid `, function (err, result) {
            if (err) {
                console.log(err);
            }

            res.render("listinglist", {
                values: result
            });
        });
    });
});

app.get('/vehicle-management', function (req, res) {
    selectAll(res, "vehicle_information", "vehicle", "");
});

app.get('/searchresult', function (req, res) {
    res.render('searchresult');
});

app.get('/vehicle-management-insert', function (req, res) {
    con.query(`SELECT * FROM vehicle_information  `, function (err, result) {
        if (err) {
            console.log(err);
        }
    res.render("vehicle-management-insert", {
        values:result
    });});});

app.get('/auction-management', function (req, res) {
    res.render("auction-management", {
        Finish: ""
    });
});

app.get('/productregister', function (req, res) {
    selectAll(res, "vehicle_information", "productregister", "");

});

app.post('/registerproduct', encodeUrl, (req, res) => {

   var flg = 1;
    
    var storage = multer.diskStorage({
        destination: function (req, file, cb) {
               
            // Uploads is the Upload_folder_name
            cb(null, "public/upload")
        },
        filename: function (req, file, cb) {                        
          cb(null, req.query.id + "_"+ flg + ".jpg")
          flg +=1 ;
        
}})


      const maxSize = 10 * 1000 * 1000;
      
    
      var upload = multer({ 
        storage: storage,
        limits: { fileSize: maxSize },
        fileFilter: function (req, file, cb){
        
            // Set the filetypes, it is optional
            var filetypes = /jpeg|jpg|png/;
            var mimetype = filetypes.test(file.mimetype);
      
            var extname = filetypes.test(path.extname(
                        file.originalname).toLowerCase());
            
            if (mimetype && extname) {
                return cb(null, true);
            }
          
            cb("Error: File upload only supports the "
                    + "following filetypes - " + filetypes);
          } 
      
    // mypic is the name of file attribute
    }).array("mypic", 4); 
    
    upload(req,res,function(err) { 
        
    var id = req.query.id;
    var carprice = req.body.price;
      
    

    var array = [];

    for (let i = 1; i <= 3  ; i++) {
        array.push(id+"_"+i+".jpg")        
    }

    console.log(array);

    let imgString = array.toString();

    insertFinalPrice(id, carprice, imgString);


    let sql = `UPDATE vehicle_information
        SET price = ?            
        WHERE carid = ?`;

    let data = [carprice , id];
    con.query(sql, data, (error, results, fields) => {
        if (error) {
            return console.error(error.message);
        }
        console.log('Rows affected:', results.affectedRows);
    });

    res.render("finish_management", {
        Error: "block",
        Finish: "処理完了致しました！"
    });

});  })

app.post('/registerauction', encodeUrl, (req, res) => {
    var carid = req.query.id;
    var startingprice = req.body.startingprice;
    var bidpervalue = req.body.bidpervalue;
    var carcondition = req.body.carcondition;
    var startingtime = req.body.startingtime;
    var finishtime = req.body.finishtime;

    var shaken = req.body.shaken;
    var mileage = req.body.mileage;    
    var location = req.body.location;

    con.connect(function (err) {
        if (err) {
            console.log(err);
        };


        let sql = `UPDATE auction_information
        SET bidnumber = 0,
            startingprice = ? ,
            bidpervalue = ?,
            carcondition = ?,
            shaken = ?,
            mileage = ?,
            location = ?,
            startingtime = ?,
            finishtime = ?
        WHERE carid = ?`;

        let data = [startingprice, bidpervalue, carcondition, shaken, mileage, location, startingtime, finishtime, carid];
        con.query(sql, data, (error, results, fields) => {
            if (error) {
                return console.error(error.message);
            }
            console.log('Rows affected:', results.affectedRows);
        });

        res.render("finish_management", {
            Error: "block",
            Finish: "処理完了致しました！"
        });
    });
});

app.get('/auctionregister', function (req, res) {
    innerJoin(res, "auctionregister");

});

app.get('/bidsituation', function (req, res) {


    innerJoin(res, "bidsituation");

});

app.post('/searchboxpost', encodeUrl, (req, res) => {

    var id = req.query.id;

    var searchby = req.body.searchby;
    var searchtext = req.body.searchtext;
    var tablename = "";

    if (searchby == "auctionid") {
        tablename = "auction_information";
    }
    if (searchby == "carbrand") {
        tablename = "vehicle_information"
    }


    con.connect(function (err) {
        if (err) {
            console.log(err);
        };

        con.query(
            `SELECT auctionid , vehicle_information.carid , vehicle_information.carbrand , vehicle_information.carname , auction_information.bidnumber , auction_information.startingprice , auction_information.finishprice , auction_information.bidpervalue , auction_information.carcondition , auction_information.startingtime , auction_information.finishtime , auction_information.img
            FROM auction_information 
            INNER JOIN vehicle_information 
            ON auction_information.carid=vehicle_information.carid
            WHERE (${tablename}.${searchby} LIKE '%${searchtext}%' )`,
            (error, results) => {
                if (error) {
                    console.log('error connecting:' + error.stack);
                    res.status(400).send({ message: 'Error!' });
                    return false;
                }

                res.render("bidsituation", {
                    Error: "block",
                    values: results
                });
            });



    });

});

app.get('/searchauction', function (req, res) {
    res.render('searchauction');
});

app.get('/bidsituation-detail', function (req, res) {
    res.render('bidsituation-detail');
});

app.get('/sales-management', function (req, res) {
    res.render('sales-management');
});

app.get('/about', function (req, res) {
     res.render("about", {
        Error: "block",
        namecookie: req.cookies['username'],
    });
});

app.get('/product', function (req, res) {
    innerJoin(res, "product");
});

app.get('/product', function (req, res) {
    res.render('product', {
        Error: "block",
        namecookie: req.cookies['username'],
    });
});

app.get('/contact', function (req, res) {
    res.render("contact", {
        Error: "block",
        namecookie: req.cookies['username'],
    });
});

app.get('/profile', function (req, res) {
    res.render("profile", {
        Error: "block",
        namecookie: req.cookies['username'],
    });
});

app.get('/product_details', function (req, res) {
    res.render('product_details');
});

app.post('/sendemail', encodeUrl, (req, res) => {

    var salesid = req.query.id;

    const urlSegments = req.url.split('&&')
    const array = urlSegments[1].split('=');
    const carid = array[1];

    console.log(carid);

    con.connect(function (err) {
        if (err) { console.log(err); };

        var sqlSales = ' SELECT * FROM sales_information WHERE salesid = ' + salesid;

        var sqlVehicle = `SELECT *
        FROM sales_information 
        INNER JOIN vehicle_information 
        ON sales_information.carid=vehicle_information.carid
        WHERE vehicle_information.carid = '${carid}' 
        `;

        var sqlUpdate = `UPDATE sales_information
        SET email = 1                  
        WHERE salesid = ? `;

        let data = [salesid];

        con.query(sqlUpdate, data, (error, results, fields) => {
            if (error) {
                return console.error(error.message);
            }
            con.query(sqlSales, function (err, resultSales) {
                for (var valueSales of resultSales) { }

                var sqlUser = ` SELECT * FROM users WHERE username = '${valueSales.username}'  `;

                con.query(sqlVehicle, function (err, resultVehicle) {
                    for (var valueVehicle of resultVehicle) { }
                    con.query(sqlUser, function (err, resultUser) {

                        for (var valueUser of resultUser) { }

                        var nodemailer = require('nodemailer');

                        var transporter = nodemailer.createTransport({
                            service: 'gmail',
                            auth: {
                                user: 'geraldoliver77@gmail.com',
                                pass: 'uwlqoumdfrknydrx'
                            }
                        });

                        var mailOptions = {
                            from: 'Halauction2022@gmail.com',
                            to: valueUser.email,
                            subject: "落札の明細",
                            text: valueSales.username + '様\r\nこの度ご購入いただきありがとうございました' +
                                '\r\n \r\n  SalesId :' + valueSales.salesid +
                                '\r\n \r\n  Auction Id :' + valueSales.auctionid +
                                '\r\n \r\n  Car Id :' + valueSales.carid +
                                '\r\n \r\n  Car Brand :' + valueVehicle.carbrand +
                                '\r\n \r\n  Car Name :' + valueVehicle.carname +
                                '\r\n \r\n  Date :' + valueSales.date +
                                '\r\n \r\n  TOTAL PRICE :' + valueSales.totalprice + "円" +
                                '\r\n \r\n お支払いが済み祭お手数ですが又こちらにメールを送信してください！よろしくおねがいします！'
                        };

                        transporter.sendMail(mailOptions, function (error, info) {
                            if (error) {
                                console.log(error);
                            } else {
                                console.log('Email sent: ' + info.response);
                            }
                        });

                        res.render("finish_management", {
                            Error: "block",
                            Finish: "メールに送信しました！"
                        });


                        if (err) { console.log(err); }
                    });
                });
            });
        });
    });




});

app.post('/printpdf', encodeUrl, (req, res) => {

    var salesid = req.query.id;

    const urlSegments = req.url.split('&&')
    const array = urlSegments[1].split('=');
    const carid = array[1];

    console.log(carid);

    con.connect(function (err) {
        if (err) { console.log(err); };

        var sqlSales = ' SELECT * FROM sales_information WHERE salesid = ' + salesid;

        var sqlVehicle = `SELECT *
        FROM sales_information 
        INNER JOIN vehicle_information 
        ON sales_information.carid=vehicle_information.carid
        WHERE vehicle_information.carid = '${carid}' 
        `;

        var sqlUpdate = `UPDATE sales_information
        SET email = 1                  
        WHERE salesid = ? `;

        let data = [salesid];

        con.query(sqlUpdate, data, (error, results, fields) => {
            if (error) {
                return console.error(error.message);
            }
            con.query(sqlSales, function (err, resultSales) {
                for (var valueSales of resultSales) { }

                var sqlUser = ` SELECT * FROM users WHERE username = '${valueSales.username}'  `;

                con.query(sqlVehicle, function (err, resultVehicle) {
                    for (var valueVehicle of resultVehicle) { }
                    con.query(sqlUser, function (err, resultUser) {

                        for (var valueUser of resultUser) { }

                        // Create a document
                        const doc = new PDFDocument();

                        // Saving the pdf file in root directory.
                        doc.pipe(fs.createWriteStream(valueSales.username+ salesid +'_sales.pdf'));

                        // Adding functionality
                        doc
                            .fontSize(27)
                            .text('Total Sales ' + valueSales.username  +
                            '\n  Buyer : ' + valueSales.username  +
                            '\n  SalesId : ' + valueSales.salesid +
                            '\n  Auction Id : ' + valueSales.auctionid +
                            '\n  Car Id : ' + valueSales.carid +
                            '\n  Car Brand : ' + valueVehicle.carbrand +
                            '\n  Car Name : ' + valueVehicle.carname +
                            '\n  Date : ' + valueSales.date +
                            '\n  TOTAL PRICE : ' + valueSales.totalprice + "Yen", 100, 100);

                        // Finalize PDF file
                        doc.end();
                                            
                        res.render("finish_management", {
                            Error: "block",
                            Finish: "処理完了しました！"
                        });


                        if (err) { console.log(err); }
                    });
                });
            });
        });
    });




});


app.listen(8000, () => {
    console.log("Server running on port 8000");
});