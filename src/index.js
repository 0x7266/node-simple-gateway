import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();
app.use(cors());
app.use(helmet());
app.use(morgan("combined"));
app.disable("x-powered-by");

const services = [
  {
    route: "/auth",
    target: "localhost:3333/auth",
  },
  {
    route: "/users",
    target: "localhost:3333/users",
  },
  {
    route: "/chats",
    target: "localhost:3333/chats",
  },
  {
    route: "/payment",
    target: "localhost:3333/payment",
  },
];

const rateLimit = 20;
const interval = 60 * 1000;
const requests = {};

setInterval(() => {
  Object.keys(requests).forEach((ip) => {
    requests[ip] = 0;
  });
}, interval);

function rateLimiter(req, res, next) {
  const ip = req.ip;

  requests[ip] = (requests[ip] || 0) + 1;

  if (requests[ip] > rateLimit) {
    return res.status(429).json({
      code: 429,
      data: null,
      message: "Rate limit exceeded",
      status: "Error",
    });
  }

  req.setTimeout(15000, () => {
    res.status(504).json({
      code: 504,
      data: null,
      message: "Gateway timeout",
      status: "Error",
    });
    req.abort();
  });

  next();
}

app.use(rateLimiter);

services.forEach(({ route, target }) => {
  const proxyOptions = {
    changeOrigin: true,
    pathRewrite: {
      [`^${route}`]: "",
    },
    target,
  };

  app.use(route, rateLimiter, createProxyMiddleware(proxyOptions));
});

app.use((_req, res) => {
  res.status(404).json({
    code: 404,
    status: "Error",
    message: "Route not found.",
    data: null,
  });
});

const PORT = process.env.PORT || 3333;

app.listen(PORT, () => {
  console.log(`Gateway running on port ${PORT}`);
});
