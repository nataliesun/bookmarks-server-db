require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const { NODE_ENV } = require('./config')
const BookmarksService = require('./BookmarksService')
const jsonParser = express.json()
const xss = require('xss')

const path = require('path')

const app = express();

const morganOption = (NODE_ENV === 'production')
    ? 'tiny'
    : 'common';

app.use(morgan(morganOption));
app.use(cors());
app.use(helmet());

const serializeBookmark = bookmark => ({
    id: bookmark.id,
    title: xss(bookmark.title),
    url: xss(bookmark.url),
    description: xss(bookmark.description),
    rating: bookmark.rating,
})

app.get('/bookmarks', (req, res, next) => {
    const knexInstance = req.app.get('db')
    BookmarksService.getAllBookmarks(knexInstance)
        .then(bookmarks => {
            res.json(bookmarks.map(bookmark => ({
                id: bookmark.id,
                title: bookmark.title,
                url: bookmark.url,
                description: bookmark.description,
                rating: bookmark.rating,
            })))
        })
        .catch(next)
})

app.post('/bookmarks', jsonParser, (req, res, next) => {
    const { title, url, description, rating } = req.body
    const newBookmark = { title, url, description, rating }

    for (const [key, value] of Object.entries(newBookmark))
        if (value == null)
            return res.status(400).json({
                error: { message: `Missing '${key}' in request body` }
            })

    BookmarksService.insertBookmark(
        req.app.get('db'),
        newBookmark
    )
        .then(bookmark => {
            res
                .status(201)
                .location(path.posix.join(req.originalUrl, `/${bookmark.id}`))
                .json(serializeBookmark(bookmark))
        })
        .catch(next)
})


app.get('/bookmarks/:bookmark_id', (req, res, next) => {
    const knexInstance = req.app.get('db')
    BookmarksService.getBookmarkById(
        req.app.get('db'),
        req.params.bookmark_id
    )
        .then(bookmark => {
            if (!bookmark) {
                return res.status(404).json({ error: { message: `Bookmark doesn't exist` } })
            }
            res.json({
                id: bookmark.id,
                title: bookmark.title,
                url: bookmark.url,
                description: bookmark.description,
                rating: bookmark.rating,
            })
        })
        .catch(next)
})

app.delete('/bookmarks/:bookmark_id', (req, res, next) => {
    const knexInstance = req.app.get('db')
    BookmarksService.deleteBookmark(
        req.app.get('db'),
        req.params.bookmark_id
    )
    .then(numRowAffected => {
        if(!numRowAffected) {
            return res
            .status(404)
            .json({ error: { message:"bookmark doesn't exist" }})
            next()
        }
        res
            .status(204)
            .end()
    })
    .catch(next)
})

app.get('/', (req, res) => {
    res.send('Hello, world!')
})

app.use(function errorHandler(error, req, res, next) {
    let response
    if (NODE_ENV === 'production') {
        response = { error: { message: 'server error' } }
    } else {
        console.error(error)
        response = { message: error.message, error }
    }
    res.status(500).json(response)
})

module.exports = app;

