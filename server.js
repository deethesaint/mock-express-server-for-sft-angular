const express = require("express");
const fs = require("fs");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { Jwt } = require("./variables/_jwt");
const { generateToken, verifyToken } = require("./auth/auth.methods");
const app = express();
const port = 3000;
const corsOptions = {
  origin: "http://localhost:4200",
  optionsSuccessStatus: 204,
  methods: "GET, POST, PUT, DELETE",
};

// Use cors middleware
app.use(cors(corsOptions));
// Use express.json() middleware to parse JSON bodies of requests
app.use(express.json());

const users = [
  {
    username: "admin",
    password: bcrypt.hashSync("p@ssw0rd123", 10),
    role: "admin",
  },
  {
    username: "customer",
    password: bcrypt.hashSync("cust0mer123", 10),
    role: "customer",
  },
  {
    username: "staff",
    password: bcrypt.hashSync("st4ff123", 10),
    role: "staff",
  },
];

app.post("/login", async (req, res) => {
  const {username, password} = req.body;

  const user = users.find((u) => u.username === username);

  if (user && bcrypt.compareSync(password, user.password)) {
    const accessTokenSecret = Jwt.ACCESS_TOKEN_SECRET;
    const acceseTokenLife = Jwt.ACCESS_TOKEN_LIFE;

    const dataForAccessUser = {
      dataUsername: username
    };

    const accessToken = await generateToken(dataForAccessUser, accessTokenSecret, acceseTokenLife);

    res.json({status: 200, message: "Login successful", responseData: {accessToken: accessToken, user: {username: user.username, role: user.role}}});
  } else {
    res.status(401).json({status: 401, message: "Invalid username or password", responseData: null });
  }
});

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  const {username} = req.body;
  const user = users.find((u) => u.username === username);
  if (user && user.role === "admin") {
    next();
  } else {
    res.status(403).json({message: "Forbidden"});
  }
};

const isAuthorized = async (req, res, next) => {
  const accessTokenFromHeader = req.headers.authorization;
  if (!accessTokenFromHeader) {
    console.log(req);
      return res.status(401).send('Access token not found!');
  }

  const accessTokenSecret = Jwt.ACCESS_TOKEN_SECRET;

  const verified = await verifyToken(
      accessTokenFromHeader,
      accessTokenSecret,
  );

  if (!verified) {
      return res.status(401).send('Unauthorized');
  }

  const users = [
      {
        username: "admin",
        password: bcrypt.hashSync("p@ssw0rd123", 10),
        role: "admin",
      },
      {
        username: "customer",
        password: bcrypt.hashSync("cust0mer123", 10),
        role: "customer",
      },
      {
        username: "staff",
        password: bcrypt.hashSync("st4ff123", 10),
        role: "staff",
      },
    ];

  const user = users.find((u) => u.username == verified.payload.dataUsername);
  req.user = user;
  return next();
}

// GET route - Allows to get all the items
app.get("/jobs", isAuthorized, (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const perPage = parseInt(req.query.perPage) || 10;

  fs.readFile("db.json", "utf8", (err, data) => {
    if (err) {
      console.log(err);
      res.status(500).send("Internal Server Error");
      return;
    }

    const jsonData = JSON.parse(data);

    const start = page * perPage;
    const end = start + perPage;

    const result = jsonData.items.slice(start, end);

    res.status(200).json({
      items: result,
      total: jsonData.items.length,
      page,
      perPage,
      totalPages: Math.ceil(jsonData.items.length / perPage),
    });
  });
});

// POST route - Allows admin to add new job items
app.post("/jobs", (req, res) => {
  const {type, created_at, company, company_url, location, title, description} = req.body;

  fs.readFile("db.json", "utf8", (err, data) => {
    if (err) {
      console.log(err);
      res.status(500).send("Internal Server Error");
      return;
    }

    const jsonData = JSON.parse(data);

    const maxId = jsonData.items.reduce((max, item) => Math.max(max, item.id), 0);

    const newItem = {
      id: maxId + 1,
      type,
      created_at,
      company,
      company_url,
      location,
      title,
      description,
    };

    jsonData.items.push(newItem);

    fs.writeFile("db.json", JSON.stringify(jsonData), (err) => {
      if (err) {
        console.log(err);
        res.status(500).send("Internal Server Error");
        return;
      }

      res.status(201).json(newItem);
    });
  });
});

// PUT route - Allows admin to update job items
app.put("/jobs/:id", isAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const {type, created_at, company, company_url, location, title, description} = req.body;

  fs.readFile("db.json", "utf8", (err, data) => {
    if (err) {
      console.log(err);
      res.status(500).send("Internal Server Error");
      return;
    }

    const jsonData = JSON.parse(data);

    const index = jsonData.items.findIndex((item) => item.id === id);

    if (index === -1) {
      res.status(404).send("Not Found");
      return;
    }

    jsonData.items[index] = {
      id,
      type,
      created_at,
      company,
      company_url,
      location,
      title,
      description,
    };

    fs.writeFile("db.json", JSON.stringify(jsonData), (err) => {
      if (err) {
        console.log(err);
        res.status(500).send("Internal Server Error");
        return;
      }

      res.status(200).json(jsonData.items[index]);
    });
  });
});

// DELETE route - Allows admin to delete job items
app.delete("/jobs/:id", isAdmin, (req, res) => {
  const id = parseInt(req.params.id);

  fs.readFile("db.json", "utf8", (err, data) => {
    if (err) {
      console.log(err);
      res.status(500).send("Internal Server Error");
      return;
    }

    const jsonData = JSON.parse(data);

    const index = jsonData.items.findIndex((item) => item.id === id);

    if (index === -1) {
      res.status(404).send("Not Found");
      return;
    }

    jsonData.items.splice(index, 1);

    fs.writeFile("db.json", JSON.stringify(jsonData), (err) => {
      if (err) {
        console.log(err);
        res.status(500).send("Internal Server Error");
        return;
      }

      res.status(204).send();
    });
  });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
