const { Jwt } = require("../variables/_jwt");
const { authMethods } = require('./auth.methods.js');

exports.isAuthorized = async (req, res, next) => {
    const accessTokenFromHeader = req.headers.Authorization;
    if (!accessTokenFromHeader) {
        return res.status(401).send('Access token not found!');
    }

    const accessTokenSecret = Jwt.ACCESS_TOKEN_SECRET;

    const verified = await authMethods.verifyToken(
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