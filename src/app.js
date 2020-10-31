require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const helmet = require("helmet");
const { NODE_ENV } = require("./config");
const winston = require("winston");
const { bookmarks } = require("./bookmarks-store");
const { v4: uuid } = require("uuid");

const app = express();

const morganOption = NODE_ENV === "production" ? "tiny" : "common";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [new winston.transports.File({ filename: "info.log" })],
});
if (NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

app.use(morgan(morganOption));
app.use(helmet());
app.use(cors());
app.use(express.json());

app.use(function validateBearerToken(req, res, next) {
  const apiToken = process.env.API_TOKEN;
  const authToken = req.get("Authorization");

  if (!authToken || authToken.split(" ")[1] !== apiToken) {
    logger.error(`Unauthorized request to path: ${req.path}`);
    return res.status(401).json({ error: "Unauthorized request" });
  }
  next();
});

app.get("/bookmarks", (req, res) => {
  res.json(bookmarks);
});

app.get("/bookmarks/:id", (req, res) => {
  const { id } = req.params;
  const bookmark = bookmarks.find((b) => b.id === id);

  console.log({ bookmark, id });

  if (!bookmark) {
    logger.error(`Bookmark with id ${id} not found.`);
    return res.status(404).send("Bookmark Not Found");
  }
  res.json(bookmark);
});

app.post("/bookmarks", (req, res) => {
  const { title, url, description, rating } = req.body;

  const newBookmark = {
    id: uuid(),
    title,
    url,
    description,
    rating,
  };

  bookmarks.push(newBookmark);
  res.status(201).json(newBookmark);
});

app.delete("/bookmarks/:id", (req, res) => {
  const { id } = req.params;

  const bookmarkIndex = bookmarks.findIndex((b) => b.id === id);

  if (bookmarkIndex === -1) {
    logger.error(`Bookmark with id ${id} not found.`);
    return res.status(404).send("Not Found");
  }
  bookmarks.splice(bookmarkIndex, 1);
  logger.info(`Bookmark with id ${id} deleted.`);
  res.status(204).end();
});

app.use(function errorHandler(error, req, res, next) {
  let response;
  if (NODE_ENV === "production") {
    response = { error: { message: "server error" } };
  } else {
    console.error(error);
    response = { message: error.message, error };
  }
  res.status(500).json(response);
});

module.exports = app;
