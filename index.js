require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const monk = require("monk");
const PORT = process.env.PORT || 3000;
const yup = require("yup");
const { nanoid } = require("nanoid");

const db = monk(process.env.MONGO_URI);
const urls = db.get("urls");
urls.createIndex("name");

const app = express();

// app.use(helmet());
app.use(morgan("tiny"));
app.use(cors());
app.use(express.json());
app.use(express.static("./public"));

const schema = yup.object().shape({
  slug: yup
    .string()
    .trim()
    .matches(/[\w\-]/i),
  url: yup.string().trim().url().required(),
});

app.get("/", (req, res) => {
  res.json({
    message: `${req.hostname} - Shorting your URLs`,
  });
});
app.get("/:id", async (req, res, next) => {
  // TODO : redirect to URL
  const { id: slug } = req.params;
  try {
    const url = await urls.findOne({ slug });
    url.click += 1;
    const update = await urls.findOneAndUpdate(
      { slug },
      { $set: { click: url.click } }
    );
    if (url) res.redirect(url.url);
    else res.redirect(`?error=${slug} Not found`);
  } catch (error) {
    res.redirect(`?error=Link not found`);
  }
});
app.get("/url/:id", async (req, res, next) => {
  try {
    const url = await urls.findOne({ slug: req.params.id });
    res.json(url);
  } catch (error) {
    next(error);
  }
});
app.post("/url", async (req, res, next) => {
  // TODO : create a short URL
  let { slug, url } = req.body;
  try {
    await schema.validate({ slug, url });
    if (!slug) slug = nanoid(5);
    else {
      const existing = await urls.findOne({ slug });
      if (existing) throw new Error("Slug in use 🍔");
    }
    slug = slug.toLowerCase();
    const newUrl = {
      slug,
      url,
      click: 0,
    };
    const created = await urls.insert(newUrl);
    res.json(created);
  } catch (error) {
    next(error);
  }
});
app.get("/url/:id", (req, res) => {
  // TODO : get a short URL by id
});
app.use((error, req, res, next) => {
  if (error.status) res.status(error.status);
  else res.status(500);
  res.json({
    message: error.message,
    stack: process.env.NODE_ENV === "production" ? "😁" : error.stack,
  });
});
app.listen(PORT, () => console.log(`Listening at http://localhost:${PORT}`));
