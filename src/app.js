require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const { NODE_ENV } = require('./config')
const BookmarksService = require('./BookmarksService')

const app = express();

const morganOption = (NODE_ENV === 'production')
    ? 'tiny'
    : 'common';

app.use(morgan(morganOption));
app.use(cors());
app.use(helmet());

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

app.get('/bookmarks/:bookmark_id', (req, res, next) => {
    const knexInstance = req.app.get('db')
    BookmarksService.getBookmarkById(
        req.app.get('db'),
        req.params.bookmark_id
    )
        .then(bookmark => {
            if(!bookmark) {
                return res.status(404).json({ error: { message: `Bookmark doesn't exist` }})
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

